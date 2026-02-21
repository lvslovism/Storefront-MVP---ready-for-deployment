// lib/price-display.ts
// 查詢 product_price_display 表，取得 CMS 促銷展示價格
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ephdzjkgpkuydpbkxnfw.supabase.co';

// 用 anon key 讀取（RLS 允許 anon 讀 active 記錄）
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface PriceDisplayInfo {
  product_id: string;
  variant_id: string;
  original_price: number;
  display_price: number;
  discount_label: string | null;
  discount_percentage: number | null;
  promotion_name: string | null;
}

/**
 * 批量取得商品展示價格（用在列表頁）
 * 回傳 Map<product_id, PriceDisplayInfo>（取第一個 variant 的折扣資訊）
 */
export async function getProductPriceDisplays(
  productIds: string[],
  merchantCode: string = 'minjie'
): Promise<Map<string, PriceDisplayInfo>> {
  const map = new Map<string, PriceDisplayInfo>();
  if (!productIds.length || !supabaseAnonKey) return map;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 分批查詢（避免 URL 過長）
  for (let i = 0; i < productIds.length; i += 50) {
    const batch = productIds.slice(i, i + 50);
    const { data, error } = await supabase
      .from('product_price_display')
      .select(
        'product_id, variant_id, original_price, display_price, discount_label, discount_percentage, promotion_name'
      )
      .eq('merchant_code', merchantCode)
      .eq('is_active', true)
      .in('product_id', batch);

    if (error) {
      console.error('[getProductPriceDisplays] Error:', error);
      continue;
    }

    for (const row of data || []) {
      // 每個 product 只取第一筆（第一個 variant 的折扣資訊）
      if (!map.has(row.product_id)) {
        map.set(row.product_id, row);
      }
    }
  }

  return map;
}

/**
 * 單一商品的所有 variant 展示價格（用在詳情頁）
 * 回傳 Map<variant_id, PriceDisplayInfo>
 */
export async function getVariantPriceDisplays(
  productId: string,
  merchantCode: string = 'minjie'
): Promise<Map<string, PriceDisplayInfo>> {
  const map = new Map<string, PriceDisplayInfo>();
  if (!supabaseAnonKey) return map;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('product_price_display')
    .select(
      'product_id, variant_id, original_price, display_price, discount_label, discount_percentage, promotion_name'
    )
    .eq('merchant_code', merchantCode)
    .eq('product_id', productId)
    .eq('is_active', true);

  if (error) {
    console.error('[getVariantPriceDisplays] Error:', error);
    return map;
  }

  for (const row of data || []) {
    map.set(row.variant_id, row);
  }

  return map;
}
