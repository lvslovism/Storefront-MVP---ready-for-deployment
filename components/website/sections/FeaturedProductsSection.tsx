import FeaturedProducts from '@/components/cms/FeaturedProducts';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  tabs: { key: string; label: string; products: any[] }[];
  fallbackProducts?: any[];
  showViewAll?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

export default function FeaturedProductsSection({ theme, sectionKey, ...rest }: Props) {
  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <FeaturedProducts {...rest} />
    </AnimatedSection>
  );
}
