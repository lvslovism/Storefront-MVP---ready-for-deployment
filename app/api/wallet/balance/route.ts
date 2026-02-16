export const dynamic = 'force-dynamic'

/**
 * GET /api/wallet/balance
 *
 * 查詢客戶多幣種錢包餘額（shopping_credit / birthday / points）
 *
 * Query params:
 *   customer_id  — 必填
 *   order_subtotal — 選填，結帳頁用來計算 max_deduction
 *   view — checkout | detail（預設 checkout）
 *
 * view=checkout → 精簡版：total_available + max_deduction + nearest_expiry + breakdown
 * view=detail   → 額外回傳各錢包 expiring_soon + 最近 10 筆 transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MERCHANT_CODE = process.env.MERCHANT_CODE || 'minjie'

const WALLET_DISPLAY: Record<string, { display_name: string; icon: string; sort: number }> = {
  shopping_credit: { display_name: '購物金', icon: '💰', sort: 1 },
  birthday:        { display_name: '生日禮金', icon: '🎂', sort: 2 },
  points:          { display_name: '紅利點數', icon: '⭐', sort: 3 },
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const orderSubtotalRaw = searchParams.get('order_subtotal')
    const view = searchParams.get('view') || 'checkout'

    if (!customerId) {
      return NextResponse.json(
        { error: 'customer_id is required', code: 'MISSING_CUSTOMER_ID' },
        { status: 400 }
      )
    }

    // 1. 查三個錢包
    const { data: wallets, error: walletsError } = await supabase
      .from('member_wallet')
      .select('id, wallet_type, balance')
      .eq('customer_id', customerId)
      .eq('merchant_code', MERCHANT_CODE)

    if (walletsError) {
      console.error('[wallet/balance] wallets query error:', walletsError)
      return NextResponse.json(
        { error: 'Failed to query wallets', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    // 沒有錢包 → 回傳全零
    if (!wallets || wallets.length === 0) {
      const emptyBreakdown = Object.entries(WALLET_DISPLAY)
        .sort(([, a], [, b]) => a.sort - b.sort)
        .map(([type, meta]) => ({
          wallet_type: type,
          display_name: meta.display_name,
          icon: meta.icon,
          balance: 0,
        }))

      return NextResponse.json({
        total_available: 0,
        max_deduction: 0,
        deduction_min_order: 1000,
        deduction_max_pct: 0.10,
        order_qualifies: false,
        nearest_expiry: null,
        breakdown: emptyBreakdown,
      })
    }

    // 2. total_available
    const totalAvailable = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)

    // 3. 讀取 wallet_rules
    const rules = await getWalletRules()

    // 4. 計算 max_deduction（如果提供 order_subtotal）
    const orderSubtotal = orderSubtotalRaw ? Number(orderSubtotalRaw) : null
    const orderQualifies = orderSubtotal !== null ? orderSubtotal >= rules.deduction_min_order : false
    let maxDeduction = 0
    if (orderSubtotal !== null && orderQualifies) {
      maxDeduction = Math.min(totalAvailable, Math.floor(orderSubtotal * rules.deduction_max_pct))
    }

    // 5. nearest_expiry：查最近一筆未過期的 earn transaction
    const walletIds = wallets.map((w) => w.id)

    const { data: nearestExpiryRow } = await supabase
      .from('wallet_transaction')
      .select('amount, expires_at')
      .in('wallet_id', walletIds)
      .eq('type', 'earn')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const nearestExpiry = nearestExpiryRow
      ? { amount: nearestExpiryRow.amount, date: nearestExpiryRow.expires_at }
      : null

    // 6. breakdown（按 sort 排序）
    const breakdown = wallets
      .map((w) => {
        const meta = WALLET_DISPLAY[w.wallet_type] || {
          display_name: w.wallet_type,
          icon: '💎',
          sort: 99,
        }
        return {
          wallet_type: w.wallet_type,
          display_name: meta.display_name,
          icon: meta.icon,
          balance: w.balance || 0,
          _sort: meta.sort,
        }
      })
      .sort((a, b) => a._sort - b._sort)
      .map(({ _sort, ...rest }) => rest)

    // view=checkout → 精簡版
    if (view === 'checkout') {
      return NextResponse.json({
        total_available: totalAvailable,
        max_deduction: maxDeduction,
        deduction_min_order: rules.deduction_min_order,
        deduction_max_pct: rules.deduction_max_pct,
        order_qualifies: orderQualifies,
        nearest_expiry: nearestExpiry,
        breakdown,
      })
    }

    // view=detail → 額外查各錢包 expiring_soon + 最近 10 筆 transactions

    // expiring_soon per wallet（30 天內到期）
    const walletsDetail = await Promise.all(
      wallets
        .map((w) => {
          const meta = WALLET_DISPLAY[w.wallet_type] || {
            display_name: w.wallet_type,
            icon: '💎',
            sort: 99,
          }
          return { ...w, meta }
        })
        .sort((a, b) => a.meta.sort - b.meta.sort)
        .map(async (w) => {
          const { data: expiring } = await supabase
            .from('wallet_transaction')
            .select('amount, expires_at')
            .eq('wallet_id', w.id)
            .eq('type', 'earn')
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: true })
            .limit(10)

          return {
            wallet_type: w.wallet_type,
            display_name: w.meta.display_name,
            icon: w.meta.icon,
            balance: w.balance || 0,
            expiring_soon: (expiring || []).map((e) => ({
              amount: e.amount,
              expires_at: e.expires_at,
            })),
          }
        })
    )

    // 最近 10 筆 transactions（跨錢包合併）
    const { data: recentTx } = await supabase
      .from('wallet_transaction')
      .select('created_at, type, amount, wallet_type, description')
      .in('wallet_id', walletIds)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentTransactions = (recentTx || []).map((tx) => ({
      date: tx.created_at,
      type: tx.type,
      amount: tx.amount,
      wallet_type: tx.wallet_type,
      description: tx.description,
    }))

    return NextResponse.json({
      total_available: totalAvailable,
      wallets: walletsDetail,
      recent_transactions: recentTransactions,
    })
  } catch (error: unknown) {
    console.error('[wallet/balance] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
