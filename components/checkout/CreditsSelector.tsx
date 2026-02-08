// components/checkout/CreditsSelector.tsx
// 購物金折抵選擇器 — 結帳頁使用
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatPrice } from '@/lib/config'

interface CreditsSelectorProps {
  customerId: string | null   // Medusa customer ID
  subtotal: number            // 商品含稅小計（不含運費）
  onCreditsChange: (amount: number) => void  // 回傳折抵金額
}

interface WalletInfo {
  balance: number
  max_credits_percent: number
  tier_level: string
  tier_name: string
}

export default function CreditsSelector({ 
  customerId, 
  subtotal, 
  onCreditsChange 
}: CreditsSelectorProps) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [creditsToUse, setCreditsToUse] = useState(0)
  const [useCredits, setUseCredits] = useState(false)
  const [loading, setLoading] = useState(false)

  // 計算最大可用金額
  const maxUsable = walletInfo 
    ? Math.min(
        walletInfo.balance,
        Math.floor(subtotal * walletInfo.max_credits_percent / 100)
      )
    : 0

  // 查詢餘額
  const fetchBalance = useCallback(async () => {
    if (!customerId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/wallet/balance?customer_id=${customerId}`)
      if (res.ok) {
        const data = await res.json()
        setWalletInfo(data)
      }
    } catch (err) {
      console.error('查詢購物金失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // subtotal 變化時重新計算上限
  useEffect(() => {
    if (useCredits && creditsToUse > maxUsable) {
      setCreditsToUse(maxUsable)
      onCreditsChange(maxUsable)
    }
  }, [subtotal, maxUsable])

  // 切換使用購物金
  const handleToggle = (checked: boolean) => {
    setUseCredits(checked)
    if (checked) {
      // 預設使用最大可用金額
      setCreditsToUse(maxUsable)
      onCreditsChange(maxUsable)
    } else {
      setCreditsToUse(0)
      onCreditsChange(0)
    }
  }

  // 手動調整金額
  const handleAmountChange = (value: number) => {
    const clamped = Math.max(0, Math.min(value, maxUsable))
    setCreditsToUse(clamped)
    onCreditsChange(clamped)
  }

  // 沒有 customer 或餘額為 0，不顯示
  if (!customerId || loading) return null
  if (!walletInfo || walletInfo.balance <= 0) return null

  return (
    <div className="border rounded-lg p-4" style={{ 
      borderColor: 'rgba(212, 175, 55, 0.3)',
      background: 'rgba(212, 175, 55, 0.05)' 
    }}>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
            💰 購物金折抵
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ 
            background: 'rgba(212, 175, 55, 0.15)',
            color: '#D4AF37' 
          }}>
            {walletInfo.tier_name}
          </span>
        </div>
        {/* 開關 */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useCredits}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            useCredits ? 'bg-[#D4AF37]' : 'bg-gray-600'
          }`}>
            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${
              useCredits ? 'translate-x-5.5 ml-[22px]' : 'ml-0.5'
            }`} />
          </div>
        </label>
      </div>

      {/* 餘額資訊 */}
      <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
        可用餘額 {formatPrice(walletInfo.balance)}
        {walletInfo.max_credits_percent < 100 && (
          <span>（本筆最多折抵 {walletInfo.max_credits_percent}%，上限 {formatPrice(maxUsable)}）</span>
        )}
      </div>

      {/* 折抵金額控制 */}
      {useCredits && maxUsable > 0 && (
        <div className="space-y-2">
          {/* 滑桿 */}
          <input
            type="range"
            min={0}
            max={maxUsable}
            step={1}
            value={creditsToUse}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            className="w-full accent-[#D4AF37]"
          />
          
          {/* 金額顯示 + 快速按鈕 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAmountChange(0)}
                className="text-xs px-2 py-1 rounded border border-gray-600 hover:border-[#D4AF37] transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                不使用
              </button>
              <button
                type="button"
                onClick={() => handleAmountChange(maxUsable)}
                className="text-xs px-2 py-1 rounded border border-gray-600 hover:border-[#D4AF37] transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                最大折抵
              </button>
            </div>
            <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>
              -{formatPrice(creditsToUse)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
