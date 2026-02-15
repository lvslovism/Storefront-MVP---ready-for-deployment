'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  type?: 'info' | 'promo' | 'warning' | 'urgent';
  announcement_type?: 'info' | 'promo' | 'warning' | 'urgent';
  link_url?: string | null;
  link_text?: string | null;
  font_size?: string | null;
  font_weight?: string | null;
  display_mode?: string | null;
  marquee_duration?: number | null;
  bg_color?: string | null;
  text_color?: string | null;
  sort_order?: number;
}

interface AnnouncementBarProps {
  announcements: Announcement[];
}

type AnnouncementType = 'info' | 'promo' | 'warning' | 'urgent';

const typeDefaults: Record<AnnouncementType, {
  bg: string;
  text: string;
  border: string;
  closeHover: string;
}> = {
  info: {
    bg: 'transparent',
    text: '#D4AF37',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    closeHover: 'rgba(212, 175, 55, 0.3)',
  },
  promo: {
    bg: '#D4AF37',
    text: '#000000',
    border: '1px solid #D4AF37',
    closeHover: 'rgba(0, 0, 0, 0.15)',
  },
  warning: {
    bg: 'rgba(127, 29, 29, 0.3)',
    text: '#FCA5A5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    closeHover: 'rgba(239, 68, 68, 0.2)',
  },
  urgent: {
    bg: '#DC2626',
    text: '#FFFFFF',
    border: '1px solid #DC2626',
    closeHover: 'rgba(255, 255, 255, 0.2)',
  },
};

const fontSizeMap: Record<string, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const fontWeightMap: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
};

function getType(a: Announcement): AnnouncementType {
  return a.type || a.announcement_type || 'info';
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

export default function AnnouncementBar({ announcements }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = useIsMobile();

  const count = announcements.length;

  // Separate by display_mode
  const staticAnnouncements = announcements.filter(
    (a) => !a.display_mode || a.display_mode === 'static'
  );
  const marqueeAnnouncements = announcements.filter(
    (a) => a.display_mode === 'marquee'
  );

  // For static rotation (also used as marquee fallback on mobile)
  const rotatingAnnouncements =
    marqueeAnnouncements.length > 0 && isMobile
      ? [...staticAnnouncements, ...marqueeAnnouncements]
      : staticAnnouncements;

  const rotatingCount = rotatingAnnouncements.length;

  // Auto-rotate static announcements every 5s
  useEffect(() => {
    if (rotatingCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rotatingCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [rotatingCount]);

  // Reset index if it goes out of bounds
  useEffect(() => {
    if (currentIndex >= rotatingCount) setCurrentIndex(0);
  }, [rotatingCount, currentIndex]);

  if (count === 0 || dismissed) return null;

  const showMarquee = marqueeAnnouncements.length > 0 && !isMobile;

  // Determine style from the first announcement (for bar-level colors)
  const firstAnn = announcements[0];
  const firstType = getType(firstAnn);
  const defaults = typeDefaults[firstType] || typeDefaults.info;

  const barBg = firstAnn.bg_color || defaults.bg;
  const barText = firstAnn.text_color || defaults.text;
  const barBorder = defaults.border;
  const barCloseHover = defaults.closeHover;

  return (
    <div
      className="relative w-full py-2.5 px-10 text-center transition-colors duration-300 overflow-hidden"
      style={{
        background: barBg,
        color: barText,
        borderBottom: barBorder,
      }}
    >
      {/* Static / rotating section */}
      {rotatingCount > 0 && (
        <StaticContent
          announcements={rotatingAnnouncements}
          currentIndex={currentIndex}
          onDotClick={setCurrentIndex}
          textColor={barText}
        />
      )}

      {/* Marquee section (desktop only) */}
      {showMarquee && (
        <MarqueeContent announcements={marqueeAnnouncements} />
      )}

      {/* Carousel dots for rotating */}
      {rotatingCount > 1 && !showMarquee && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          {rotatingAnnouncements.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="w-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: barText,
                opacity: i === currentIndex ? 1 : 0.3,
                transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
              }}
              aria-label={`公告 ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-colors z-10"
        style={{ color: barText }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = barCloseHover;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
        aria-label="關閉公告"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Static / Rotating Content ─── */

function StaticContent({
  announcements,
  currentIndex,
  onDotClick,
  textColor,
}: {
  announcements: Announcement[];
  currentIndex: number;
  onDotClick: (i: number) => void;
  textColor: string;
}) {
  if (announcements.length === 0) return null;
  const current = announcements[currentIndex] || announcements[0];
  const type = getType(current);
  const defaults = typeDefaults[type];

  const bg = current.bg_color || defaults.bg;
  const text = current.text_color || defaults.text;
  const fSize = fontSizeMap[current.font_size || ''] || 'text-xs sm:text-sm';
  const fWeight = fontWeightMap[current.font_weight || ''] || '';

  const inner = (
    <span className={`flex items-center justify-center gap-2 tracking-wide ${fSize} ${fWeight}`} style={{ color: text }}>
      <span className="font-medium">{current.title}</span>
      {current.content && (
        <>
          <span style={{ opacity: 0.5 }}>—</span>
          <span style={{ opacity: 0.85 }}>{current.content}</span>
        </>
      )}
      {current.link_url && (
        <span className="underline underline-offset-2 ml-1 font-medium">
          {current.link_text || '了解更多'}
        </span>
      )}
    </span>
  );

  return current.link_url ? (
    <Link href={current.link_url} className="block hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

/* ─── Marquee Content ─── */

function MarqueeContent({ announcements }: { announcements: Announcement[] }) {
  // Build a single string of all marquee announcements
  const duration = announcements[0]?.marquee_duration || 15;
  const type = getType(announcements[0]);
  const defaults = typeDefaults[type];
  const text = announcements[0]?.text_color || defaults.text;
  const fSize = fontSizeMap[announcements[0]?.font_size || ''] || 'text-sm';
  const fWeight = fontWeightMap[announcements[0]?.font_weight || ''] || '';

  const items = announcements.map((a) => {
    let str = a.title;
    if (a.content) str += ` — ${a.content}`;
    if (a.link_url && a.link_text) str += ` ${a.link_text}`;
    else if (a.link_url) str += ` 了解更多`;
    return { text: str, link_url: a.link_url };
  });

  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div
        className={`inline-block ${fSize} ${fWeight} tracking-wide`}
        style={{
          color: text,
          animation: `marquee ${duration}s linear infinite`,
        }}
      >
        {items.map((item, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-3">★</span>}
            {item.link_url ? (
              <Link
                href={item.link_url}
                className="hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {item.text}
              </Link>
            ) : (
              <span>{item.text}</span>
            )}
          </span>
        ))}
      </div>

      {/* CSS keyframes injected inline */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
