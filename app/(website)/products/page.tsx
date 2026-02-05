import { Suspense } from 'react';
import { getProducts, getCollections } from '@/lib/medusa';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';
import ProductFilter from '@/components/website/ProductFilter';
import AnimatedSection from '@/components/website/AnimatedSection';

export const revalidate = 3600;

export const metadata = {
  title: '全部商品',
  description: 'MINJIE STUDIO 全系列健康食品，益生菌、膠原蛋白、酵素、葉黃素等嚴選商品。',
};

// 根據價格取得最低價
function getLowestPrice(product: any): number {
  const prices = product.variants
    ?.map((v: any) => v.calculated_price?.calculated_amount)
    .filter((p: any) => p != null) || [];
  return prices.length > 0 ? Math.min(...prices) : 0;
}

// 排序商品
function sortProducts(products: any[], sort: string) {
  switch (sort) {
    case 'price_asc':
      return [...products].sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
    case 'price_desc':
      return [...products].sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
    case 'newest':
      return [...products].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    default:
      return products;
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { collection?: string; sort?: string };
}) {
  const [{ products }, { collections }] = await Promise.all([
    getProducts({ limit: 100 }),
    getCollections(),
  ]);

  // 篩選：根據 collection handle 篩選
  let filtered = products;
  if (searchParams.collection) {
    const targetCollection = collections.find(
      (c: any) => c.handle === searchParams.collection
    );
    if (targetCollection) {
      filtered = products.filter(
        (p: any) => p.collection_id === targetCollection.id
      );
    }
  }

  // 排序
  const sorted = sortProducts(filtered, searchParams.sort || '');

  // 目前分類名稱
  const currentCollectionTitle = searchParams.collection
    ? collections.find((c: any) => c.handle === searchParams.collection)?.title
    : null;

  return (
    <section className="max-w-7xl mx-auto px-5 py-16">
      <AnimatedSection>
        <SectionTitle
          subtitle={currentCollectionTitle ? currentCollectionTitle.toUpperCase() : 'ALL PRODUCTS'}
          title={currentCollectionTitle || '全部商品'}
        />
      </AnimatedSection>

      <Suspense fallback={null}>
        <ProductFilter collections={collections} />
      </Suspense>

      {/* 商品數量 */}
      <div className="text-right mb-4">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          共 {sorted.length} 個商品
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4 opacity-30">🔍</div>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>
            此分類目前沒有商品
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {sorted.map((product: any, i: number) => (
            <AnimatedSection key={product.id} delay={i * 60}>
              <ProductCard product={product} />
            </AnimatedSection>
          ))}
        </div>
      )}
    </section>
  );
}
