'use client'

/**
 * CreditsSelectorV2 — 多幣種錢包折抵選擇器
 *
 * 呼叫 GET /api/wallet/balance?view=checkout 取得合併額度，
 * 顯示滑桿 + 數字輸入框讓用戶選擇折抵金額（0 ~ max_deduction）
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface CreditsSelectorV2Props {
  customerId: string | null
  orderSubtotal: number
  onCreditsChange: (amount: number) => void
}

interface BalanceCheckout {
  total_available: number
  max_deduction: number
  deduction_min_order: number
  deduction_max_pct: number
  order_qualifies: boolean
  nearest_expiry: { amount: number; date: string } | null
  breakdown: {
    wallet_type: string
    display_name: string
    icon: string
    balance: number
  }[]
}

function formatAmount(n: number): string {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 })
}

function isWithin7Days(dateStr: string): boolean {
  const expiry = new Date(dateStr)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
}

export default function CreditsSelectorV2({
  customerId,
  orderSubtotal,
  onCreditsChange,
}: CreditsSelectorV2Props) {
  const [data, setData] = useState<BalanceCheckout | null>(null)
  const [loading, setLoading] = useState(true)
  const [creditsToUse, setCreditsToUse] = useState(0)
  const [inputValue, setInputValue] = useState('0')
  const lastNotified = useRef(0)

  const fetchBalance = useCallback(async () => {
    if (!customerId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        customer_id: customerId,
        view: 'checkout',
      })
      if (orderSubtotal > 0) {
        params.set('order_subtotal', String(orderSubtotal))
      }

      const res = await fetch(`/api/wallet/balance?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('[CreditsSelectorV2] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [customerId, orderSubtotal])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // max_deduction 變化時，clamp creditsToUse
  useEffect(() => {
    if (!data) return
    const max = data.max_deduction
    if (creditsToUse > max) {
      setCreditsToUse(max)
      setInputValue(String(max))
    }
  }, [data?.max_deduction])

  // 通知 parent（debounce-like：只在值真的變了才通知）
  useEffect(() => {
    if (lastNotified.current !== creditsToUse) {
      lastNotified.current = creditsToUse
      onCreditsChange(creditsToUse)
    }
  }, [creditsToUse, onCreditsChange])

  // Reset when customer or subtotal changes significantly
  useEffect(() => {
    setCreditsToUse(0)
    setInputValue('0')
  }, [customerId])

  // --- 不顯示條件 ---
  if (loading) return null
  if (!customerId) return null
  if (!data) return null

  // 低於門檻但有餘額：顯示提示文字
  if (orderSubtotal < 1000 || !data.order_qualifies) {
    if (data.total_available > 0) {
      return (
        <p className="text-xs text-gray-400 my-3">
          💡 訂單滿 $1,000 即可使用購物金折抵（目前可用 ${formatAmount(data.total_available)}）
        </p>
      )
    }
    return null
  }

  if (data.total_available <= 0) return null

  const max = data.max_deduction
  if (max <= 0) return null

  const handleSliderChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, max))
    setCreditsToUse(clamped)
    setInputValue(String(clamped))
  }

  const handleInputChange = (raw: string) => {
    // 允許用戶自由輸入，blur 時才 clamp
    setInputValue(raw)
  }

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10)
    if (isNaN(parsed) || parsed < 0) {
      setCreditsToUse(0)
      setInputValue('0')
    } else if (parsed > max) {
      setCreditsToUse(max)
      setInputValue(String(max))
    } else {
      setCreditsToUse(parsed)
      setInputValue(String(parsed))
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleInputBlur()
    }
  }

  const showExpiry =
    data.nearest_expiry && isWithin7Days(data.nearest_expiry.date)

  const pctLabel = Math.round(data.deduction_max_pct * 100)

  return (
    <div
      className="rounded-lg p-4 my-3"
      style={{
        border: '1px solid rgba(212, 175, 55, 0.3)',
        background: 'rgba(212, 175, 55, 0.05)',
      }}
    >
      {/* 標題 + 可用額度 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
          🎁 折抵優惠
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          可用額度 ${formatAmount(data.total_available)}
        </span>
      </div>

      {/* 明細 breakdown（迷你版） */}
      <div className="flex gap-3 mb-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {data.breakdown
          .filter((w) => w.balance > 0)
          .map((w) => (
            <span key={w.wallet_type}>
              {w.icon} {w.display_name} ${formatAmount(w.balance)}
            </span>
          ))}
      </div>

      {/* 滑桿 */}
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={creditsToUse}
        onChange={(e) => handleSliderChange(Number(e.target.value))}
        className="w-full accent-[#D4AF37] mb-2"
      />

      {/* 數字輸入 + 上限說明 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>$</span>
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-20 px-2 py-1 rounded text-sm text-right"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#D4AF37',
            }}
          />
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          最多可折 ${formatAmount(max)}（訂單 {pctLabel}%）
        </span>
      </div>

      {/* 到期提醒 */}
      {showExpiry && data.nearest_expiry && (
        <p className="text-xs mt-2" style={{ color: '#D4AF37' }}>
          💡 ${formatAmount(data.nearest_expiry.amount)} 將於{' '}
          {formatShortDate(data.nearest_expiry.date)} 到期
        </p>
      )}
    </div>
  )
}
