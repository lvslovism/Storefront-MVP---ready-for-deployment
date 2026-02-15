'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

export interface PopupAnnouncement {
  id: string;
  title?: string | null;
  content?: string | null;
  type?: 'info' | 'promo' | 'warning' | 'urgent';
  announcement_type?: 'info' | 'promo' | 'warning' | 'urgent';
  link_url?: string | null;
  link_text?: string | null;
  font_size?: string | null;
  font_weight?: string | null;
  popup_image_url?: string | null;
  popup_delay_seconds?: number | null;
  show_frequency?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
}

interface PopupModalProps {
  announcement: PopupAnnouncement;
}

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

function getStorageKey(id: string) {
  return `popup_dismissed_${id}`;
}

function shouldShow(announcement: PopupAnnouncement): boolean {
  // Don't show empty popups
  const hasTitle = !!announcement.title;
  const hasImage = !!announcement.popup_image_url;
  if (!hasTitle && !hasImage) return false;

  const freq = announcement.show_frequency || 'every_visit';
  const key = getStorageKey(announcement.id);

  if (freq === 'every_visit') return true;

  if (freq === 'once_per_session') {
    try {
      return !sessionStorage.getItem(key);
    } catch {
      return true;
    }
  }

  // once_per_day or once_per_week
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return true;
    const ts = parseInt(stored, 10);
    if (isNaN(ts)) return true;
    const now = Date.now();
    const maxAge = freq === 'once_per_day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return now - ts > maxAge;
  } catch {
    return true;
  }
}

function markDismissed(announcement: PopupAnnouncement) {
  const freq = announcement.show_frequency || 'every_visit';
  const key = getStorageKey(announcement.id);

  if (freq === 'once_per_session') {
    try { sessionStorage.setItem(key, '1'); } catch {}
  } else if (freq === 'once_per_day' || freq === 'once_per_week') {
    try { localStorage.setItem(key, String(Date.now())); } catch {}
  }
}

export default function PopupModal({ announcement }: PopupModalProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shouldShow(announcement)) return;

    const delay = (announcement.popup_delay_seconds ?? 3) * 1000;
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [announcement]);

  const close = useCallback(() => {
    setClosing(true);
    markDismissed(announcement);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 200);
  }, [announcement]);

  if (!visible) return null;

  const bg = announcement.bg_color || '#1a1a2e';
  const text = announcement.text_color || '#ffffff';
  const fSize = fontSizeMap[announcement.font_size || ''] || 'text-lg';
  const fWeight = fontWeightMap[announcement.font_weight || ''] || 'font-bold';
  const hasImage = !!announcement.popup_image_url;
  const hasTitle = !!announcement.title;
  const hasContent = !!announcement.content;
  const hasText = hasTitle || hasContent;
  const hasLink = !!announcement.link_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{ opacity: closing ? 0 : 1, transition: 'opacity 200ms ease-out' }}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: bg,
          color: text,
          transform: closing ? 'scale(0.95)' : 'scale(1)',
          opacity: closing ? 0 : 1,
          transition: closing ? 'all 200ms ease-out' : 'all 300ms ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="關閉"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image — object-contain, no cropping */}
        {hasImage && (
          <div className="w-full">
            <img
              src={announcement.popup_image_url!}
              alt={announcement.title || ''}
              className="w-full h-auto object-contain"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {/* Text area — only when title or content exist */}
        {hasText && (
          <div className="p-6">
            {hasTitle && (
              <h3 className={`${fSize} ${fWeight} mb-2`}>
                {announcement.title}
              </h3>
            )}
            {hasContent && (
              <p className="text-sm opacity-80">
                {announcement.content}
              </p>
            )}
          </div>
        )}

        {/* CTA Button */}
        {hasLink && (
          <div className={hasText ? 'px-6 pb-6' : 'p-6'}>
            <Link
              href={announcement.link_url!}
              onClick={close}
              className="block w-full text-center py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{
                backgroundColor: '#D4AF37',
                color: '#000000',
              }}
            >
              {announcement.link_text || '了解更多'}
            </Link>
          </div>
        )}

        {/* Image-only: small bottom padding */}
        {!hasText && !hasLink && hasImage && (
          <div className="h-2" />
        )}
      </div>
    </div>
  );
}
