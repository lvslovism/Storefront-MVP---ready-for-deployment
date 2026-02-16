export const dynamic = 'force-dynamic'

/**
 * POST /api/wallet/deduct
 *
 * 結帳扣款 — 只接收一個總額，後端按 FIFO（過期日升序）跨錢包自動分配
 *
 * Body: { customer_id, order_id, amount, order_subtotal }
 *
 * 簡化版 FIFO：按「錢包中最快過期的餘額」排序三個錢包，依序扣完
 * 樂觀鎖：UPDATE member_wallet SET balance = balance - X WHERE balance >= X
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MERCHANT_CODE = process.env.MERCHANT_CODE || 'minjie'

interface WalletRules {
  deduction_min_order: number
  deduction_max_pct: number
}

async function getWalletRules(): Promise<WalletRules> {
  const { data } = await supabase
    .from('merchant_settings')
    .select('settings')
    .eq('merchant_code', MERCHANT_CODE)
    .single()

  const rules = data?.settings?.wallet_rules
  return {
    deduction_min_order: rules?.deduction_min_order ?? 1000,
    deduction_max_pct: rules?.deduction_max_pct ?? 0.10,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, order_id, amount, order_subtotal } = body

    // --- 基本驗證 ---
    if (!customer_id || !order_id) {
      return NextResponse.json(
        { error: 'customer_id and order_id are required', code: 'MISSING_PARAMS' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    if (typeof order_subtotal !== 'number' || order_subtotal <= 0) {
      return NextResponse.json(
        { error: 'order_subtotal must be a positive number', code: 'INVALID_ORDER_SUBTOTAL' },
        { status: 400 }
      )
    }

    // --- 讀取 wallet_rules ---
    const rules = await getWalletRules()

    // 驗證 1：order_subtotal >= deduction_min_order
    if (order_subtotal < rules.deduction_min_order) {
      return NextResponse.json(
        {
          error: `Order subtotal must be at least ${rules.deduction_min_order}`,
          code: 'ORDER_BELOW_MINIMUM',
        },
        { status: 400 }
      )
    }

    // 驗證 2：amount <= FLOOR(order_subtotal × deduction_max_pct)
    const maxAllowed = Math.floor(order_subtotal * rules.deduction_max_pct)
    if (amount > maxAllowed) {
      return NextResponse.json(
        {
          error: `Deduction amount exceeds maximum (${maxAllowed})`,
          code: 'EXCEEDS_MAX_DEDUCTION',
          max_deduction: maxAllowed,
        },
        { status: 400 }
      )
    }

    // --- 冪等檢查 ---
    const { data: existingSpend } = await supabase
      .from('wallet_transaction')
      .select('id')
      .eq('reference_type', 'order')
      .eq('reference_id', order_id)
      .eq('type', 'spend')
      .limit(1)
      .maybeSingle()

    if (existingSpend) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Deduction already processed for this order',
      })
    }

    // --- 查三個錢包 ---
    const { data: wallets, error: walletsError } = await supabase
      .from('member_wallet')
      .select('id, wallet_type, balance')
      .eq('customer_id', customer_id)
      .eq('merchant_code', MERCHANT_CODE)

    if (walletsError || !wallets || wallets.length === 0) {
      return NextResponse.json(
        { error: 'No wallets found', code: 'WALLETS_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 驗證餘額總計 >= amount
    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)
    if (totalBalance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient total balance',
          code: 'INSUFFICIENT_BALANCE',
          total_balance: totalBalance,
          requested: amount,
        },
        { status: 400 }
      )
    }

    // --- FIFO 簡化版：按每個錢包最近的 expires_at 排序 ---
    const walletIds = wallets.map((w) => w.id)

    // 查每個錢包最近的 expires_at
    const { data: expiryData } = await supabase
      .from('wallet_transaction')
      .select('wallet_id, expires_at')
      .in('wallet_id', walletIds)
      .eq('type', 'earn')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    // 建立 walletId → earliest expires_at mapping
    const walletEarliestExpiry: Record<string, string | null> = {}
    for (const w of wallets) {
      walletEarliestExpiry[w.id] = null
    }
    for (const row of expiryData || []) {
      if (!walletEarliestExpiry[row.wallet_id]) {
        walletEarliestExpiry[row.wallet_id] = row.expires_at
      }
    }

    // 排序：expires_at ASC NULLS LAST
    const sortedWallets = [...wallets]
      .filter((w) => (w.balance || 0) > 0)
      .sort((a, b) => {
        const ea = walletEarliestExpiry[a.id]
        const eb = walletEarliestExpiry[b.id]
        if (ea === null && eb === null) return 0
        if (ea === null) return 1
        if (eb === null) return -1
        return ea.localeCompare(eb)
      })

    // --- 逐一扣到 remaining = 0 ---
    let remaining = amount
    const allocation: { wallet_id: string; wallet_type: string; amount: number }[] = []

    for (const w of sortedWallets) {
      if (remaining <= 0) break
      const deductFromThis = Math.min(w.balance || 0, remaining)
      if (deductFromThis <= 0) continue

      allocation.push({
        wallet_id: w.id,
        wallet_type: w.wallet_type,
        amount: deductFromThis,
      })
      remaining -= deductFromThis
    }

    if (remaining > 0) {
      return NextResponse.json(
        { error: 'Insufficient balance after allocation', code: 'INSUFFICIENT_BALANCE' },
        { status: 400 }
      )
    }

    // --- 執行扣款（逐錢包 INSERT transaction + UPDATE balance 樂觀鎖） ---
    for (const alloc of allocation) {
      // INSERT wallet_transaction
      const { error: txError } = await supabase.from('wallet_transaction').insert({
        wallet_id: alloc.wallet_id,
        wallet_type: alloc.wallet_type,
        type: 'spend',
        amount: -alloc.amount,
        reference_type: 'order',
        reference_id: order_id,
        description: '訂單折抵',
        operator_type: 'customer',
      })

      if (txError) {
        console.error('[wallet/deduct] transaction insert error:', txError)
        return NextResponse.json(
          { error: 'Failed to record transaction', code: 'TX_INSERT_FAILED' },
          { status: 500 }
        )
      }

      // UPDATE member_wallet 樂觀鎖
      // Supabase JS 不直接支援 balance = balance - X WHERE balance >= X
      // 使用 rpc function；若不存在則 fallback 到先讀再寫
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'wallet_deduct_balance',
        {
          p_wallet_id: alloc.wallet_id,
          p_amount: alloc.amount,
        }
      )

      // 如果沒有 rpc（function 不存在），fallback 到普通 update
      if (rpcError) {
        // fallback: 先讀再寫（非原子，但 Phase 1 可接受）
        const { data: currentWallet } = await supabase
          .from('member_wallet')
          .select('balance')
          .eq('id', alloc.wallet_id)
          .single()

        if (!currentWallet || currentWallet.balance < alloc.amount) {
          // 樂觀鎖失敗 → 餘額不足
          // 嘗試清理已寫入的 transactions
          await supabase
            .from('wallet_transaction')
            .delete()
            .eq('reference_type', 'order')
            .eq('reference_id', order_id)
            .eq('type', 'spend')

          return NextResponse.json(
            {
              error: 'Balance changed during deduction, please retry',
              code: 'OPTIMISTIC_LOCK_FAILED',
            },
            { status: 409 }
          )
        }

        const { error: fallbackError } = await supabase
          .from('member_wallet')
          .update({
            balance: currentWallet.balance - alloc.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', alloc.wallet_id)

        if (fallbackError) {
          console.error('[wallet/deduct] fallback update error:', fallbackError)
          return NextResponse.json(
            { error: 'Failed to update wallet balance', code: 'UPDATE_FAILED' },
            { status: 500 }
          )
        }
      } else if (rpcResult === false) {
        // rpc 回傳 false → 餘額不足（樂觀鎖失敗）
        // 清理已寫入的 transactions
        await supabase
          .from('wallet_transaction')
          .delete()
          .eq('reference_type', 'order')
          .eq('reference_id', order_id)
          .eq('type', 'spend')

        return NextResponse.json(
          {
            error: 'Insufficient balance (concurrent deduction detected), please retry',
            code: 'OPTIMISTIC_LOCK_FAILED',
          },
          { status: 409 }
        )
      }
    }

    // --- 回傳分配明細 ---
    const WALLET_NAMES: Record<string, string> = {
      shopping_credit: '購物金',
      birthday: '生日禮金',
      points: '紅利點數',
    }

    return NextResponse.json({
      success: true,
      total_deducted: amount,
      allocation: allocation.map((a) => ({
        wallet_type: a.wallet_type,
        display_name: WALLET_NAMES[a.wallet_type] || a.wallet_type,
        amount: a.amount,
      })),
    })
  } catch (error: unknown) {
    console.error('[wallet/deduct] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
