export const dynamic = 'force-dynamic';

// 放到 app/api/wallet/deduct/route.ts
// 付款成功後扣除購物金
// POST /api/wallet/deduct
// Body: { customer_id, amount, order_id, order_display_id }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MERCHANT_CODE = process.env.MERCHANT_CODE || 'default'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, amount, order_id, order_display_id } = body

    // 驗證
    if (!customer_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // 1. 查錢包
    const { data: wallet, error: walletError } = await supabase
      .from('member_wallet')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('merchant_code', MERCHANT_CODE)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // 2. 檢查餘額是否足夠
    if (wallet.balance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient balance',
        balance: wallet.balance,
        requested: amount
      }, { status: 400 })
    }

    // 3. 檢查是否已經扣過（防重複，用 order_id 檢查）
    if (order_id) {
      const { data: existing } = await supabase
        .from('wallet_transaction')
        .select('id')
        .eq('wallet_id', wallet.id)
        .eq('reference_id', order_id)
        .eq('source_type', 'order_payment')
        .single()

      if (existing) {
        return NextResponse.json({ 
          error: 'Already deducted for this order',
          transaction_id: existing.id 
        }, { status: 409 })
      }
    }

    // 4. 寫入扣款紀錄
    const newBalance = wallet.balance - amount
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transaction')
      .insert({
        wallet_id: wallet.id,
        type: 'spend',
        amount: -amount, // 負數表示扣款
        balance_after: newBalance,
        reference_type: 'order',
        reference_id: order_id || null,
        description: order_display_id 
          ? `訂單 #${order_display_id} 購物金折抵`
          : '購物金折抵',
        source_type: 'order_payment'
      })
      .select()
      .single()

    if (txError) {
      console.error('[wallet/deduct] Transaction error:', txError)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // 5. 更新錢包餘額
    const { error: updateError } = await supabase
      .from('member_wallet')
      .update({
        balance: newBalance,
        total_spent: (wallet.total_spent || 0) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    if (updateError) {
      console.error('[wallet/deduct] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deducted: amount,
      new_balance: newBalance,
      transaction_id: transaction.id
    })

  } catch (error: any) {
    console.error('[wallet/deduct] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
