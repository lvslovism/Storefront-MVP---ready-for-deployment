import { NextRequest, NextResponse } from 'next/server';

/**
 * COD 訂單專用：寫入 order_extensions
 * 
 * 因為 COD 不經過 ECPay，不會觸發 order-notify，
 * 所以由前端結帳完成後呼叫此端點寫入。
 * 
 * POST /api/order-extension
 * Body: { cart_id, shipping_method, shipping_fee, payment_method, credits_used,
 *         promo_code, promo_discount, cvs_type, cvs_store_id, cvs_store_name, cvs_address,
 *         receiver_name, receiver_phone, receiver_email, receiver_address, receiver_city, receiver_zip_code }
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || '';
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || '';

let adminToken: string | null = null;
let tokenExpiry: number = 0;

async function getMedusaAdminToken(): Promise<string | null> {
  if (adminToken && Date.now() < tokenExpiry) return adminToken;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEDUSA_ADMIN_EMAIL, password: MEDUSA_ADMIN_PASSWORD }),
    });
    if (res.ok) {
      const data = await res.json();
      adminToken = data.token;
      tokenExpiry = Date.now() + 60 * 60 * 1000;
      return adminToken;
    }
    return null;
  } catch { return null; }
}

/**
 * 透過 order_cart 中間表查找 order_id
 */
async function findOrderByCartId(cartId: string): Promise<any | null> {
  try {
    // Step 1: order_cart 查 order_id
    const url = `${SUPABASE_URL}/rest/v1/order_cart?cart_id=eq.${encodeURIComponent(cartId)}&select=order_id&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;

    const orderId = rows[0].order_id;

    // Step 2: 用 Medusa Admin API 取完整 order
    const token = await getMedusaAdminToken();
    if (!token) return null;

    const orderRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!orderRes.ok) return null;
    const orderData = await orderRes.json();
    return orderData.order || null;
  } catch (err) {
    console.error('[order-extension] findOrderByCartId error:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cart_id } = body;

    if (!cart_id) {
      return NextResponse.json({ error: 'cart_id is required' }, { status: 400 });
    }

    // 查找 Medusa order（可能需要重試，因為 complete cart 後 order 建立有延遲）
    let order: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      order = await findOrderByCartId(cart_id);
      if (order) break;
      // 等 1 秒再試
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!order) {
      // 即使找不到 order 也不阻擋，記錄 log 就好
      console.warn('[order-extension] Order not found for cart:', cart_id);
      return NextResponse.json({ success: false, reason: 'order_not_found' }, { status: 200 });
    }

    // 組裝 order_extensions 資料
    const addr = order.shipping_address || {};
    const extensionData = {
      order_id: order.id,
      cart_id: cart_id,
      display_id: order.display_id,
      customer_id: order.customer_id || null,
      merchant_code: 'minjie',
      order_status: 'confirmed',
      shipping_method: body.shipping_method || 'home',
      shipping_fee: body.shipping_fee || 0,
      cvs_type: body.cvs_type || null,
      cvs_store_id: body.cvs_store_id || null,
      cvs_store_name: body.cvs_store_name || null,
      cvs_address: body.cvs_address || null,
      receiver_name: body.receiver_name || ((addr.last_name || '') + (addr.first_name || '')),
      receiver_phone: body.receiver_phone || addr.phone || null,
      receiver_email: body.receiver_email || order.email || null,
      receiver_address: body.receiver_address || addr.address_1 || null,
      receiver_city: body.receiver_city || addr.city || null,
      receiver_zip_code: body.receiver_zip_code || addr.postal_code || null,
      payment_method: body.payment_method || 'cod',
      payment_amount: order.total || 0,
      credits_used: body.credits_used || 0,
      promo_code: body.promo_code || null,
      promo_discount: body.promo_discount || 0,
      order_date: order.created_at || new Date().toISOString(),
      paid_at: body.payment_method === 'cod' ? null : new Date().toISOString(),
    };

    // UPSERT 寫入 order_extensions
    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/order_extensions`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(extensionData),
      }
    );

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('[order-extension] Upsert failed:', errText);
      return NextResponse.json({ success: false, error: errText }, { status: 200 });
    }

    console.log(`[order-extension] Written: order #${order.display_id}, method: ${extensionData.payment_method}`);
    return NextResponse.json({
      success: true,
      order_id: order.id,
      display_id: order.display_id,
    });
  } catch (err: any) {
    // 失敗不回 500，不阻擋前端流程
    console.error('[order-extension] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
