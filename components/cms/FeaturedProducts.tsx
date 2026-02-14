'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';

interface Tab {
  key: string;       // placement: 'home_featured', 'home_new', etc.
  label: string;     // 顯示名稱
  products: any[];   // 該 Tab 下的商品
}

interface FeaturedProductsProps {
  tabs: Tab[];
  fallbackProducts?: any[];  // 當 tabs 為空時的 fallback
}

export default function FeaturedProducts({ tabs, fallbackProducts = [] }: FeaturedProductsProps) {
  const [activeTab, setActiveTab] = useState(0);

  // 沒有 CMS 資料時，用 fallback
  const displayTabs = tabs.length > 0
    ? tabs
    : fallbackProducts.length > 0
      ? [{ key: 'all', label: '全部商品', products: fallbackProducts }]
      : [];

  if (displayTabs.length === 0) return null;

  const currentProducts = displayTabs[activeTab]?.products || [];

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-[4px] mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
            ─── OUR PRODUCTS ───
          </p>
          <h2 className="text-2xl md:text-3xl font-light tracking-wider" style={{ color: '#D4AF37' }}>
            嚴選商品
          </h2>
        </div>

        {/* Tabs（多於 1 個 Tab 時才顯示） */}
        {displayTabs.length > 1 && (
          <div className="flex justify-center gap-6 mb-10">
            {displayTabs.map((tab, idx) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(idx)}
                className={`pb-2 text-sm tracking-wider transition-all duration-300 ${
                  idx === activeTab
                    ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
                    : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {currentProducts.slice(0, 8).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <a
            href="/products"
            className="inline-block px-8 py-3 border text-sm tracking-wider transition-all duration-300 hover:text-black"
            style={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D4AF37';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#D4AF37';
            }}
          >
            查看全部商品
          </a>
        </div>
      </div>
    </section>
  );
}
