// app/(website)/page.tsx
import { getProducts, getProductsByIds } from '@/lib/medusa';
import { getHomeBanners, getPageSeo, getGlobalSeo, DEFAULT_SEO, getFeaturedProductIds, getFeaturedPlacements, getSection, getProductSortOrder, getHomepageProductSettings, getPageLayout } from '@/lib/cms';
import { getProductPriceDisplays } from '@/lib/price-display';
import { getMotionTheme, getMotionExtras } from '@/lib/motion';
import ImageSection from '@/components/cms/ImageSection';
import AnimatedSection from '@/components/website/sections/AnimatedSection';
import FeaturedProductsSection from '@/components/website/sections/FeaturedProductsSection';
import TrustNumbersSection from '@/components/website/sections/TrustNumbersSection';
import ProductWallSection from '@/components/website/sections/ProductWallSection';
import FluidBackground from '@/components/website/effects/FluidBackground';
import type { Metadata } from 'next';
import type { PriceDisplayInfo } from '@/lib/price-display';

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
  // 讀取動畫主題 + 特效開關
  const [theme, motionExtras] = await Promise.all([
    getMotionTheme(),
    getMotionExtras(),
  ]);

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

  // ===== CMS 促銷展示價格 =====
  const allHomeProductIds = allProducts.map((p: any) => p.id);
  const priceDisplayMap = await getProductPriceDisplays(allHomeProductIds);
  // 轉為 Record（可序列化，傳給 client component）
  const priceDisplays: Record<string, PriceDisplayInfo> = {};
  priceDisplayMap.forEach((v, k) => { priceDisplays[k] = v; });

  // ===== 從 DB 讀取區塊順序 =====
  const layoutSections = await getPageLayout('home');

  // 預設順序（DB 讀不到時 fallback）— key = banner placement
  const DEFAULT_ORDER = [
    'hero_brand', 'membership_table', 'spring_promo', 'installment_info',
    'shopping_flow', 'featured', 'products', 'community_cta', 'trust',
  ];

  // 決定渲染順序：DB 驅動 or 預設
  const orderedKeys: string[] = layoutSections
    ? layoutSections
        .filter((s: any) => s.is_active !== false)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((s: any) => s.key)
    : DEFAULT_ORDER;

  // ===== 每個 section key 對應的渲染邏輯（key = banner placement）=====
  const SECTION_RENDERERS: Record<string, () => React.ReactNode> = {
    hero_brand: () => (
      <div className="relative">
        {motionExtras.includes('fluid_bg') && <FluidBackground />}
        <div className="relative z-10">
          <ImageSection
            banner={banners['hero_brand']}
            priority={true}
            hideWhenEmpty={false}
          />
        </div>
      </div>
    ),
    membership_table: () => (
      <AnimatedSection theme={theme} animation="fade_up">
        <ImageSection banner={banners['membership_table']} />
      </AnimatedSection>
    ),
    spring_promo: () => (
      <AnimatedSection theme={theme} animation="fade_up">
        <ImageSection banner={banners['spring_promo']} />
      </AnimatedSection>
    ),
    installment_info: () => (
      <AnimatedSection theme={theme} animation="fade_up">
        <ImageSection banner={banners['installment_info']} />
      </AnimatedSection>
    ),
    shopping_flow: () => (
      <AnimatedSection theme={theme} animation="fade_up">
        <ImageSection banner={banners['shopping_flow']} />
      </AnimatedSection>
    ),
    featured: () => (
      <FeaturedProductsSection
        theme={theme}
        tabs={tabs}
        fallbackProducts={fallbackProducts}
        showViewAll={homepageSettings.show_view_all_button}
        sectionTitle={homepageSettings.featured_title}
        sectionSubtitle={homepageSettings.featured_subtitle}
        priceDisplays={priceDisplays}
      />
    ),
    products: () => (
      homepageSettings.show_product_wall && displayProducts.length > 0 ? (
        <ProductWallSection
          theme={theme}
          priceDisplays={priceDisplays}
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
      ) : null
    ),
    community_cta: () => (
      <AnimatedSection theme={theme} animation="fade_up">
        <ImageSection banner={banners['community_cta']} />
      </AnimatedSection>
    ),
    trust: () => (
      <TrustNumbersSection theme={theme} data={trustNumbers} />
    ),
  };

  // ===== 按 DB 順序渲染 =====
  return (
    <div style={{ background: '#0a0a0a' }}>
      {orderedKeys.map(key => {
        const render = SECTION_RENDERERS[key];
        if (!render) return null;
        const content = render();
        if (!content) return null;
        return <div key={key}>{content}</div>;
      })}
    </div>
  );
}
