import Image from 'next/image';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    items: Array<{ image_url: string; name: string }>;
  } | null;
}

export default function MarqueeSection({ theme, data }: Props) {
  if (!data?.items?.length) return null;

  // 複製一份以實現無縫循環
  const items = [...data.items, ...data.items];

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section className="py-12 overflow-hidden">
        <div className="flex animate-marquee w-max">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-8 grayscale opacity-50
                         hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={item.image_url}
                alt={item.name}
                width={100}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </section>
    </AnimatedSection>
  );
}
