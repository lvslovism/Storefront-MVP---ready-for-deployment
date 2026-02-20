'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** 偏移強度（px），預設 5 */
  intensity?: number;
}

export default function MagneticText({ children, className, intensity = 5 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('translate(0px, 0px)');
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [isTouch, setIsTouch] = useState(false);

  // SSR-safe 觸控偵測，避免 hydration mismatch
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouch(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) / rect.width * intensity;
    const deltaY = (e.clientY - centerY) / rect.height * intensity;
    setTransform(`translate(${deltaX}px, ${deltaY}px)`);
    setGlowOpacity(0.3);
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    setTransform('translate(0px, 0px)');
    setGlowOpacity(0);
  }, []);

  // 手機版：不加任何事件，直接渲染 children
  if (isTouch) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: 'transform 0.3s ease-out, filter 0.3s ease-out',
        filter: `drop-shadow(0 0 ${glowOpacity * 20}px rgba(212,175,55,${glowOpacity}))`,
      }}
    >
      {children}
    </div>
  );
}
