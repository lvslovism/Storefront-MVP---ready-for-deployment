// ═══════════════════════════════════════════════════════════════
// app/sitemap.ts
// XML Sitemap 自動產生
// 施工說明書 v2.1 Phase 1 Step 8
// ═══════════════════════════════════════════════════════════════

import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/medusa';
import { getPosts } from '@/lib/cms';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://shop.minjie0326.com';

  // 靜態頁面
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/policy/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy/return`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy/shipping`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ];

  // 商品頁
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const { products } = await getProducts({ limit: 100 });
    productPages = products.map((p) => ({
      url: `${baseUrl}/products/${p.handle}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
  } catch (e) {
    console.error('[Sitemap] Failed to fetch products:', e);
  }

  // 文章頁
  let postPages: MetadataRoute.Sitemap = [];
  try {
    const { posts } = await getPosts({ limit: 100 });
    postPages = posts.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error('[Sitemap] Failed to fetch posts:', e);
  }

  return [...staticPages, ...productPages, ...postPages];
}
