// ═══════════════════════════════════════════════════════════════
// app/(website)/faq/page.tsx
// FAQ 頁面（Server Component — 資料 fetch）
// 施工說明書 v2.1 Phase 1 Step 5
// ═══════════════════════════════════════════════════════════════

import { getSection } from '@/lib/cms';
import FAQClient from './FAQClient';
import type { Metadata } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const metadata: Metadata = {
  title: '常見問題 FAQ｜MINJIE STUDIO',
  description: '益生菌怎麼吃？可以退貨嗎？運費怎麼算？MINJIE STUDIO 常見問題一次解答。',
  alternates: { canonical: `${baseUrl}/faq` },
  openGraph: {
    title: '常見問題 FAQ｜MINJIE STUDIO',
    description: '益生菌怎麼吃？可以退貨嗎？運費怎麼算？MINJIE STUDIO 常見問題一次解答。',
    url: `${baseUrl}/faq`,
    type: 'website',
  },
};

export default async function FAQPage() {
  const data = await getSection('faq', 'categories');

  // Build FAQPage JSON-LD
  const allItems = data?.categories?.flatMap((cat: any) => cat.items) || [];
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allItems.map((item: any) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '常見問題', item: `${baseUrl}/faq` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]),
        }}
      />
      <FAQClient data={data} />
    </>
  );
}
