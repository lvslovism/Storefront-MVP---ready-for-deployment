# Phase 2：首頁完整開發

## 新增檔案清單

| 檔案 | 用途 |
|------|------|
| `components/website/AnimatedSection.tsx` | 滾動漸入動畫 |
| `components/website/CountUp.tsx` | 數字滾動動畫 |
| `app/(website)/page.tsx` | 首頁全面改寫 |

---

## 檔案 1：`components/website/AnimatedSection.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
}

export default function AnimatedSection({ children, className = '', delay = 0 }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      {children}
    </div>
  );
}
```

---

## 檔案 2：`components/website/CountUp.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  end: number;
  suffix?: string;
  duration?: number; // ms
}

export default function CountUp({ end, suffix = '', duration = 2000 }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();

          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setCount(Math.floor(eased * end));

            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}
```

---

## 檔案 3：`app/(website)/page.tsx`（完整替換）

```tsx
import { getProducts, getCollections } from '@/lib/medusa';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';
import AnimatedSection from '@/components/website/AnimatedSection';
import CountUp from '@/components/website/CountUp';
import Link from 'next/link';

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
```

---

## 需確認：`lib/medusa.ts` 是否有 `getCollections`

如果沒有，在 `lib/medusa.ts` 加上：

```typescript
export async function getCollections() {
  const url = `${MEDUSA_BACKEND_URL}/store/collections?limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return { collections: [], count: 0 };
  }

  return res.json();
}
```

---

## globals.css 追加動畫（在檔案最底部加入）

```css
/* === 首頁動畫 === */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 1s ease forwards;
}

/* Hero 文字依序進場 */
section:first-child h1 {
  animation: fade-in 1s ease 0.2s both;
}
section:first-child h2 {
  animation: fade-in 1s ease 0.4s both;
}
section:first-child p {
  animation: fade-in 1s ease 0.6s both;
}
section:first-child .flex {
  animation: fade-in 1s ease 0.8s both;
}
```

---

## 完成後檢查清單

- [ ] `lib/medusa.ts` 有 `getCollections` 函數
- [ ] `npm run dev` 無報錯
- [ ] 首頁 Hero 文字有依序淡入動畫
- [ ] 信任數字向上滾動到位時有數字動畫
- [ ] 熱銷推薦 6 張商品卡片有滾動漸入
- [ ] 分類入口顯示 6 個分類（有圖示和描述）
- [ ] 點分類可跳到 `/products?collection=xxx`
- [ ] 品牌故事區 placeholder 正常顯示
- [ ] 會員福利 4 個等級卡片漸入
- [ ] 手機版 2 欄排版正確
- [ ] 推到 GitHub → Vercel 部署
