'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Slide {
  image_url: string;
  image_mobile_url?: string;
  title?: string;
  subtitle?: string;
  link_url?: string;
  link_text?: string;
}

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    slides: Slide[];
    interval?: number;
  } | null;
}

export default function CarouselSection({ theme, data }: Props) {
  const slides = data?.slides;
  const interval = data?.interval || 5000;

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slideCount = slides?.length || 0;

  const goNext = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrent((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  // 自動輪播
  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    const timer = setInterval(goNext, interval);
    return () => clearInterval(timer);
  }, [isPaused, slideCount, interval, goNext]);

  if (!slides || slides.length === 0) return null;

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="relative w-full flex-shrink-0 aspect-[21/9]">
              <Image
                src={slide.image_url}
                alt={slide.title || `Slide ${i + 1}`}
                fill
                className="object-cover animate-ken-burns"
                sizes="100vw"
                priority={i === 0}
              />

              {/* 覆蓋層 */}
              {(slide.title || slide.link_text) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6 md:p-12">
                  {slide.title && (
                    <h2 className="text-2xl md:text-4xl font-light text-white tracking-wider mb-2">
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle && (
                    <p className="text-sm md:text-base text-white/70 mb-4">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.link_text && slide.link_url && (
                    <Link
                      href={slide.link_url}
                      className="inline-block px-6 py-2.5 text-black rounded-full
                                 text-sm font-medium tracking-wider w-fit"
                      style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)' }}
                    >
                      {slide.link_text}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 左右箭頭 */}
        {slideCount > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                         bg-black/40 backdrop-blur-sm flex items-center justify-center
                         text-white/80 hover:text-white hover:bg-black/60
                         transition-all duration-200 z-10"
              aria-label="上一張"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                         bg-black/40 backdrop-blur-sm flex items-center justify-center
                         text-white/80 hover:text-white hover:bg-black/60
                         transition-all duration-200 z-10"
              aria-label="下一張"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* 圓點指示器 */}
        {slideCount > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 bg-white'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`前往第 ${i + 1} 張`}
              />
            ))}
          </div>
        )}
      </section>
    </AnimatedSection>
  );
}
