'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: 'info' | 'promo' | 'warning' | 'urgent';
  link_url: string | null;
  link_text: string | null;
  sort_order: number;
}

interface AnnouncementBarProps {
  announcements: Announcement[];
}

const typeStyles: Record<Announcement['announcement_type'], {
  bg: string;
  text: string;
  border: string;
  closeHover: string;
}> = {
  info: {
    bg: 'rgba(10, 10, 10, 0.95)',
    text: 'rgba(212, 175, 55, 0.9)',
    border: '1px solid rgba(212, 175, 55, 0.4)',
    closeHover: 'rgba(212, 175, 55, 0.3)',
  },
  promo: {
    bg: 'rgba(212, 175, 55, 0.95)',
    text: '#0a0a0a',
    border: 'none',
    closeHover: 'rgba(0, 0, 0, 0.15)',
  },
  warning: {
    bg: 'rgba(30, 10, 10, 0.95)',
    text: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    closeHover: 'rgba(239, 68, 68, 0.2)',
  },
  urgent: {
    bg: '#dc2626',
    text: '#ffffff',
    border: 'none',
    closeHover: 'rgba(255, 255, 255, 0.2)',
  },
};

export default function AnnouncementBar({ announcements }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const count = announcements.length;

  // 自動輪播（5 秒）
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 5000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0 || dismissed) return null;

  const current = announcements[currentIndex];
  const style = typeStyles[current.announcement_type] || typeStyles.info;

  const content = (
    <span className="flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wide">
      <span className="font-medium">{current.title}</span>
      {current.content && (
        <>
          <span style={{ opacity: 0.5 }}>—</span>
          <span style={{ opacity: 0.85 }}>{current.content}</span>
        </>
      )}
      {current.link_url && current.link_text && (
        <span className="underline underline-offset-2 ml-1 font-medium">
          {current.link_text}
        </span>
      )}
    </span>
  );

  return (
    <div
      className="relative w-full py-2.5 px-10 text-center transition-colors duration-300"
      style={{
        background: style.bg,
        color: style.text,
        borderBottom: style.border,
      }}
    >
      {/* 公告內容 */}
      {current.link_url ? (
        <Link href={current.link_url} className="block hover:opacity-80 transition-opacity">
          {content}
        </Link>
      ) : (
        <div>{content}</div>
      )}

      {/* 輪播指示器 */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          {announcements.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="w-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: style.text,
                opacity: i === currentIndex ? 1 : 0.3,
                transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
              }}
              aria-label={`公告 ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* 關閉按鈕 */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
        style={{ color: style.text }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = style.closeHover;
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
