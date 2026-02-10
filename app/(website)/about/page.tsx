// ═══════════════════════════════════════════════════════════════
// app/(website)/about/page.tsx
// 關於我們頁面（Server Component）
// 施工說明書 v2.1 Phase 1 Step 4
// ═══════════════════════════════════════════════════════════════

import { getAllSections } from '@/lib/cms';
import AnimatedSection from '@/components/website/AnimatedSection';
import type { Metadata } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const metadata: Metadata = {
  title: '關於我們｜MINJIE STUDIO',
  description: '了解 MINJIE STUDIO 的品牌故事、核心價值與堅持——為家人把關每一口。',
  alternates: { canonical: `${baseUrl}/about` },
  openGraph: {
    title: '關於我們｜MINJIE STUDIO',
    description: '了解 MINJIE STUDIO 的品牌故事、核心價值與堅持——為家人把關每一口。',
    url: `${baseUrl}/about`,
    type: 'website',
  },
};

export default async function AboutPage() {
  const sections = await getAllSections('about');
  const hero = sections.hero;
  const coreValues = sections.core_values;
  const cta = sections.cta;

  return (
    <>
      {/* JSON-LD: Organization + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'MINJIE STUDIO',
              url: baseUrl,
              description: '嚴選健康食品，為家人把關每一口',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                url: 'https://lin.ee/Ro3Fd4p',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: '首頁', item: baseUrl },
                { '@type': 'ListItem', position: 2, name: '關於我們', item: `${baseUrl}/about` },
              ],
            },
          ]),
        }}
      />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-5 pt-8">
        <nav className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <a href="/" className="hover:text-gold transition-colors">首頁</a>
          <span className="mx-2">›</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>關於我們</span>
        </nav>
      </div>

      {/* Hero Section */}
      {hero && (
        <AnimatedSection>
          <section className="max-w-7xl mx-auto px-5 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                {hero.subtitle && (
                  <div className="text-[11px] tracking-[4px] mb-4"
                    style={{ color: 'rgba(212,175,55,0.5)' }}>
                    {hero.subtitle}
                  </div>
                )}
                <h1 className="text-3xl md:text-4xl font-light tracking-wider gold-text mb-8">
                  {hero.title}
                </h1>
                {hero.body.split('\n\n').map((p: string, i: number) => (
                  <p key={i} className="text-sm leading-loose mb-4"
                    style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {p}
                  </p>
                ))}
              </div>
              <div className="h-80 md:h-96 rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(212,175,55,0.15)' }}>
                {hero.image_url && !hero.image_url.includes('placeholder') ? (
                  <img src={hero.image_url} alt="MINJIE STUDIO 品牌形象" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #1a1a1a, #111)',
                      color: 'rgba(255,255,255,0.3)',
                    }}>
                    [ 品牌形象照片 ]
                  </div>
                )}
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* Core Values */}
      {coreValues && (
        <AnimatedSection>
          <section className="py-16"
            style={{
              background: 'linear-gradient(180deg, rgba(212,175,55,0.03), transparent)',
              borderTop: '1px solid rgba(212,175,55,0.1)',
              borderBottom: '1px solid rgba(212,175,55,0.1)',
            }}>
            <div className="max-w-7xl mx-auto px-5">
              <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text text-center mb-12">
                {coreValues.heading}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {coreValues.values.map((v: any, i: number) => (
                  <div key={i} className="text-center p-6 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(212,175,55,0.1)',
                    }}>
                    <div className="text-3xl mb-4">{v.icon}</div>
                    <h3 className="font-medium mb-3" style={{ color: 'rgba(212,175,55,0.9)' }}>
                      {v.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {v.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* CTA */}
      {cta && (
        <AnimatedSection>
          <section className="max-w-7xl mx-auto px-5 py-20 text-center">
            <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text mb-4">
              {cta.heading}
            </h2>
            <p className="text-sm mb-10 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {cta.body}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {cta.buttons?.map((btn: any, i: number) => (
                <a
                  key={i}
                  href={btn.href}
                  target={btn.href.startsWith('http') ? '_blank' : undefined}
                  rel={btn.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={btn.style === 'line' ? 'btn-line' : 'btn-gold-outline'}
                >
                  {btn.style === 'line' && '📱 '}{btn.label}
                </a>
              ))}
            </div>
          </section>
        </AnimatedSection>
      )}
    </>
  );
}
