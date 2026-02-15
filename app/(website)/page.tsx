// app/(website)/page.tsx
import { getProducts, getProductsByIds } from '@/lib/medusa';
import { getHomeBanners, getPageSeo, getFeaturedProductIds, getFeaturedPlacements, getSection } from '@/lib/cms';
import ImageSection from '@/components/cms/ImageSection';
import FeaturedProducts from '@/components/cms/FeaturedProducts';
import TrustNumbers from '@/components/cms/TrustNumbers';
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
  // 並行請求：CMS 圖片 + CMS 推薦商品 placements + 信任數字
  const [banners, placements, trustNumbers] = await Promise.all([
    getHomeBanners(),
    getFeaturedPlacements(),
    getSection('home', 'trust_numbers'),
  ]);

  // 根據 CMS 資料決定商品區塊
  let tabs: { key: string; label: string; products: any[] }[] = [];
  let fallbackProducts: any[] = [];

  if (placements.length > 0) {
    // CMS 驅動模式：按 placement 分組取商品
    const tabResults = await Promise.all(
      placements.map(async (placement: string) => {
        const productIds = await getFeaturedProductIds(placement);
        const products = await getProductsByIds(productIds);
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
  }

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

      {/* ===== 區塊 10: 品牌社群 + 數據統計 ===== */}
      <ImageSection banner={banners.community_cta} />

      {/* ===== 區塊 11: 信任數字（CMS 驅動 + fallback） ===== */}
      <TrustNumbers data={trustNumbers} />

    </div>
  );
}
