// ═══════════════════════════════════════════════════════════════
// app/(website)/faq/page.tsx
// FAQ 頁面（Server Component — 資料 fetch）
// 施工說明書 v2.1 Phase 1 Step 5
// ═══════════════════════════════════════════════════════════════

import { getSection, getPageSeo, DEFAULT_SEO } from '@/lib/cms';
import FAQClient from './FAQClient';
import type { Metadata } from 'next';

const baseUrl = 'https://shop.minjie0326.com';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const pageSeo = await getPageSeo('faq');

  const title = pageSeo?.meta_title || DEFAULT_SEO.faq.title;
  const description = pageSeo?.meta_description || DEFAULT_SEO.faq.description;
  const ogImage = pageSeo?.og_image || DEFAULT_SEO.default_og_image;

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/faq` },
    openGraph: {
      title: pageSeo?.og_title || title,
      description,
      url: `${baseUrl}/faq`,
      type: 'website',
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

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
