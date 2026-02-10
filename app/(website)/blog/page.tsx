// ═══════════════════════════════════════════════════════════════
// app/(website)/blog/page.tsx
// 文章列表頁（Server Component）
// 施工說明書 v2.1 Phase 2 Step 11
// ═══════════════════════════════════════════════════════════════

import { getPosts, getFeaturedPosts } from '@/lib/cms';
import Link from 'next/link';
import type { Metadata } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '保健知識｜MINJIE STUDIO',
  description: '益生菌怎麼選？膠原蛋白什麼時候吃？MINJIE STUDIO 分享實用保健知識，幫你做出更好的健康選擇。',
  alternates: { canonical: `${baseUrl}/blog` },
  openGraph: {
    title: '保健知識｜MINJIE STUDIO',
    description: '益生菌怎麼選？膠原蛋白什麼時候吃？MINJIE STUDIO 分享實用保健知識。',
    url: `${baseUrl}/blog`,
    type: 'website',
  },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogPage() {
  const [{ posts }, featured] = await Promise.all([
    getPosts({ limit: 12 }),
    getFeaturedPosts(1),
  ]);

  const featuredPost = featured[0];
  const otherPosts = posts.filter(p => p.slug !== featuredPost?.slug);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首頁', item: baseUrl },
              { '@type': 'ListItem', position: 2, name: '保健知識', item: `${baseUrl}/blog` },
            ],
          }),
        }}
      />

      <div className="max-w-7xl mx-auto px-5 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <a href="/" className="hover:text-gold transition-colors">首頁</a>
          <span className="mx-2">›</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>保健知識</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[11px] tracking-[4px] mb-3"
            style={{ color: 'rgba(212,175,55,0.5)' }}>
            HEALTH KNOWLEDGE
          </div>
          <h1 className="text-3xl md:text-4xl font-light tracking-wider gold-text">
            保健知識
          </h1>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <Link href={`/blog/${featuredPost.slug}`}
            className="block mb-12 group">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}>
              {/* Cover */}
              <div className="h-64 md:h-80"
                style={{ background: 'linear-gradient(135deg, #1a1a1a, #111)' }}>
                {featuredPost.cover_image ? (
                  <img src={featuredPost.cover_image}
                    alt={`${featuredPost.title} 文章封面`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm"
                    style={{ color: 'rgba(255,255,255,0.2)' }}>
                    [ 封面圖片 ]
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] px-3 py-1 rounded-full"
                    style={{
                      background: 'rgba(212,175,55,0.15)',
                      color: 'rgba(212,175,55,0.8)',
                    }}>
                    {featuredPost.category}
                  </span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {featuredPost.read_time} 分鐘閱讀
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-light tracking-wider mb-4 group-hover:text-gold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {featuredPost.title}
                </h2>
                <p className="text-sm leading-relaxed mb-4"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {featuredPost.excerpt}
                </p>
                <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {formatDate(featuredPost.published_at)}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Post Grid */}
        {otherPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="group rounded-xl overflow-hidden"
                style={{
                  background: '#111',
                  border: '1px solid rgba(212,175,55,0.1)',
                }}>
                {/* Thumbnail */}
                <div className="h-48 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #1a1a1a, #0d0d0d)' }}>
                  {post.cover_image ? (
                    <img src={post.cover_image}
                      alt={`${post.title} 文章封面`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs"
                      style={{ color: 'rgba(255,255,255,0.15)' }}>
                      [ 封面 ]
                    </div>
                  )}
                </div>
                {/* Body */}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(212,175,55,0.1)',
                        color: 'rgba(212,175,55,0.7)',
                      }}>
                      {post.category}
                    </span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {post.read_time} 分鐘
                    </span>
                  </div>
                  <h3 className="text-sm font-medium mb-2 group-hover:text-gold transition-colors line-clamp-2"
                    style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {post.title}
                  </h3>
                  <p className="text-xs leading-relaxed line-clamp-2"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {post.excerpt}
                  </p>
                  <div className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {formatDate(post.published_at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>文章即將上線，敬請期待！</p>
          </div>
        )}
      </div>
    </>
  );
}
