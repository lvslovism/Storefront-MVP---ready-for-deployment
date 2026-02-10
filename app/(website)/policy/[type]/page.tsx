// ═══════════════════════════════════════════════════════════════
// app/(website)/policy/[type]/page.tsx
// 四個政策頁共用動態路由：privacy / terms / return / shipping
// 施工說明書 v2.1 Phase 1 Step 3
// ═══════════════════════════════════════════════════════════════

import { getSection } from '@/lib/cms';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const VALID_TYPES = ['privacy', 'terms', 'return', 'shipping'] as const;
type PolicyType = typeof VALID_TYPES[number];

const baseUrl = 'https://shop.minjie0326.com';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: { type: string };
}): Promise<Metadata> {
  if (!VALID_TYPES.includes(params.type as PolicyType)) {
    return { title: '頁面不存在' };
  }

  const data = await getSection('policy', params.type);
  if (!data) return { title: '頁面不存在' };

  return {
    title: data.seo_title || data.title,
    description: data.seo_description || '',
    alternates: {
      canonical: `${baseUrl}/policy/${params.type}`,
    },
    openGraph: {
      title: data.seo_title || data.title,
      description: data.seo_description || '',
      url: `${baseUrl}/policy/${params.type}`,
      type: 'website',
    },
  };
}

export default async function PolicyPage({
  params,
}: {
  params: { type: string };
}) {
  if (!VALID_TYPES.includes(params.type as PolicyType)) {
    notFound();
  }

  const data = await getSection('policy', params.type);
  if (!data) {
    notFound();
  }

  return (
    <>
      {/* Breadcrumb + JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: '首頁',
                item: baseUrl,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: data.title,
                item: `${baseUrl}/policy/${params.type}`,
              },
            ],
          }),
        }}
      />

      <div className="max-w-4xl mx-auto px-5 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <a href="/" className="hover:text-gold transition-colors">首頁</a>
          <span className="mx-2">›</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{data.title}</span>
        </nav>

        {/* 標題 */}
        <h1 className="text-3xl md:text-4xl font-light tracking-wider gold-text mb-4">
          {data.title}
        </h1>

        {/* 更新日期 */}
        {data.last_updated && (
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
            最後更新：{data.last_updated}
          </p>
        )}

        {/* Markdown 內容 */}
        <article className="prose prose-invert prose-gold max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-light tracking-wider gold-text mt-12 mb-6">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-light tracking-wider mt-10 mb-4"
                  style={{ color: 'rgba(212,175,55,0.9)' }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium mt-8 mb-3"
                  style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-loose mb-4"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {children}
                </p>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-loose"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-gold hover:text-gold-light underline transition-colors"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="my-8 border-0"
                  style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }} />
              ),
              blockquote: ({ children }) => (
                <blockquote className="pl-4 my-6 italic"
                  style={{
                    borderLeft: '2px solid rgba(212,175,55,0.4)',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                  {children}
                </blockquote>
              ),
            }}
          >
            {(data.content_markdown || '').replace(/\\n/g, '\n')}
          </ReactMarkdown>
        </article>

        {/* 底部 CTA */}
        <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            如有任何疑問，歡迎透過以下方式聯繫我們
          </p>
          <div className="flex gap-4">
            <a href="https://lin.ee/Ro3Fd4p"
              target="_blank" rel="noopener noreferrer"
              className="btn-line text-sm px-6 py-2.5 rounded-full inline-flex items-center gap-2">
              📱 LINE 客服
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
