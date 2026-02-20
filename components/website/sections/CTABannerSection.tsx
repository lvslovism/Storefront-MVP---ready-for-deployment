import Image from 'next/image';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    title: string;
    subtitle?: string;
    background_image: string;
    cta_text: string;
    cta_link: string;
    overlay_opacity?: number;
  } | null;
}

export default function CTABannerSection({ theme, data }: Props) {
  if (!data?.background_image || !data?.title) return null;

  const overlayOpacity = data.overlay_opacity ?? 0.6;

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section className="relative w-full py-24 md:py-32 overflow-hidden">
        {/* 背景圖 + Ken Burns */}
        <Image
          src={data.background_image}
          alt=""
          fill
          className="object-cover animate-ken-burns"
          sizes="100vw"
        />

        {/* 半透明覆蓋層 */}
        <div
          className="absolute inset-0"
          style={{ background: `rgba(0,0,0,${overlayOpacity})` }}
        />

        {/* 內容 */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          {data.subtitle && (
            <p className="text-xs tracking-[4px] mb-4 uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
              {data.subtitle}
            </p>
          )}
          <h2 className="text-3xl md:text-5xl font-light tracking-wider mb-6 gold-text">
            {data.title}
          </h2>
          {data.cta_text && data.cta_link && (
            <Link
              href={data.cta_link}
              className="inline-block px-8 py-3 text-black rounded-full
                         text-sm font-medium tracking-wider animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)' }}
            >
              {data.cta_text}
            </Link>
          )}
        </div>
      </section>
    </AnimatedSection>
  );
}
