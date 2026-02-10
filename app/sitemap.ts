import { getProducts } from '@/lib/medusa';
import { getPosts } from '@/lib/cms';
import type { MetadataRoute } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 取得所有商品
  const { products } = await getProducts({ limit: 100 });

  // 取得所有文章
  const { posts } = await getPosts({ limit: 100 });

  // 商品頁面
  const productPages = products.map((product: any) => ({
    url: `${baseUrl}/products/${product.handle}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 文章頁面
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 政策頁面
  const policyPages = ['privacy', 'terms', 'return', 'shipping'].map((type) => ({
    url: `${baseUrl}/policy/${type}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [
    // 首頁
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // 商品列表
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // 文章列表
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // 關於我們
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // 常見問題
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // 政策頁面
    ...policyPages,
    // 商品頁面
    ...productPages,
    // 文章頁面
    ...blogPages,
  ];
}
