import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/checkout/', '/liff/'],
    },
    sitemap: 'https://shop.minjie0326.com/sitemap.xml',
  };
}
