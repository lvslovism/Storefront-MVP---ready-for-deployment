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
    body: string;
    image_url: string;
    image_alt?: string;
    image_position?: 'left' | 'right';
    cta_text?: string;
    cta_link?: string;
  } | null;
}

export default function ImageTextSection({ theme, data }: Props) {
  if (!data?.image_url || !data?.title) return null;

  const imagePosition = data.image_position || 'left';
  const animation = imagePosition === 'left' ? 'slide_right' : 'slide_left';

  const imageBlock = (
    <div className="relative w-full aspect-[4/3] md:aspect-square overflow-hidden rounded-lg">
      <Image
        src={data.image_url}
        alt={data.image_alt || data.title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );

  const textBlock = (
    <div className="flex flex-col justify-center py-4 md:py-0">
      {data.subtitle && (
        <p className="text-xs tracking-[4px] mb-3 uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
          {data.subtitle}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl font-light tracking-wider mb-4 gold-text">
        {data.title}
      </h2>
      <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {data.body}
      </p>
      {data.cta_text && data.cta_link && (
        <Link
          href={data.cta_link}
          className="inline-block px-6 py-2.5 border text-sm tracking-wider
                     transition-all duration-300 w-fit rounded-full"
          style={{
            borderColor: 'rgba(212,175,55,0.5)',
            color: '#D4AF37',
          }}
        >
          {data.cta_text}
        </Link>
      )}
    </div>
  );

  return (
    <AnimatedSection theme={theme} animation={animation}>
      <section className="py-16 md:py-24 px-4">
        <div className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center ${
          imagePosition === 'right' ? 'md:[direction:rtl] md:[&>*]:[direction:ltr]' : ''
        }`}>
          {imagePosition === 'left' ? (
            <>
              {imageBlock}
              {textBlock}
            </>
          ) : (
            <>
              {textBlock}
              {imageBlock}
            </>
          )}
        </div>
      </section>
    </AnimatedSection>
  );
}
