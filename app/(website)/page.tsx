// app/(website)/page.tsx
import { getProducts, getProductsByIds } from '@/lib/medusa';
import { getHomeBanners, getPageSeo, getFeaturedProductIds, getFeaturedPlacements, getSection, getProductSortOrder } from '@/lib/cms';
import ImageSection from '@/components/cms/ImageSection';
import FeaturedProducts from '@/components/cms/FeaturedProducts';
import TrustNumbers from '@/components/cms/TrustNumbers';
import ProductCard from '@/components/ProductCard';
import type { Metadata } from 'next';

export const revalidate = 3600; // ISR: 1 小時

const defaultHomeMeta = {
  title: 'MINJIE STUDIO｜嚴選保健食品',
  description: '嚴選全球頂級原料，打造專屬你的健康方案。益生菌、膠原蛋白、酵素等保健食品。',
};

// placement 對應的中文 Tab 名稱
const PLACEMENT_LABELS: Record<string, string> = {
  'home_featured': '精選推薦',
  'home_new': '新品上架',
  'home_hot': '熱銷排行',
  'category_top': '分類精選',
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getPageSeo('home');
    if (seo) {
      return {
        title: seo.title || defaultHomeMeta.title,
        description: seo.description || defaultHomeMeta.description,
        openGraph: {
          title: seo.title || defaultHomeMeta.title,
          description: seo.description || defaultHomeMeta.description,
          ...(seo.og_image && { images: [{ url: seo.og_image }] }),
        },
      };
    }
  } catch (error) {
    console.error('[Home] getPageSeo error:', error);
  }
  return {
    title: defaultHomeMeta.title,
    description: defaultHomeMeta.description,
  };
}

export default async function HomePage() {
  // 並行請求：CMS 圖片 + CMS 推薦商品 placements + 信任數字 + 全部商品 + 排序
  const [banners, placements, trustNumbers, allProductsResult, sortOrder] = await Promise.all([
    getHomeBanners(),
    getFeaturedPlacements(),
    getSection('home', 'trust_numbers'),
    getProducts({ limit: 100 }).catch((err) => {
      console.error('[Home] getProducts error:', err);
      return { products: [] };
    }),
    getProductSortOrder().catch((err) => {
      console.error('[Home] getProductSortOrder error:', err);
      return [];
    }),
  ]);

  const allProducts: any[] = allProductsResult.products || [];

  // 根據 CMS 資料決定商品區塊
  let tabs: { key: string; label: string; products: any[] }[] = [];
  let fallbackProducts: any[] = [];
  const featuredProductIdSet = new Set<string>();

  if (placements.length > 0) {
    // CMS 驅動模式：按 placement 分組取商品
    const tabResults = await Promise.all(
      placements.map(async (placement: string) => {
        const productIds = await getFeaturedProductIds(placement);
        const products = await getProductsByIds(productIds);
        // 收集所有嚴選商品 ID
        products.forEach((p: any) => featuredProductIdSet.add(p.id));
        return {
          key: placement,
          label: PLACEMENT_LABELS[placement] || placement,
          products,
        };
      })
    );
    // 過濾掉沒有商品的 Tab
    tabs = tabResults.filter(t => t.products.length > 0);
  }

  if (tabs.length === 0) {
    // Fallback：CMS 沒資料時用 Medusa 全部商品
    const { products } = await getProducts({ limit: 8 });
    fallbackProducts = products;
    // fallback 模式下也收集 ID
    products.forEach((p: any) => featuredProductIdSet.add(p.id));
  }

  // ===== 計算「更多商品」：排除嚴選商品，套用 CMS 排序 =====
  const remainingProducts = allProducts.filter(
    (p: any) => !featuredProductIdSet.has(p.id)
  );

  let sortedRemaining = [...remainingProducts];
  if (sortOrder && sortOrder.length > 0) {
    const sortMap = new Map(
      sortOrder.map((s: any) => [s.product_id, { sort_order: s.sort_order, is_pinned: s.is_pinned }])
    );

    const withSort = sortedRemaining.filter((p: any) => sortMap.has(p.id));
    const withoutSort = sortedRemaining.filter((p: any) => !sortMap.has(p.id));

    withSort.sort((a: any, b: any) => {
      const sa = sortMap.get(a.id)!;
      const sb = sortMap.get(b.id)!;
      if (sa.is_pinned && !sb.is_pinned) return -1;
      if (!sa.is_pinned && sb.is_pinned) return 1;
      return sa.sort_order - sb.sort_order;
    });

    sortedRemaining = [...withSort, ...withoutSort];
  }

  console.log('[Home] All products:', allProducts.length, 'Featured:', featuredProductIdSet.size, 'Remaining:', sortedRemaining.length);

  return (
    <div style={{ background: '#0a0a0a' }}>

      {/* ===== 區塊 3: Hero 品牌區 ===== */}
      <ImageSection
        banner={banners.hero_brand}
        priority={true}
        hideWhenEmpty={false}
      />

      {/* ===== 區塊 4: 會員制度表 ===== */}
      <ImageSection banner={banners.membership_table} />

      {/* ===== 區塊 5: 新春滿額禮 / 當季活動 ===== */}
      <ImageSection banner={banners.spring_promo} />

      {/* ===== 區塊 6: 無卡分期 ===== */}
      <ImageSection banner={banners.installment_info} />

      {/* ===== 區塊 7: 購物流程圖 ===== */}
      <ImageSection banner={banners.shopping_flow} />

      {/* ===== 區塊 8: 商品區（CMS 驅動分類 Tabs + 精選商品） ===== */}
      <FeaturedProducts tabs={tabs} fallbackProducts={fallbackProducts} />

      {/* ===== 區塊 9: 更多商品 ===== */}
      {sortedRemaining.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs tracking-[4px] mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
                ─── MORE PRODUCTS ───
              </p>
              <h2 className="text-2xl md:text-3xl font-light tracking-wider" style={{ color: '#D4AF37' }}>
                更多商品
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sortedRemaining.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 區塊 10: 品牌社群 + 數據統計 ===== */}
      <ImageSection banner={banners.community_cta} />

      {/* ===== 區塊 11: 信任數字（CMS 驅動 + fallback） ===== */}
      <TrustNumbers data={trustNumbers} />

    </div>
  );
}
