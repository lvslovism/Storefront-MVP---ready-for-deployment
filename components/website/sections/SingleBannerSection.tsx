import Image from 'next/image';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  sectionKey: string;
  theme: MotionThemeConfig;
  data?: {
    title?: string;
    subtitle?: string;
    image_url: string;
    image_mobile_url?: string;
    link_url?: string;
    link_text?: string;
  } | null;
}

export default function SingleBannerSection({ sectionKey, theme, data }: Props) {
  if (!data?.image_url) return null;

  const isHero = sectionKey === 'hero';

  const content = (
    <div className="relative w-full aspect-[21/9] overflow-hidden">
      {/* 背景圖 + Ken Burns */}
      <Image
        src={data.image_url}
        alt={data.title || ''}
        fill
        className="object-cover animate-ken-burns"
        priority={isHero}
        sizes="100vw"
      />

      {/* 手機版圖片 */}
      {data.image_mobile_url && (
        <Image
          src={data.image_mobile_url}
          alt={data.title || ''}
          fill
          className="object-cover animate-ken-burns md:hidden"
          priority={isHero}
          sizes="100vw"
        />
      )}

      {/* 覆蓋層 */}
      {(data.title || data.link_text) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6 md:p-12">
          {data.title && (
            <h2 className="text-2xl md:text-4xl font-light text-white tracking-wider mb-2">
              {data.title}
            </h2>
          )}
          {data.subtitle && (
            <p className="text-sm md:text-base text-white/70 mb-4">
              {data.subtitle}
            </p>
          )}
          {data.link_text && data.link_url && (
            <Link
              href={data.link_url}
              className="inline-block px-6 py-2.5 text-black rounded-full
                         text-sm font-medium tracking-wider w-fit animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)' }}
            >
              {data.link_text}
            </Link>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section className="w-full">{content}</section>
    </AnimatedSection>
  );
}
