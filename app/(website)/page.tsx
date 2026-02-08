import { getProducts } from '@/lib/medusa';
import { getAllSections, getBanners, getCampaigns } from '@/lib/cms';
import HeroBanner from '@/components/cms/HeroBanner';
import TrustNumbers from '@/components/cms/TrustNumbers';
import PaymentLogos from '@/components/cms/PaymentLogos';
import CampaignSection from '@/components/cms/CampaignSection';
import BrandStory from '@/components/cms/BrandStory';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60; // ISR: 每 60 秒重新驗證 CMS 資料

export default async function HomePage() {
  // 並行查詢 CMS + Medusa
  const [banners, sections, campaigns, productsData] = await Promise.all([
    getBanners('hero'),
    getAllSections('home'),
    getCampaigns(),
    getProducts({ limit: 50 }),
  ]);

  const featured = productsData.products.slice(0, 6);

  return (
    <>
      {/* Hero Banner（CMS） */}
      <HeroBanner banners={banners} />

      {/* 信任數字（CMS） */}
      <TrustNumbers data={sections.trust_numbers} />

      {/* 促銷活動（CMS） */}
      <CampaignSection campaigns={campaigns} />

      {/* 熱銷推薦（Medusa 商品） */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <SectionTitle subtitle="BEST SELLERS" title="熱銷推薦" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="/products" className="btn-gold-outline">查看全部商品 →</a>
        </div>
      </section>

      {/* 品牌故事（CMS） */}
      <BrandStory data={sections.brand_story} />

      {/* 會員福利（保留原有，之後 CMS 化） */}
      <section id="membership" style={{
        background: 'linear-gradient(180deg, rgba(212,175,55,0.05), transparent)',
        borderTop: '1px solid rgba(212,175,55,0.1)',
      }}>
        <div className="max-w-7xl mx-auto px-5 py-16 text-center">
          <SectionTitle subtitle="MEMBERSHIP" title="加入 LINE 享會員福利" />
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            消費 100 元 = 送 1 點 ｜ 生日禮金 ｜ 專屬優惠 ｜ 新品搶先看
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { tier: '一般會員', spend: '加入即享', gift: '$100', clr: 'rgba(255,255,255,0.6)' },
              { tier: '銀卡會員', spend: '累計 $3,000', gift: '$200', clr: '#C0C0C0' },
              { tier: '金卡會員', spend: '累計 $10,000', gift: '$500', clr: '#D4AF37' },
              { tier: 'VIP 會員', spend: '累計 $30,000', gift: '$2,000', clr: '#FFD700' },
            ].map((m) => (
              <div key={m.tier} className="p-5 rounded-xl"
                style={{ border: `1px solid ${m.clr}33`, background: 'rgba(255,255,255,0.02)' }}>
                <div className="text-sm font-semibold mb-2" style={{ color: m.clr }}>{m.tier}</div>
                <div className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.spend}</div>
                <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>生日禮金</div>
                <div className="text-xl font-bold" style={{ color: m.clr }}>{m.gift}</div>
              </div>
            ))}
          </div>
          <a href="https://lin.ee/Ro3Fd4p" className="btn-line">📱 加入 LINE 官方帳號</a>
        </div>
      </section>

      {/* 付款方式（CMS） */}
      <PaymentLogos data={sections.payment_logos} />
    </>
  );
}
