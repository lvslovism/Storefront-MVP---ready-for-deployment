import { NextRequest, NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || '';
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin token cache
let adminToken: string | null = null;
let tokenExpiry: number = 0;

async function getMedusaAdminToken(): Promise<string | null> {
  if (adminToken && Date.now() < tokenExpiry) {
    return adminToken;
  }

  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEDUSA_ADMIN_EMAIL,
        password: MEDUSA_ADMIN_PASSWORD,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      adminToken = data.token;
      tokenExpiry = Date.now() + 60 * 60 * 1000;
      return adminToken;
    }
    console.error('[OrderAPI] Medusa auth failed:', await response.text());
    return null;
  } catch (error) {
    console.error('[OrderAPI] Medusa auth error:', error);
    return null;
  }
}

/**
 * 透過 Supabase gateway_transactions 查 cart_id 對應的 medusa_order_id
 */
async function findOrderIdByCartId(cartId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[OrderAPI] Supabase not configured, skipping gateway lookup');
    return null;
  }

  try {
    // gateway_transactions.order_id 存的是 cart_id
    const url = `${SUPABASE_URL}/rest/v1/gateway_transactions?order_id=eq.${encodeURIComponent(cartId)}&select=medusa_order_id,status&order=created_at.desc&limit=1`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('[OrderAPI] Supabase query failed:', response.status);
      return null;
    }

    const rows = await response.json();
    if (rows.length > 0 && rows[0].medusa_order_id) {
      console.log('[OrderAPI] Found medusa_order_id via gateway:', rows[0].medusa_order_id);
      return rows[0].medusa_order_id;
    }

    return null;
  } catch (error) {
    console.error('[OrderAPI] Supabase lookup error:', error);
    return null;
  }
}

/**
 * 用單筆 endpoint 取完整 order（含 quantity, total 等計算欄位）
 */
async function fetchOrderById(orderId: string, token: string): Promise<any | null> {
  try {
    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/admin/orders/${orderId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error('[OrderAPI] Fetch order failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.order || null;
  } catch (error) {
    console.error('[OrderAPI] Fetch order error:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cartId: string }> }
) {
  try {
    const { cartId } = await params;

    if (!cartId) {
      return NextResponse.json({ error: 'cart_id is required' }, { status: 400 });
    }

    const token = await getMedusaAdminToken();
    if (!token) {
      return NextResponse.json({ error: 'Failed to authenticate with Medusa' }, { status: 500 });
    }

    // === 策略 1：透過 Supabase gateway_transactions 精確匹配 ===
    const medusaOrderId = await findOrderIdByCartId(cartId);
    if (medusaOrderId) {
      const order = await fetchOrderById(medusaOrderId, token);
      if (order) {
        return NextResponse.json({ order, matched_by: 'gateway_transaction' });
      }
    }

    // === 策略 2：用 Medusa list API 嘗試 metadata 匹配（備用）===
    try {
      const listResponse = await fetch(
        `${MEDUSA_BACKEND_URL}/admin/orders?limit=10&order=-created_at`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (listResponse.ok) {
        const listData = await listResponse.json();
        const orders = listData.orders || [];

        const matched = orders.find((o: any) =>
          o.metadata?.cart_id === cartId
        );

        if (matched) {
          // 找到後用單筆 endpoint 取完整資料
          const fullOrder = await fetchOrderById(matched.id, token);
          if (fullOrder) {
            return NextResponse.json({ order: fullOrder, matched_by: 'metadata' });
          }
        }
      }
    } catch (listError) {
      console.error('[OrderAPI] List fallback error:', listError);
    }

    // === 找不到就 404，絕不 fallback 回傳最新 order ===
    return NextResponse.json(
      { error: 'Order not found for this cart' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[OrderAPI] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
