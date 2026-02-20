'use client';
import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import StaggerContainer, { StaggerItem } from './StaggerContainer';
import type { MotionThemeConfig } from '@/lib/motion/themes';

function AnimatedNumber({ target, suffix = '', duration = 1.2 }: {
  target: number; suffix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const start = Date.now();
    const step = () => {
      const elapsed = (Date.now() - start) / (duration * 1000);
      if (elapsed >= 1) { setCount(target); return; }
      // ease-out curve
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setCount(Math.floor(target * eased));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    items: Array<{ value: number; suffix?: string; label: string }>;
  } | null;
}

export default function TrustNumbersSection({ theme, data }: Props) {
  const items = data?.items || [
    { value: 9000, suffix: '+', label: '滿意顧客' },
    { value: 150000, suffix: '+', label: '累計銷量' },
    { value: 98, suffix: '%', label: '回購率' },
  ];

  return (
    <section
      className="py-16 md:py-24"
      style={{
        borderTop: '1px solid rgba(212,175,55,0.15)',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
        background: 'rgba(212,175,55,0.02)',
      }}
    >
      <StaggerContainer
        theme={theme}
        className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-8 text-center"
      >
        {items.map((item, i) => (
          <StaggerItem key={i} theme={theme}>
            <div className="text-3xl md:text-5xl font-light tracking-tight gold-text">
              <AnimatedNumber target={item.value} suffix={item.suffix} />
            </div>
            <div className="text-xs md:text-sm mt-2 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {item.label}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
