import { Suspense } from 'react';
import { Metadata } from 'next';
import { getProducts } from '@/lib/medusa';
import { getNavCategories, buildMedusaQuery, getCategorySeo, getPageSeo, DEFAULT_SEO, getProductSortOrder } from '@/lib/cms';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';
import ProductFilter from '@/components/website/ProductFilter';
import AnimatedSection from '@/components/website/AnimatedSection';

export const revalidate = 3600;

// 根據價格取得最低價（cents）
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

// 客戶端價格篩選（Medusa Store API 不支援 price filter 時使用）
function filterByPrice(products: any[], priceLte?: number, priceGte?: number): any[] {
  return products.filter((product) => {
    const lowestPrice = getLowestPrice(product);
    if (priceLte !== undefined && lowestPrice > priceLte) return false;
    if (priceGte !== undefined && lowestPrice < priceGte) return false;
    return true;
  });
}

// 動態生成 Metadata
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { category?: string };
}): Promise<Metadata> {
  const categorySlug = searchParams.category;

  if (!categorySlug) {
    const pageSeo = await getPageSeo('products');

    const title = pageSeo?.meta_title || DEFAULT_SEO.products.title;
    const description = pageSeo?.meta_description || DEFAULT_SEO.products.description;
    const ogImage = pageSeo?.og_image || DEFAULT_SEO.default_og_image;

    return {
      title,
      description,
      openGraph: {
        title: pageSeo?.og_title || title,
        description,
        images: ogImage ? [ogImage] : undefined,
        siteName: DEFAULT_SEO.brand_name,
      },
    };
  }

  // 從 CMS 讀取分類 SEO 資訊
  try {
    const seo = await getCategorySeo(categorySlug);

    if (seo) {
      return {
        title: seo.meta_title || categorySlug,
        description: seo.meta_description || `瀏覽 ${categorySlug} 分類商品`,
      };
    }
  } catch (error) {
    console.error('[Products] getCategorySeo error:', error);
  }

  // 找到分類名稱作為 fallback
  try {
    const categories = await getNavCategories();
    const currentCategory = categories.find((c) => c.slug === categorySlug);

    return {
      title: currentCategory?.label || categorySlug,
      description: `瀏覽 ${currentCategory?.label || categorySlug} 分類商品`,
    };
  } catch (error) {
    console.error('[Products] getNavCategories error:', error);
    return {
      title: categorySlug,
      description: `瀏覽 ${categorySlug} 分類商品`,
    };
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string };
}) {
  // 取得分類列表
  let categories: Awaited<ReturnType<typeof getNavCategories>> = [];
  try {
    categories = await getNavCategories();
  } catch (error) {
    console.error('[Products] Failed to load categories:', error);
  }

  // 找到當前選中的分類
  const currentCategory = searchParams.category
    ? categories.find((c) => c.slug === searchParams.category)
    : null;

  // 組裝 Medusa 查詢參數
  let medusaParams: Record<string, any> = { limit: 100 };
  let needClientSidePriceFilter = false;
  let priceLte: number | undefined;
  let priceGte: number | undefined;

  if (currentCategory) {
    const queryParams = buildMedusaQuery(currentCategory);

    // 檢查是否有 price filter（Medusa Store API 可能不支援）
    if (queryParams.price_lte !== undefined || queryParams.price_gte !== undefined) {
      needClientSidePriceFilter = true;
      priceLte = queryParams.price_lte;
      priceGte = queryParams.price_gte;
      // 移除 price 參數，不傳給 Medusa
      delete queryParams.price_lte;
      delete queryParams.price_gte;
    }

    medusaParams = { ...medusaParams, ...queryParams };
  }

  // 平行取得：商品列表 + CMS 排序
  let products: any[] = [];
  let sortOrder: Awaited<ReturnType<typeof getProductSortOrder>> = [];

  try {
    const [productsResult, sortOrderResult] = await Promise.all([
      getProducts(medusaParams).catch((error) => {
        console.error('[Products] Failed to fetch products:', error);
        return getProducts({ limit: 100 }).catch((fallbackError) => {
          console.error('[Products] Fallback fetch also failed:', fallbackError);
          return { products: [] };
        });
      }),
      getProductSortOrder(),
    ]);
    products = productsResult.products || [];
    sortOrder = sortOrderResult;
  } catch (error) {
    console.error('[Products] Failed to fetch data:', error);
  }

  // 客戶端價格篩選（如果需要）
  let filtered = products;
  if (needClientSidePriceFilter) {
    filtered = filterByPrice(products, priceLte, priceGte);
  }

  // 套用 CMS 排序（當沒有使用者排序選項時）
  let sorted = filtered;
  const userSort = searchParams.sort || '';

  console.log('[Products] Total from Medusa:', products.length);
  console.log('[Products] Sort order entries:', sortOrder.length);

  if (userSort) {
    // 使用者選了排序（價格/最新），優先使用
    sorted = sortProducts(filtered, userSort);
  } else if (sortOrder.length > 0) {
    // 使用 CMS 排序
    const sortMap = new Map(sortOrder.map((s) => [s.product_id, s]));

    const withSort: any[] = [];
    const withoutSort: any[] = [];

    for (const product of filtered) {
      if (sortMap.has(product.id)) {
        withSort.push(product);
      } else {
        withoutSort.push(product);
      }
    }

    // 有排序的按 sort_order 排列（置頂的在最前）
    withSort.sort((a, b) => {
      const sa = sortMap.get(a.id)!;
      const sb = sortMap.get(b.id)!;
      if (sa.is_pinned && !sb.is_pinned) return -1;
      if (!sa.is_pinned && sb.is_pinned) return 1;
      return sa.sort_order - sb.sort_order;
    });

    console.log('[Products] With sort:', withSort.length, 'Without sort:', withoutSort.length);

    sorted = [...withSort, ...withoutSort];
  }

  console.log('[Products] Final count:', sorted.length);

  // 分類標題
  const titleSubtitle = currentCategory
    ? currentCategory.slug.toUpperCase().replace(/-/g, ' ')
    : 'ALL PRODUCTS';
  const titleMain = currentCategory?.label || '全部商品';

  return (
    <section className="max-w-7xl mx-auto px-5 py-16">
      <AnimatedSection>
        <SectionTitle
          subtitle={titleSubtitle}
          title={titleMain}
        />
      </AnimatedSection>

      <Suspense fallback={null}>
        <ProductFilter categories={categories} />
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
