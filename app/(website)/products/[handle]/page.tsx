import { getProducts } from '@/lib/medusa';
import ProductDetailClient from './ProductDetailClient';
import type { Metadata } from 'next';

export const revalidate = 3600;

const baseUrl = 'https://shop.minjie0326.com';

// 預生成所有商品頁
export async function generateStaticParams() {
  const { products } = await getProducts({ limit: 100 });
  return products.map((p: any) => ({ handle: p.handle }));
}

// 動態 meta
export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const { products } = await getProducts({ limit: 100 });
  const product = products.find((p: any) => p.handle === params.handle);

  if (!product) {
    return { title: '商品不存在' };
  }

  const description = product.subtitle || product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || '';

  return {
    title: product.title,
    description,
    openGraph: {
      title: `${product.title} | MINJIE STUDIO`,
      description,
      url: `${baseUrl}/products/${product.handle}`,
      images: product.thumbnail ? [{
        url: product.thumbnail,
        width: 800,
        height: 800,
        alt: product.title,
      }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  };
}

// JSON-LD 結構化資料
function generateProductJsonLd(product: any) {
  const price = product.variants?.[0]?.calculated_price?.calculated_amount;
  const inStock = product.variants?.some((v: any) =>
    v.inventory_quantity === undefined || v.inventory_quantity > 0
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description?.replace(/<[^>]*>/g, '') || product.subtitle || '',
    image: product.thumbnail || product.images?.[0]?.url,
    url: `${baseUrl}/products/${product.handle}`,
    brand: {
      '@type': 'Brand',
      name: 'MINJIE STUDIO',
    },
    offers: {
      '@type': 'Offer',
      price: price ? price / 100 : 0,
      priceCurrency: 'TWD',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/products/${product.handle}`,
      seller: {
        '@type': 'Organization',
        name: 'MINJIE STUDIO',
      },
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const { products } = await getProducts({ limit: 100 });
  const product = products.find((p: any) => p.handle === params.handle);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">😕</div>
          <h1 className="text-xl mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            找不到此商品
          </h1>
          <a href="/products" className="btn-gold-outline text-sm mt-4 inline-block">
            ← 回商品列表
          </a>
        </div>
      </div>
    );
  }

  const jsonLd = generateProductJsonLd(product);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首頁',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '全部商品',
        item: `${baseUrl}/products`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${baseUrl}/products/${product.handle}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
