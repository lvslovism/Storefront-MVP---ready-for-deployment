// ═══════════════════════════════════════════════════════════════
// app/robots.ts
// robots.txt 設定
// 施工說明書 v2.1 Phase 1 Step 8
// ═══════════════════════════════════════════════════════════════

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/checkout', '/checkout/', '/api/', '/liff/'],
    },
    sitemap: 'https://shop.minjie0326.com/sitemap.xml',
  };
}
