export const dynamic = 'force-dynamic'

/**
 * POST /api/wallet/refund
 *
 * 退款回錢包 — 按原始扣款比例分配 refund_amount 到各錢包
 *
 * Body: { order_id, refund_amount, reason }
 *
 * 邏輯：
 * 1. 查原始 spend transactions for this order
 * 2. 冪等：已有 refund → skip
 * 3. 按原始扣款比例退回各錢包
 * 4. INSERT wallet_transaction type='refund' + UPDATE member_wallet.balance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, refund_amount, reason } = body

    // --- 驗證 ---
    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      )
    }

    if (typeof refund_amount !== 'number' || refund_amount <= 0) {
      return NextResponse.json(
        { error: 'refund_amount must be a positive number', code: 'INVALID_REFUND_AMOUNT' },
        { status: 400 }
      )
    }

    // 1. 查原始 spend transactions
    const { data: spendTxs, error: spendError } = await supabase
      .from('wallet_transaction')
      .select('id, wallet_id, wallet_type, amount')
      .eq('reference_type', 'order')
      .eq('reference_id', order_id)
      .eq('type', 'spend')

    if (spendError) {
      console.error('[wallet/refund] spend query error:', spendError)
      return NextResponse.json(
        { error: 'Failed to query original deductions', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    if (!spendTxs || spendTxs.length === 0) {
      return NextResponse.json(
        { error: 'No deduction found for this order', code: 'NO_DEDUCTION_FOUND' },
        { status: 404 }
      )
    }

    // 2. 冪等檢查：已有 refund for this order
    const { data: existingRefund } = await supabase
      .from('wallet_transaction')
      .select('id')
      .eq('reference_type', 'order_refund')
      .eq('reference_id', order_id)
      .eq('type', 'refund')
      .limit(1)
      .maybeSingle()

    if (existingRefund) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Refund already processed for this order',
      })
    }

    // 3. 計算原始扣款總額 + 比例
    // spend amount 是負數，取絕對值
    const spendAllocations = spendTxs.map((tx) => ({
      wallet_id: tx.wallet_id,
      wallet_type: tx.wallet_type,
      spent: Math.abs(tx.amount),
    }))

    const totalSpent = spendAllocations.reduce((sum, a) => sum + a.spent, 0)

    // 驗證 refund_amount 不超過原始扣款總額
    if (refund_amount > totalSpent) {
      return NextResponse.json(
        {
          error: `Refund amount (${refund_amount}) exceeds original deduction (${totalSpent})`,
          code: 'REFUND_EXCEEDS_DEDUCTION',
          original_deduction: totalSpent,
        },
        { status: 400 }
      )
    }

    // 4. 按原始比例分配退款金額
    const refundAllocations: { wallet_id: string; wallet_type: string; refund: number }[] = []
    let remaining = refund_amount

    for (let i = 0; i < spendAllocations.length; i++) {
      const alloc = spendAllocations[i]
      const isLast = i === spendAllocations.length - 1

      let refundForWallet: number
      if (isLast) {
        // 最後一個拿剩餘（避免四捨五入誤差）
        refundForWallet = remaining
      } else {
        refundForWallet = Math.floor((alloc.spent / totalSpent) * refund_amount)
      }

      if (refundForWallet > 0) {
        refundAllocations.push({
          wallet_id: alloc.wallet_id,
          wallet_type: alloc.wallet_type,
          refund: refundForWallet,
        })
        remaining -= refundForWallet
      }
    }

    // 5. 執行退款（逐錢包）
    for (const alloc of refundAllocations) {
      // INSERT wallet_transaction type='refund'
      const { error: txError } = await supabase.from('wallet_transaction').insert({
        wallet_id: alloc.wallet_id,
        wallet_type: alloc.wallet_type,
        type: 'refund',
        amount: alloc.refund, // 正數
        reference_type: 'order_refund',
        reference_id: order_id,
        description: reason || '退款退回',
        operator_type: 'system',
      })

      if (txError) {
        console.error('[wallet/refund] transaction insert error:', txError)
        return NextResponse.json(
          { error: 'Failed to record refund transaction', code: 'TX_INSERT_FAILED' },
          { status: 500 }
        )
      }

      // UPDATE member_wallet: balance += refund
      // 嘗試 rpc，fallback 到普通 update
      const { error: rpcError } = await supabase.rpc('wallet_add_balance', {
        p_wallet_id: alloc.wallet_id,
        p_amount: alloc.refund,
      })

      if (rpcError) {
        // fallback: 先讀再寫
        const { data: currentWallet } = await supabase
          .from('member_wallet')
          .select('balance')
          .eq('id', alloc.wallet_id)
          .single()

        if (!currentWallet) {
          console.error('[wallet/refund] wallet not found for id:', alloc.wallet_id)
          return NextResponse.json(
            { error: 'Wallet not found during refund', code: 'WALLET_NOT_FOUND' },
            { status: 500 }
          )
        }

        const { error: updateError } = await supabase
          .from('member_wallet')
          .update({
            balance: currentWallet.balance + alloc.refund,
            updated_at: new Date().toISOString(),
          })
          .eq('id', alloc.wallet_id)

        if (updateError) {
          console.error('[wallet/refund] balance update error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update wallet balance', code: 'UPDATE_FAILED' },
            { status: 500 }
          )
        }
      }
    }

    // 6. 回傳退回明細
    const WALLET_NAMES: Record<string, string> = {
      shopping_credit: '購物金',
      birthday: '生日禮金',
      points: '紅利點數',
    }

    return NextResponse.json({
      success: true,
      total_refunded: refund_amount,
      allocation: refundAllocations.map((a) => ({
        wallet_type: a.wallet_type,
        display_name: WALLET_NAMES[a.wallet_type] || a.wallet_type,
        amount: a.refund,
      })),
    })
  } catch (error: unknown) {
    console.error('[wallet/refund] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
