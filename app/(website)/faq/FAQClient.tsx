// ═══════════════════════════════════════════════════════════════
// app/(website)/faq/FAQClient.tsx
// FAQ 互動元件（Client Component — Accordion + Tab 篩選）
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  name: string;
  items: FAQItem[];
}

interface FAQData {
  heading?: string;
  subtitle?: string;
  categories: FAQCategory[];
}

export default function FAQClient({ data }: { data: FAQData | null }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!data?.categories?.length) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-20 text-center">
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>FAQ 內容載入中...</p>
      </div>
    );
  }

  const categories = data.categories;
  const currentItems = categories[activeCategory]?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      {/* Breadcrumb */}
      <nav className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <a href="/" className="hover:text-gold transition-colors">首頁</a>
        <span className="mx-2">›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>常見問題</span>
      </nav>

      {/* Header */}
      {data.subtitle && (
        <div className="text-[11px] tracking-[4px] mb-3 text-center"
          style={{ color: 'rgba(212,175,55,0.5)' }}>
          {data.subtitle}
        </div>
      )}
      <h1 className="text-3xl md:text-4xl font-light tracking-wider gold-text text-center mb-12">
        {data.heading || '常見問題'}
      </h1>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {categories.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => {
              setActiveCategory(i);
              setOpenIndex(null);
            }}
            className="px-5 py-2 rounded-full text-sm transition-all"
            style={{
              background: activeCategory === i
                ? 'linear-gradient(135deg, #D4AF37, #B8962E)'
                : 'rgba(255,255,255,0.05)',
              color: activeCategory === i ? '#000' : 'rgba(255,255,255,0.6)',
              border: activeCategory === i
                ? 'none'
                : '1px solid rgba(212,175,55,0.2)',
              fontWeight: activeCategory === i ? 600 : 400,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {currentItems.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: isOpen ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isOpen ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.1)'}`,
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-sm font-medium pr-4"
                  style={{ color: isOpen ? 'rgba(212,175,55,1)' : 'rgba(255,255,255,0.8)' }}>
                  {item.q}
                </span>
                <span className="text-lg flex-shrink-0 transition-transform"
                  style={{
                    color: 'rgba(212,175,55,0.5)',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}>
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-5">
                  <p className="text-sm leading-loose"
                    style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-16 pt-8"
        style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          找不到答案？歡迎直接聯繫我們
        </p>
        <a href="https://lin.ee/Ro3Fd4p"
          target="_blank" rel="noopener noreferrer"
          className="btn-line text-sm px-8 py-3 rounded-full inline-flex items-center gap-2">
          📱 LINE 客服諮詢
        </a>
      </div>
    </div>
  );
}
