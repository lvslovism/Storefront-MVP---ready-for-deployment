import ProductCard from '@/components/ProductCard';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';
import type { PriceDisplayInfo } from '@/lib/price-display';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  priceDisplays?: Record<string, PriceDisplayInfo>;
  data?: {
    title?: string;
    subtitle?: string;
    products: any[];
    columns_mobile?: number;
    columns_desktop?: number;
    show_view_all?: boolean;
    view_all_text?: string;
    view_all_url?: string;
  } | null;
}

// 動態欄數 CSS class（不可用 Tailwind 動態字串拼接）
function getColumnClass(mobile: number, desktop: number): string {
  const mobileWidths: Record<number, string> = {
    1: 'w-[calc(100%-0px)]',
    2: 'w-[calc(50%-8px)]',
    3: 'w-[calc(33.333%-11px)]',
  };
  const desktopWidths: Record<number, string> = {
    2: 'lg:w-[calc(50%-12px)]',
    3: 'lg:w-[calc(33.333%-16px)]',
    4: 'lg:w-[calc(25%-18px)]',
    5: 'lg:w-[calc(20%-19px)]',
    6: 'lg:w-[calc(16.666%-20px)]',
  };
  return `${mobileWidths[mobile] || mobileWidths[2]} ${desktopWidths[desktop] || desktopWidths[4]}`;
}

export default function ProductWallSection({ theme, data, priceDisplays }: Props) {
  if (!data?.products?.length) return null;

  const colMobile = data.columns_mobile || 2;
  const colDesktop = data.columns_desktop || 4;

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section className="pt-6 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 標題 */}
          {data.title && (
            <div className="text-center mb-10">
              {data.subtitle && (
                <p className="text-xs tracking-[4px] mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  ─── {data.subtitle} ───
                </p>
              )}
              <h2 className="text-2xl md:text-3xl font-light tracking-wider" style={{ color: '#D4AF37' }}>
                {data.title}
              </h2>
            </div>
          )}

          {/* 商品網格 */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {data.products.map((product: any) => (
              <div
                key={product.id}
                className={getColumnClass(colMobile, colDesktop)}
                style={{ maxWidth: '300px' }}
              >
                <ProductCard product={product} priceDisplay={priceDisplays?.[product.id]} />
              </div>
            ))}
          </div>

          {/* 查看全部按鈕 */}
          {data.show_view_all && (
            <div className="text-center mt-10">
              <a
                href={data.view_all_url || '/products'}
                className="inline-block px-8 py-3 border text-sm tracking-wider transition-all duration-300"
                style={{
                  borderColor: '#D4AF37',
                  color: '#D4AF37',
                }}
              >
                {data.view_all_text || '查看全部商品'}
              </a>
            </div>
          )}
        </div>
      </section>
    </AnimatedSection>
  );
}
