import { getProducts, getCollections } from '@/lib/medusa';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';
import AnimatedSection from '@/components/website/AnimatedSection';
import CountUp from '@/components/website/CountUp';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MINJIE STUDIO | 嚴選健康食品',
  description: '每一份細膩，都源自對家人健康的愛。MINJIE STUDIO 嚴選全球頂級原料，益生菌、膠原蛋白、酵素、葉黃素等健康食品。',
  openGraph: {
    title: 'MINJIE STUDIO | 嚴選健康食品',
    description: '每一份細膩，都源自對家人健康的愛。嚴選全球頂級原料，打造專屬於你的健康方案。',
    type: 'website',
  },
};

export const revalidate = 3600;

// ── 分類圖示對應 ──
const COLLECTION_META: Record<string, { icon: string; desc: string }> = {
  'beauty-series':  { icon: '✨', desc: '膠原蛋白・玻尿酸・美白' },
  'feminine-care':  { icon: '🌸', desc: '蔓越莓・益生菌・私密防護' },
  'maternity-care': { icon: '🤰', desc: '孕期營養・益生菌' },
  'lutein-drink':   { icon: '👁️', desc: '葉黃素・護眼保健' },
  'yuri-series':    { icon: '💝', desc: '小資入門・輕鬆體驗' },
  '598-series':     { icon: '🎁', desc: '自由混搭・超值組合' },
  'all-product':    { icon: '🛍️', desc: '瀏覽全部商品' },
};

