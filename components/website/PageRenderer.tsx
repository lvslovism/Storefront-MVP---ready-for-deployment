import type { MotionThemeConfig } from '@/lib/motion/themes';
import {
  SingleBannerSection,
  CarouselSection,
  DuoBannerSection,
  GridBannerSection,
  ImageTextSection,
  VideoSection,
  CTABannerSection,
  CardRowSection,
  MarqueeSection,
  CountdownSection,
  FeaturedProductsSection,
  ProductWallSection,
  TrustNumbersSection,
} from './sections';

interface SectionConfig {
  key: string;
  type: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  sections: SectionConfig[];
  theme: MotionThemeConfig;
  sectionData: Record<string, any>;
}

const COMPONENTS: Record<string, React.ComponentType<any>> = {
  single: SingleBannerSection,
  carousel: CarouselSection,
  duo: DuoBannerSection,
  grid: GridBannerSection,
  image_text: ImageTextSection,
  video: VideoSection,
  cta_banner: CTABannerSection,
  card_row: CardRowSection,
  marquee: MarqueeSection,
  countdown: CountdownSection,
  featured: FeaturedProductsSection,
  product_wall: ProductWallSection,
  trust: TrustNumbersSection,
};

export default function PageRenderer({ sections, theme, sectionData }: Props) {
  const activeSections = sections
    .filter(s => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main>
      {activeSections.map(section => {
        const Component = COMPONENTS[section.type];
        if (!Component) return null;

        const data = sectionData[section.key];

        return (
          <Component
            key={section.key}
            sectionKey={section.key}
            theme={theme}
            {...(typeof data === 'object' && data !== null && !Array.isArray(data)
              ? data
              : { data }
            )}
          />
        );
      })}
    </main>
  );
}
