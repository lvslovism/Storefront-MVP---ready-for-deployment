// ═══════════════════════════════════════════════════════════════
// app/(website)/blog/[slug]/page.tsx
// 文章詳情頁（Server Component + ISR）
// 施工說明書 v2.1 Phase 2 Step 12
// ═══════════════════════════════════════════════════════════════

import { getPostBySlug, getAllPostSlugs, getPosts } from '@/lib/cms';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Metadata } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: '文章不存在' };

  return {
    title: post.seo_title || `${post.title}｜MINJIE STUDIO`,
    description: post.seo_description || post.excerpt || '',
    alternates: { canonical: `${baseUrl}/blog/${post.slug}` },
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || '',
      url: `${baseUrl}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at,
      images: post.og_image || post.cover_image
        ? [{ url: post.og_image || post.cover_image!, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || '',
    },
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  // 取得其他文章作為延伸閱讀
  const { posts: allPosts } = await getPosts({ limit: 4 });
  const relatedPosts = allPosts.filter(p => p.slug !== post.slug).slice(0, 3);

  // JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || '',
    image: post.cover_image || post.og_image || '',
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: 'MINJIE STUDIO',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'MINJIE STUDIO',
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${post.slug}`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '保健知識', item: `${baseUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${baseUrl}/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]),
        }}
      />

      <article className="max-w-4xl mx-auto px-5 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <a href="/" className="hover:text-gold transition-colors">首頁</a>
          <span className="mx-2">›</span>
          <a href="/blog" className="hover:text-gold transition-colors">保健知識</a>
          <span className="mx-2">›</span>
          <span className="line-clamp-1 inline" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {post.title}
          </span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] px-3 py-1 rounded-full"
              style={{
                background: 'rgba(212,175,55,0.15)',
                color: 'rgba(212,175,55,0.8)',
              }}>
              {post.category}
            </span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {post.read_time} 分鐘閱讀
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light tracking-wider gold-text mb-4">
            {post.title}
          </h1>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {formatDate(post.published_at)}
          </div>
        </header>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="mb-10 rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(212,175,55,0.1)' }}>
            <img src={post.cover_image}
              alt={`${post.title} 文章封面`}
              className="w-full h-auto" />
          </div>
        )}

        {/* Markdown Content */}
        <div className="prose prose-invert prose-gold max-w-none mb-16">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="text-2xl font-light tracking-wider gold-text mt-12 mb-6">
                  {children}
                </h2>
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
                  style={{ color: 'rgba(255,255,255,0.65)' }}>
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
                <strong style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a href={href}
                  className="text-gold hover:text-gold-light underline transition-colors"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="my-8 border-0"
                  style={{ borderTop: '1px solid rgba(212,175,55,0.12)' }} />
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
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Share Buttons */}
        <div className="flex items-center gap-4 mb-16 pt-8"
          style={{ borderTop: '1px solid rgba(212,175,55,0.12)' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>分享文章：</span>
          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`${baseUrl}/blog/${post.slug}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs px-4 py-2 rounded-full transition-colors"
            style={{ background: '#06C755', color: '#fff' }}>
            LINE
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/blog/${post.slug}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs px-4 py-2 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            Facebook
          </a>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="pt-8" style={{ borderTop: '1px solid rgba(212,175,55,0.12)' }}>
            <h2 className="text-lg font-light tracking-wider gold-text mb-6">延伸閱讀</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`}
                  className="group p-4 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(212,175,55,0.1)',
                  }}>
                  <span className="text-[10px] px-2 py-0.5 rounded-full mb-2 inline-block"
                    style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.7)' }}>
                    {rp.category}
                  </span>
                  <h3 className="text-sm font-medium group-hover:text-gold transition-colors line-clamp-2 mb-1"
                    style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {rp.title}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {rp.read_time} 分鐘閱讀
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="text-center mt-16 py-10 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.05), rgba(212,175,55,0.02))',
            border: '1px solid rgba(212,175,55,0.15)',
          }}>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            想了解更多保健知識？
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://lin.ee/Ro3Fd4p" target="_blank" rel="noopener noreferrer"
              className="btn-line text-sm px-6 py-2.5 rounded-full">
              📱 加入 LINE 獲取最新文章
            </a>
            <Link href="/products"
              className="btn-gold-outline text-sm px-6 py-2.5 rounded-full">
              探索全部商品
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
