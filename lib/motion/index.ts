import { MOTION_THEMES, DEFAULT_THEME } from './themes';
import type { MotionThemeConfig } from './themes';

export type { MotionThemeConfig };
export { MOTION_THEMES, DEFAULT_THEME };

/**
 * 從 merchant_settings 讀取動態風格
 * 如果 DB 沒設定，fallback 到 DEFAULT_THEME
 */
export async function getMotionTheme(merchantCode?: string): Promise<MotionThemeConfig> {
  try {
    const { getMerchantSettings } = await import('@/lib/cms');
    const settings = await getMerchantSettings(merchantCode);
    const themeKey = settings?.settings?.motion_theme || DEFAULT_THEME;
    return MOTION_THEMES[themeKey] || MOTION_THEMES[DEFAULT_THEME];
  } catch {
    return MOTION_THEMES[DEFAULT_THEME];
  }
}

/**
 * 讀取啟用的降維特效列表
 */
export async function getMotionExtras(merchantCode?: string): Promise<string[]> {
  try {
    const { getMerchantSettings } = await import('@/lib/cms');
    const settings = await getMerchantSettings(merchantCode);
    return settings?.settings?.motion_extras || [];
  } catch {
    return [];
  }
}
