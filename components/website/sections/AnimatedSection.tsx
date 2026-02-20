'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  children: React.ReactNode;
  theme: MotionThemeConfig;
  animation?: 'fade_up' | 'slide_left' | 'slide_right' | 'stagger' | 'none';
  delay?: number;
  className?: string;
}

export default function AnimatedSection({
  children, theme, animation = 'fade_up', delay = 0, className
}: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  // 無動畫模式
  if (!theme || theme.duration === 0) {
    return <div className={className}>{children}</div>;
  }

  const { duration, distance } = theme;

  const variants = {
    hidden: {
      opacity: 0,
      y: animation === 'fade_up' ? distance : 0,
      x: animation === 'slide_left' ? -distance * 2
       : animation === 'slide_right' ? distance * 2
       : 0,
    },
    visible: {
      opacity: 1, y: 0, x: 0,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1] as const  // 品牌曲線
      }
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}
