// app/api/recalc-prices/route.ts
// 根據 promotion_rules 計算商品展示價格，寫入 product_price_display 表
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getMerchantCode } from '@/lib/supabase';
import { medusa } from '@/lib/config';

const RECALC_SECRET = process.env.RECALC_SECRET || '';
// 使用 config/store.json（與 lib/medusa.ts 同源），env var 作 fallback
const MEDUSA_URL = medusa.backendUrl || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || '';
const PUBLISHABLE_KEY = medusa.publishableKey || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const REGION_ID = medusa.regionId || process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || '';
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || '';

export async function POST(req: NextRequest) {
  // 1. Auth
  const secret = req.headers.get('x-recalc-secret');
  if (!RECALC_SECRET || secret !== RECALC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const merchantCode = getMerchantCode();

  try {
    // 2. 讀取 active 促銷規則（product_sale / multi_product / collection_discount）
    const { data: rules, error: rulesError } = await supabase
      .from('promotion_rules')
      .select('*')
      .eq('is_active', true)
      .eq('sync_status', 'synced')
      .in('type', ['product_sale', 'multi_product', 'collection_discount']);

    if (rulesError) throw rulesError;

    // 過濾有效期間
    const now = new Date().toISOString();
    const activeRules = (rules || []).filter((r) => {
      if (r.valid_from && r.valid_from > now) return false;
      if (r.valid_until && r.valid_until < now) return false;
      return true;
    });

    if (activeRules.length === 0) {
      // 沒有 active 規則，停用所有記錄
      const { data: allActive } = await supabase
        .from('product_price_display')
        .select('id')
        .eq('is_active', true)
        .eq('merchant_code', merchantCode);

      let deactivated = 0;
      if (allActive?.length) {
        const ids = allActive.map((r) => r.id);
        for (let i = 0; i < ids.length; i += 50) {
          await supabase
            .from('product_price_display')
            .update({ is_active: false })
            .in('id', ids.slice(i, i + 50));
        }
        deactivated = ids.length;
      }

      // 清快取
      await triggerRevalidate();

      return NextResponse.json({
        success: true,
        updated: 0,
        deactivated,
      });
    }

    // 3. 收集所有 target product IDs（去重）
    const allProductIds = new Set<string>();
    for (const rule of activeRules) {
      if (rule.target_product_ids?.length) {
        rule.target_product_ids.forEach((id: string) =>
          allProductIds.add(id)
        );
      }
      // collection_discount: 第一版先跳過（需要另外查 collection 的商品）
    }

    if (allProductIds.size === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        deactivated: 0,
        note: 'No target products',
      });
    }

    // 4. 從 Medusa 取商品含價格（分批，每批 20）
    const productIds = Array.from(allProductIds);
    const products = await fetchProductsWithPrices(productIds);

    // 5. 計算展示價格
    const upsertRows: any[] = [];

    for (const rule of activeRules) {
      const targetIds: string[] = rule.target_product_ids || [];

      for (const product of products) {
        if (!targetIds.includes(product.id)) continue;

        for (const variant of product.variants || []) {
          const originalPrice =
            variant.calculated_price?.calculated_amount;
          if (!originalPrice || originalPrice <= 0) continue;

          let displayPrice: number;
          let discountLabel: string;

          if (rule.discount_method === 'fixed') {
            displayPrice = Math.max(
              0,
              originalPrice - Number(rule.discount_value)
            );
            discountLabel = `省$${Number(rule.discount_value)}`;
          } else {
            // percentage
            const pct = Number(rule.discount_value);
            displayPrice = Math.round(originalPrice * (1 - pct / 100));
            discountLabel = `${Math.round(100 - pct)}折`;
          }

          upsertRows.push({
            merchant_code: merchantCode,
            product_id: product.id,
            variant_id: variant.id,
            original_price: originalPrice,
            display_price: displayPrice,
            discount_label: discountLabel,
            discount_type: rule.discount_method,  // 'fixed' | 'percentage'
            promotion_rule_id: rule.id,
            is_active: true,
            valid_until: rule.valid_until || null,
          });
        }
      }
    }

    // 6. Upsert
    let updated = 0;
    if (upsertRows.length > 0) {
      // 分批 upsert（避免 payload 過大）
      for (let i = 0; i < upsertRows.length; i += 50) {
        const batch = upsertRows.slice(i, i + 50);
        const { error: upsertError } = await supabase
          .from('product_price_display')
          .upsert(batch, {
            onConflict: 'merchant_code,variant_id',
          });
        if (upsertError) throw upsertError;
      }
      updated = upsertRows.length;
    }

    // 7. 停用不在本次 upsert 列表中的 active 記錄
    const activeVariantIds = upsertRows.map((r) => r.variant_id);

    const { data: allActive } = await supabase
      .from('product_price_display')
      .select('id, variant_id')
      .eq('is_active', true)
      .eq('merchant_code', merchantCode);

    const toDeactivate = (allActive || [])
      .filter((row) => !activeVariantIds.includes(row.variant_id))
      .map((row) => row.id);

    let deactivated = 0;
    if (toDeactivate.length > 0) {
      for (let i = 0; i < toDeactivate.length; i += 50) {
        const batch = toDeactivate.slice(i, i + 50);
        await supabase
          .from('product_price_display')
          .update({ is_active: false })
          .in('id', batch);
      }
      deactivated = toDeactivate.length;
    }

    // 8. 清 ISR 快取
    await triggerRevalidate();

    return NextResponse.json({ success: true, updated, deactivated });
  } catch (error: any) {
    console.error('[recalc-prices] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ====== Helper: 從 Medusa Store API 取商品含價格 ======

async function fetchProductsWithPrices(productIds: string[]) {
  const allProducts: any[] = [];

  for (let i = 0; i < productIds.length; i += 20) {
    const batch = productIds.slice(i, i + 20);
    const params = new URLSearchParams();
    params.set('region_id', REGION_ID);
    batch.forEach((id) => params.append('id', id));
    params.set(
      'fields',
      '*variants,+variants.inventory_quantity,+variants.calculated_price'
    );
    params.set('limit', '20');

    try {
      const res = await fetch(
        `${MEDUSA_URL}/store/products?${params}`,
        {
          headers: {
            'x-publishable-api-key': PUBLISHABLE_KEY,
          },
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        console.error(
          `[recalc] Medusa fetch failed: ${res.status}`,
          await res.text().catch(() => '')
        );
        continue;
      }

      const data = await res.json();
      allProducts.push(...(data.products || []));
    } catch (e) {
      console.error('[recalc] Medusa fetch error:', e);
    }
  }

  return allProducts;
}

// ====== Helper: 觸發 ISR revalidate ======

async function triggerRevalidate() {
  if (!REVALIDATE_SECRET) return;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  try {
    await fetch(`${baseUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': REVALIDATE_SECRET,
      },
      body: JSON.stringify({
        paths: ['/', '/products'],
      }),
    });
  } catch (e) {
    console.warn('[recalc] Revalidate failed (non-blocking):', e);
  }
}
