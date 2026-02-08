'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
}

export default function AnimatedSection({ children, className = '', delay = 0 }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [visible, setVisible] = useState(false);

  // 確保 SSR 時內容可見，hydration 後才啟用動畫
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  // SSR/未 hydrate 時顯示內容，hydrate 後才啟用進場動畫
  const showContent = !hasHydrated || visible;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(30px)',
        transition: hasHydrated ? 'opacity 0.8s ease, transform 0.8s ease' : 'none',
      }}
    >
      {children}
    </div>
  );
}
