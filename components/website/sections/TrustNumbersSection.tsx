'use client';
import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import StaggerContainer, { StaggerItem } from './StaggerContainer';
import type { MotionThemeConfig } from '@/lib/motion/themes';

function AnimatedNumber({ target, suffix = '', duration = 1.2 }: {
  target: number; suffix?: string; duration?: number;
}) {
  const safeTarget = typeof target === 'number' && !isNaN(target) ? target : 0;
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || safeTarget === 0) return;
    const start = Date.now();
    const step = () => {
      const elapsed = (Date.now() - start) / (duration * 1000);
      if (elapsed >= 1) { setCount(safeTarget); return; }
      // ease-out curve
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setCount(Math.floor(safeTarget * eased));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, safeTarget, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

interface ParsedItem {
  value: number;
  suffix: string;
  label: string;
}

// 解析 CMS 的 number 字串格式（如 "900+", "689萬", "19K+", "95%"）
function parseNumberString(num: string): { value: number; suffix: string } {
  if (!num) return { value: 0, suffix: '' };
  // 移除千分位逗號
  const cleaned = num.replace(/,/g, '');
  // 匹配數字部分 + 後綴
  const match = cleaned.match(/^([\d.]+)\s*(.*)$/);
  if (!match) return { value: 0, suffix: num };
  let value = parseFloat(match[1]);
  let suffix = match[2] || '';
  // 處理 K/M 等英文縮寫
  if (suffix.startsWith('K') || suffix.startsWith('k')) {
    value = value * 1000;
    suffix = suffix.slice(1) || '+';
  } else if (suffix.startsWith('M') || suffix.startsWith('m')) {
    value = value * 1000000;
    suffix = suffix.slice(1) || '+';
  }
  return { value: Math.round(value), suffix };
}

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    items: Array<{
      value?: number; suffix?: string; label: string;
      number?: string;  // CMS 舊格式相容
    }>;
  } | null;
}

export default function TrustNumbersSection({ theme, data }: Props) {
  const DEFAULT_ITEMS: ParsedItem[] = [
    { value: 9000, suffix: '+', label: '滿意顧客' },
    { value: 150000, suffix: '+', label: '累計銷量' },
    { value: 98, suffix: '%', label: '回購率' },
  ];

  // 解析 CMS 資料，相容 { number: string } 和 { value: number } 兩種格式
  const items: ParsedItem[] = data?.items
    ? data.items.map(item => {
        // 新格式：已有 value
        if (typeof item.value === 'number') {
          return { value: item.value, suffix: item.suffix || '', label: item.label };
        }
        // 舊格式：從 number 字串解析
        if (item.number) {
          const parsed = parseNumberString(item.number);
          return { ...parsed, label: item.label };
        }
        return { value: 0, suffix: '', label: item.label };
      })
    : DEFAULT_ITEMS;

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
        className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center"
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
