import FeaturedProducts from '@/components/cms/FeaturedProducts';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';
import type { PriceDisplayInfo } from '@/lib/price-display';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  tabs: { key: string; label: string; products: any[] }[];
  fallbackProducts?: any[];
  showViewAll?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
  priceDisplays?: Record<string, PriceDisplayInfo>;
}

export default function FeaturedProductsSection({ theme, sectionKey, ...rest }: Props) {
  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <FeaturedProducts {...rest} />
    </AnimatedSection>
  );
}