// JSON-LD 組織結構化資料
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MINJIE STUDIO',
  url: 'https://shop.minjie0326.com',
  logo: 'https://shop.minjie0326.com/logo.png',
  description: '嚴選全球頂級原料的健康食品品牌',
  sameAs: [],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MINJIE STUDIO',
  url: 'https://shop.minjie0326.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://shop.minjie0326.com/products?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default async function HomePage() {
  // 平行取資料
  const [{ products }, { collections }] = await Promise.all([
    getProducts({ limit: 50 }),
    getCollections(),
  ]);

  const featured = products.slice(0, 6);

  // 篩選有商品的分類（排除「全系列商品」）
  const displayCollections = collections
    .filter((c: any) => c.handle !== 'all-product')
    .slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* ═══════════ Hero ═══════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* 背景光暈 */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(212,175,55,0.03) 0%, transparent 40%)
          `
        }} />

        {/* 裝飾線條 */}
        <div className="absolute top-1/4 left-10 w-px h-32 opacity-20"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.5), transparent)' }} />
        <div className="absolute bottom-1/4 right-10 w-px h-32 opacity-20"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.5), transparent)' }} />

        <div className="relative text-center px-5 max-w-2xl">
          {/* 品牌標語 */}
          <div className="text-[11px] tracking-[6px] mb-8 animate-fade-in"
            style={{ color: 'rgba(212,175,55,0.6)' }}>
            ─── HEALTH & BEAUTY ───
          </div>

          <h1 className="text-4xl md:text-6xl font-light leading-tight mb-3 tracking-wider gold-text">
            每一份細膩
          </h1>
          <h2 className="text-2xl md:text-3xl font-light leading-relaxed mb-6"
            style={{ color: 'rgba(255,255,255,0.9)' }}>
            都源自對家人健康的愛
          </h2>

          <p className="text-sm leading-loose mb-12 max-w-md mx-auto"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            日復一日的用心，只為讓家人的健康更安心<br />
            嚴選全球頂級原料，打造專屬於你的健康方案
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/products" className="btn-gold">
              探索商品
            </Link>
            <a href="#membership" className="btn-gold-outline">
              加入 LINE
            </a>
          </div>

          {/* 向下箭頭 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="rgba(212,175,55,0.4)" strokeWidth="1.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ═══════════ 信任數字條 ═══════════ */}
      <section style={{
        borderTop: '1px solid rgba(212,175,55,0.15)',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
        background: 'rgba(212,175,55,0.02)',
      }}>
        <div className="max-w-7xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { end: 600, suffix: '+', label: '商品銷售' },
            { end: 476, suffix: 'K+', label: '社群觸及' },
            { end: 13, suffix: 'K+', label: '滿意客戶' },
            { end: 68, suffix: '%+', label: '回購率' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold gold-text">
                <CountUp end={s.end} suffix={s.suffix} />
              </div>
              <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ 熱銷推薦 ═══════════ */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <AnimatedSection>
          <SectionTitle subtitle="BEST SELLERS" title="熱銷推薦" />
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {featured.map((product, i) => (
            <AnimatedSection key={product.id} delay={i * 100}>
              <ProductCard product={product} />
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={400}>
          <div className="text-center mt-12">
            <Link href="/products" className="btn-gold-outline">
              查看全部商品 →
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════ 商品分類 ═══════════ */}
      <section style={{
        background: 'linear-gradient(180deg, rgba(212,175,55,0.03), transparent)',
        borderTop: '1px solid rgba(212,175,55,0.08)',
      }}>
        <div className="max-w-7xl mx-auto px-5 py-20">
          <AnimatedSection>
            <SectionTitle subtitle="CATEGORIES" title="商品分類" />
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {displayCollections.map((col: any, i: number) => {
              const meta = COLLECTION_META[col.handle] || { icon: '🏷️', desc: '' };
              return (
                <AnimatedSection key={col.id} delay={i * 80}>
                  <Link href={`/products?collection=${col.handle}`}
                    className="gold-card p-6 md:p-8 block text-center group">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {meta.icon}
                    </div>
                    <h3 className="text-sm md:text-base font-medium mb-1"
                      style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {col.title}
                    </h3>
                    <p className="text-[11px] leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {meta.desc}
                    </p>
                  </Link>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ 品牌故事 ═══════════ */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <div>
              <div className="text-[11px] tracking-[4px] mb-4"
                style={{ color: 'rgba(212,175,55,0.5)' }}>
                ABOUT US
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text mb-6">
                Hello！我是翠翠
              </h2>
              <p className="text-sm leading-loose mb-4"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                每一份細膩，都源自對家人健康的愛。日復一日的用心，只為讓家人的健康更安心。
              </p>
              <p className="text-sm leading-loose mb-8"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                MINJIE STUDIO 嚴選全球頂級原料，與專業營養師合作，
                打造最適合台灣人體質的健康食品系列。從益生菌到膠原蛋白，
                每一款產品都經過嚴格品質把關。
              </p>

              {/* 特色標籤 */}
              <div className="flex gap-6 md:gap-10">
                {[
                  { icon: '🔬', label: '嚴選原料', sub: '全球產地直送' },
                  { icon: '🏆', label: '專業認證', sub: 'SGS 檢驗合格' },
                  { icon: '💚', label: '安心保證', sub: '無添加防腐劑' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-xs font-medium mb-0.5"
                      style={{ color: 'rgba(212,175,55,0.8)' }}>
                      {item.label}
                    </div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {/* 照片佔位 — 之後替換成翠翠形象照 */}
            <div className="h-80 md:h-[450px] rounded-2xl flex items-center justify-center overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #1a1a1a, #111)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}>
              {/* 裝飾元素 */}
              <div className="absolute top-4 right-4 text-[10px] tracking-widest"
                style={{ color: 'rgba(212,175,55,0.3)' }}>
                MINJIE STUDIO
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4 opacity-30">📸</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  翠翠形象照片
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  提供後替換
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ 會員福利 ═══════════ */}
      <section id="membership" style={{
        background: 'linear-gradient(180deg, rgba(212,175,55,0.05), transparent)',
        borderTop: '1px solid rgba(212,175,55,0.1)',
      }}>
        <div className="max-w-7xl mx-auto px-5 py-20">
          <AnimatedSection>
            <SectionTitle subtitle="MEMBERSHIP" title="加入 LINE 享會員福利" />
            <p className="text-sm text-center mb-12" style={{ color: 'rgba(255,255,255,0.45)' }}>
              消費 100 元 = 送 1 點 ｜ 生日禮金 ｜ 專屬優惠 ｜ 新品搶先看
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { tier: '一般會員', spend: '加入即享', gift: '$100', discount: '', clr: 'rgba(255,255,255,0.5)' },
              { tier: '銀卡會員', spend: '累計 $3,000', gift: '$200', discount: '97 折', clr: '#C0C0C0' },
              { tier: '金卡會員', spend: '累計 $10,000', gift: '$500', discount: '95 折', clr: '#D4AF37' },
              { tier: 'VIP 會員', spend: '累計 $30,000', gift: '$2,000', discount: '9 折', clr: '#FFD700' },
            ].map((m, i) => (
              <AnimatedSection key={m.tier} delay={i * 100}>
                <div className="p-5 md:p-6 rounded-xl text-center h-full"
                  style={{
                    border: `1px solid ${m.clr}25`,
                    background: `linear-gradient(180deg, ${m.clr}08, transparent)`,
                  }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: m.clr }}>
                    {m.tier}
                  </div>
                  <div className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {m.spend}
                  </div>

                  <div className="mb-3">
                    <div className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      生日禮金
                    </div>
                    <div className="text-xl font-bold" style={{ color: m.clr }}>
                      {m.gift}
                    </div>
                  </div>

                  {m.discount && (
                    <div className="text-[11px] px-3 py-1 rounded-full inline-block"
                      style={{ background: `${m.clr}15`, color: m.clr }}>
                      全站 {m.discount}
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={300}>
            <div className="text-center">
              <button className="btn-line text-base px-10 py-4">
                📱 加入 LINE 官方帳號
              </button>
              <p className="text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                加入即贈 $100 購物金
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
