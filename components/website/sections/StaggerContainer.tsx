'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  children: React.ReactNode;
  theme: MotionThemeConfig;
  className?: string;
}

export default function StaggerContainer({ children, theme, className }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  if (!theme || theme.duration === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: theme.stagger } }
      }}
    >
      {children}
    </motion.div>
  );
}

// 子元素用這個
export function StaggerItem({ children, theme, className }: Props) {
  if (!theme || theme.duration === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: theme.distance },
        visible: {
          opacity: 1, y: 0,
          transition: { duration: theme.duration, ease: [0.25, 0.1, 0.25, 1] as const }
        }
      }}
    >
      {children}
    </motion.div>
  );
}
