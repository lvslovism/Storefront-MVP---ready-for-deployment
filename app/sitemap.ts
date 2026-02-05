import { getProducts } from '@/lib/medusa';
import type { MetadataRoute } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 取得所有商品
  const { products } = await getProducts({ limit: 100 });

  // 商品頁面
  const productPages = products.map((product: any) => ({
    url: `${baseUrl}/products/${product.handle}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
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
    ...productPages,
  ];
}
