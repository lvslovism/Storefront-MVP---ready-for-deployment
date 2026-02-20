export interface MotionThemeConfig {
  duration: number;     // 進場動畫時長（秒）
  distance: number;     // fade_up 距離（px）
  stagger: number;      // stagger 間隔（秒）
  ease: string;         // ease 曲線名稱
  intensity: 'none' | 'light' | 'standard' | 'full';
}

export const MOTION_THEMES: Record<string, MotionThemeConfig> = {
  elegant: {
    duration: 0.6, distance: 20, stagger: 0.12,
    ease: 'ease-out', intensity: 'standard',
  },
  energetic: {
    duration: 0.3, distance: 40, stagger: 0.06,
    ease: 'spring', intensity: 'standard',
  },
  minimal: {
    duration: 0.4, distance: 15, stagger: 0.08,
    ease: 'linear', intensity: 'light',
  },
  dramatic: {
    duration: 0.8, distance: 50, stagger: 0.15,
    ease: 'dramatic', intensity: 'full',
  },
  none: {
    duration: 0, distance: 0, stagger: 0,
    ease: 'none', intensity: 'none',
  },
};

// 預設主題（MINJIE 用 elegant）
export const DEFAULT_THEME = 'elegant';
