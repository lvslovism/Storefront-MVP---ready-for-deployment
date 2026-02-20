'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    title: string;
    subtitle?: string;
    target_date: string;
    cta_text?: string;
    cta_link?: string;
    background_image?: string;
  } | null;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: string): TimeLeft | null {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownSection({ theme, data }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [expired, setExpired] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!data?.target_date) return;

    setMounted(true);
    const update = () => {
      const tl = calcTimeLeft(data.target_date);
      if (tl) {
        setTimeLeft(tl);
      } else {
        setExpired(true);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [data?.target_date]);

  if (!data?.title) return null;

  const units = [
    { label: '天', value: timeLeft?.days ?? 0 },
    { label: '時', value: timeLeft?.hours ?? 0 },
    { label: '分', value: timeLeft?.minutes ?? 0 },
    { label: '秒', value: timeLeft?.seconds ?? 0 },
  ];

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* 背景圖（可選） */}
        {data.background_image && (
          <>
            <Image
              src={data.background_image}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/70" />
          </>
        )}

        {/* 內容 */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          {data.subtitle && (
            <p className="text-xs tracking-[4px] mb-4 uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
              {data.subtitle}
            </p>
          )}
          <h2 className="text-2xl md:text-4xl font-light tracking-wider mb-10 gold-text">
            {data.title}
          </h2>

          {/* 倒數計時 */}
          {mounted && (
            expired ? (
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>
                活動已結束
              </p>
            ) : (
              <div className="flex justify-center gap-3 md:gap-5 mb-10">
                {units.map((unit) => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center
                                 bg-zinc-900 border border-zinc-800 rounded-lg"
                    >
                      <span className="text-2xl md:text-3xl font-light gold-text tabular-nums">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* CTA */}
          {!expired && data.cta_text && data.cta_link && (
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
