// app/(website)/page.tsx
import { getProducts, getProductsByIds } from '@/lib/medusa';
import { getHomeBanners, getPageSeo, getGlobalSeo, DEFAULT_SEO, getFeaturedProductIds, getFeaturedPlacements, getSection, getProductSortOrder, getHomepageProductSettings } from '@/lib/cms';
import { getMotionTheme } from '@/lib/motion';
import ImageSection from '@/components/cms/ImageSection';
import FeaturedProductsSection from '@/components/website/sections/FeaturedProductsSection';
import TrustNumbersSection from '@/components/website/sections/TrustNumbersSection';
import ProductWallSection from '@/components/website/sections/ProductWallSection';
import type { Metadata } from 'next';

export const revalidate = 3600; // ISR: 1 小時

// placement 對應的中文 Tab 名稱
const PLACEMENT_LABELS: Record<string, string> = {
  'home_featured': '精選推薦',
  'home_new': '新品上架',
  'home_hot': '熱銷排行',
  'category_top': '分類精選',
};

export async function generateMetadata(): Promise<Metadata> {
  const [pageSeo, globalSeo] = await Promise.all([
    getPageSeo('home'),
    getGlobalSeo(),
  ]);

  const brandName = globalSeo?.brand_name || DEFAULT_SEO.brand_name;

  const title = pageSeo?.meta_title
    || (globalSeo?.brand_tagline ? `${globalSeo.brand_tagline}｜${brandName}` : null)
    || DEFAULT_SEO.home.title;
  const description = pageSeo?.meta_description
    || globalSeo?.default_meta_description
    || DEFAULT_SEO.home.description;
  const ogImage = pageSeo?.og_image
    || globalSeo?.default_og_image
    || DEFAULT_SEO.default_og_image;

  return {
    title,
    description,
    openGraph: {
      title: pageSeo?.og_title || title,
      description,
      images: ogImage ? [ogImage] : undefined,
      siteName: brandName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageSeo?.og_title || title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function HomePage() {
  // 讀取動畫主題
  const theme = await getMotionTheme();

  // 並行請求：CMS 圖片 + placements + 信任數字 + 全部商品 + 排序 + 商品牆設定
  const [banners, placements, trustNumbers, allProductsResult, sortOrder, homepageSettings] = await Promise.all([
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
    // getHomepageProductSettings 內部已有 try-catch + 預設值 fallback
    // 不要在外層再加 .catch 回傳 show_product_wall:true — 會覆蓋 DB 設定的 false
    getHomepageProductSettings(),
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

  // ===== 商品牆：根據設定決定資料來源和排序 =====
  let wallProducts = homepageSettings.wall_source === 'exclude_featured'
    ? allProducts.filter((p: any) => !featuredProductIdSet.has(p.id))
    : [...allProducts];

  // 套用 CMS 排序
  if (sortOrder && sortOrder.length > 0) {
    const sortMap = new Map(
      sortOrder.map((s: any) => [s.product_id, { sort_order: s.sort_order, is_pinned: s.is_pinned }])
    );

    const withSort = wallProducts.filter((p: any) => sortMap.has(p.id));
    const withoutSort = wallProducts.filter((p: any) => !sortMap.has(p.id));

    withSort.sort((a: any, b: any) => {
      const sa = sortMap.get(a.id)!;
      const sb = sortMap.get(b.id)!;
      if (sa.is_pinned && !sb.is_pinned) return -1;
      if (!sa.is_pinned && sb.is_pinned) return 1;
      return sa.sort_order - sb.sort_order;
    });

    wallProducts = [...withSort, ...withoutSort];
  }

  // 數量上限
  const displayProducts = homepageSettings.wall_max_items > 0
    ? wallProducts.slice(0, homepageSettings.wall_max_items)
    : wallProducts;

  console.log('[Home] All products:', allProducts.length, 'Featured:', featuredProductIdSet.size, 'Wall:', displayProducts.length, 'Show wall:', homepageSettings.show_product_wall);

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
      <FeaturedProductsSection
        theme={theme}
        tabs={tabs}
        fallbackProducts={fallbackProducts}
        showViewAll={homepageSettings.show_view_all_button}
        sectionTitle={homepageSettings.featured_title}
        sectionSubtitle={homepageSettings.featured_subtitle}
      />

      {/* ===== 區塊 9: 商品牆 — 由 CMS 設定控制 ===== */}
      {homepageSettings.show_product_wall && displayProducts.length > 0 && (
        <ProductWallSection
          theme={theme}
          data={{
            title: homepageSettings.wall_title,
            subtitle: homepageSettings.wall_subtitle,
            products: displayProducts,
            columns_mobile: homepageSettings.wall_columns_mobile,
            columns_desktop: homepageSettings.wall_columns_desktop,
            show_view_all: homepageSettings.show_view_all_button,
            view_all_text: homepageSettings.view_all_text,
            view_all_url: homepageSettings.view_all_url,
          }}
        />
      )}

      {/* ===== 區塊 10: 品牌社群 + 數據統計 ===== */}
      <ImageSection banner={banners.community_cta} />

      {/* ===== 區塊 11: 信任數字（CMS 驅動 + fallback + 動畫） ===== */}
      <TrustNumbersSection theme={theme} data={trustNumbers} />

    </div>
  );
}
