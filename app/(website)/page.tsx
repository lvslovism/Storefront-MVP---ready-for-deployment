// app/(website)/page.tsx
import { getProducts } from '@/lib/medusa';
import { getHomeBanners } from '@/lib/cms';
import ImageSection from '@/components/cms/ImageSection';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';

export const revalidate = 3600; // ISR: 1 小時

export default async function HomePage() {
  // 並行請求：CMS 圖片 + Medusa 商品
  const [banners, productsData] = await Promise.all([
    getHomeBanners(),
    getProducts({ limit: 50 }),
  ]);

  const products = productsData.products;

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

      {/* ===== 區塊 8: 商品分類標題 ===== */}
      <section className="py-16 px-5">
        <SectionTitle subtitle="PRODUCTS" title="商品選單" />

        {/* TODO: 分類 Tabs（接 Medusa Collections） */}

        {/* 商品網格 */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ===== 區塊 10: 品牌社群 + 數據統計 ===== */}
      <ImageSection banner={banners.community_cta} />

    </div>
  );
}
