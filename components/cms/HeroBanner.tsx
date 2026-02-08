'use client'

import { useState, useEffect } from 'react'

interface Banner {
  id: string
  title: string
  subtitle: string
  image_url: string
  image_mobile_url?: string
  link_url?: string
  link_text?: string
}

interface HeroBannerProps {
  banners: Banner[]
}

export default function HeroBanner({ banners }: HeroBannerProps) {
  const [current, setCurrent] = useState(0)

  // 自動輪播（多張時）
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  // Fallback：沒有 CMS 資料時顯示預設
  if (!banners || banners.length === 0) {
    return (
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.08) 0%, transparent 60%)' }} />
        <div className="relative text-center px-5 max-w-2xl">
          <div className="text-[11px] tracking-[6px] mb-6" style={{ color: 'rgba(212,175,55,0.6)' }}>
            ─── HEALTH & BEAUTY ───
          </div>
          <h1 className="text-4xl md:text-5xl font-light leading-tight mb-2 tracking-wider gold-text">
            每一份細膩
          </h1>
          <h2 className="text-2xl md:text-3xl font-light leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
            都源自對家人健康的愛
          </h2>
          <p className="text-sm leading-loose mb-10 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            日復一日的用心，只為讓家人的健康更安心<br/>嚴選全球頂級原料，打造專屬於你的健康方案
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/products" className="btn-gold">探索商品</a>
            <a href="https://lin.ee/Ro3Fd4p" className="btn-gold-outline">加入 LINE</a>
          </div>
        </div>
      </section>
    )
  }

  const banner = banners[current]

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* 背景圖 */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${banner.image_url})`,
            opacity: 0.6,
          }}
        />
        {/* 漸層遮罩 */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.8) 100%)',
        }} />
      </div>

      {/* 內容 */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 w-full">
        <div className="max-w-xl">
          <div className="text-[11px] tracking-[6px] mb-6" style={{ color: 'rgba(212,175,55,0.6)' }}>
            ─── HEALTH & BEAUTY ───
          </div>
          <h1 className="text-3xl md:text-5xl font-light leading-tight mb-4 tracking-wider gold-text">
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="text-sm md:text-base leading-loose mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {banner.subtitle}
            </p>
          )}
          <div className="flex gap-4 flex-wrap">
            {banner.link_url && (
              <a href={banner.link_url} className="btn-gold">
                {banner.link_text || '探索商品'}
              </a>
            )}
            <a href="https://lin.ee/Ro3Fd4p" className="btn-gold-outline">加入 LINE</a>
          </div>
        </div>
      </div>

      {/* 輪播指示器 */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === current ? '#D4AF37' : 'rgba(255,255,255,0.3)',
                width: i === current ? '24px' : '8px',
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
