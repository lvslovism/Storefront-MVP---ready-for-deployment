import { getProducts } from '@/lib/medusa';
import { getPosts } from '@/lib/cms';
import type { MetadataRoute } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 靜態頁面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // 政策頁面
  const policyPages: MetadataRoute.Sitemap = ['privacy', 'terms', 'return', 'shipping'].map((type) => ({
    url: `${baseUrl}/policy/${type}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // 動態商品頁面（失敗時不阻擋 sitemap 生成）
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const { products } = await getProducts({ limit: 200 });
    productPages = products.map((product: any) => ({
      url: `${baseUrl}/products/${product.handle}`,
      lastModified: new Date(product.updated_at || product.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[Sitemap] Failed to fetch products:', error);
  }

  // 動態文章頁面（失敗時不阻擋 sitemap 生成）
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const { posts } = await getPosts({ limit: 200 });
    blogPages = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at || post.published_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('[Sitemap] Failed to fetch posts:', error);
  }

  return [
    ...staticPages,
    ...policyPages,
    ...productPages,
    ...blogPages,
  ];
}
