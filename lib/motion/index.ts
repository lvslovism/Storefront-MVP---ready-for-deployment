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

/** DB 讀不到時的預設特效清單 */
const DEFAULT_EXTRAS = ['fluid_bg', 'cursor_glow'];

/**
 * 讀取啟用的降維特效列表
 * DB 沒設定時 fallback 到 DEFAULT_EXTRAS
 */
export async function getMotionExtras(merchantCode?: string): Promise<string[]> {
  try {
    const { getMerchantSettings } = await import('@/lib/cms');
    const settings = await getMerchantSettings(merchantCode);
    // 若 motion_extras 欄位存在（含空陣列）就用 DB 值，否則用預設
    const extras = settings?.settings?.motion_extras;
    return Array.isArray(extras) ? extras : DEFAULT_EXTRAS;
  } catch {
    return DEFAULT_EXTRAS;
  }
}
