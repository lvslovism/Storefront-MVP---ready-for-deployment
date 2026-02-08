// 放到 app/api/wallet/balance/route.ts
// 查詢用戶購物金餘額 + 可折抵上限
// GET /api/wallet/balance?customer_id=xxx

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// 商家代碼（多商家時從 request context 取）
const MERCHANT_CODE = process.env.MERCHANT_CODE || 'default'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }

    // 1. 查詢錢包餘額
    const { data: wallet, error: walletError } = await supabase
      .from('member_wallet')
      .select('id, balance, total_earned, total_spent')
      .eq('customer_id', customerId)
      .eq('merchant_code', MERCHANT_CODE)
      .single()

    if (walletError || !wallet) {
      // 沒有錢包 = 餘額 0
      return NextResponse.json({
        balance: 0,
        max_credits_percent: 10,
        tier_level: 'silver',
        tier_name: '白銀會員'
      })
    }

    // 2. 查詢會員等級
    const { data: tier } = await supabase
      .from('member_tier')
      .select('tier_level')
      .eq('customer_id', customerId)
      .eq('merchant_code', MERCHANT_CODE)
      .single()

    const tierLevel = tier?.tier_level || 'silver'

    // 3. 查詢折抵上限：先查 tier_config，fallback 到 merchant_settings
    let maxCreditsPercent = 10 // 預設 10%

    // 先查等級專屬上限
    const { data: tierConfig } = await supabase
      .from('tier_config')
      .select('max_credits_percent, tier_name')
      .eq('tier_level', tierLevel)
      .eq('merchant_code', MERCHANT_CODE)
      .single()

    if (tierConfig?.max_credits_percent != null) {
      // 等級有設定專屬上限
      maxCreditsPercent = tierConfig.max_credits_percent
    } else {
      // Fallback 到商家預設值
      const { data: merchantSettings } = await supabase
        .from('merchant_settings')
        .select('wallet_settings')
        .eq('merchant_code', MERCHANT_CODE)
        .single()

      if (merchantSettings?.wallet_settings?.max_credits_percent != null) {
        maxCreditsPercent = merchantSettings.wallet_settings.max_credits_percent
      }
    }

    return NextResponse.json({
      balance: wallet.balance,
      max_credits_percent: maxCreditsPercent,
      tier_level: tierLevel,
      tier_name: tierConfig?.tier_name || '白銀會員'
    })

  } catch (error: any) {
    console.error('[wallet/balance] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
