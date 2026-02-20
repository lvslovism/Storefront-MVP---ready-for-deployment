'use client';

import { useEffect, useRef, useState } from 'react';

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // 手機版不顯示
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouch(true);
      return;
    }

    const handleMove = (e: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${e.clientX}px`;
      glowRef.current.style.top = `${e.clientY}px`;
      if (!visible) setVisible(true);
    };

    const handleLeave = () => setVisible(false);
    const handleEnter = () => setVisible(true);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
    };
  }, [visible]);

  if (isTouch) return null;

  return (
    <div
      ref={glowRef}
      style={{
        position: 'fixed',
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 50,
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.1s ease-out, top 0.1s ease-out, opacity 0.3s ease',
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
