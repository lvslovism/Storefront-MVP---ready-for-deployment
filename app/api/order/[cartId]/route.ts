import { NextRequest, NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || '';
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || '';

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
      tokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
      return adminToken;
    }
    console.error('Medusa auth failed:', await response.text());
    return null;
  } catch (error) {
    console.error('Medusa auth error:', error);
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

    // Query orders and find by cart_id
    // Medusa v2 doesn't support direct cart_id filter, so we fetch recent orders and filter
    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/admin/orders?fields=id,display_id,status,created_at,*items,*shipping_address,*summary,*shipping_methods&limit=20&order=-created_at`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Medusa orders fetch error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Find order by cart_id (stored in order.cart_id or order metadata)
    // deno-lint-ignore no-explicit-any
    const order = orders.find((o: any) => {
      // Medusa v2: cart_id might be in different places
      return o.cart_id === cartId ||
             o.id === cartId.replace('cart_', 'order_') ||
             o.metadata?.cart_id === cartId;
    });

    if (!order) {
      // If not found by cart_id, try to return the most recent order
      // This is a fallback for when cart_id matching fails
      console.log('Order not found by cart_id, returning most recent order');
      if (orders.length > 0) {
        const o = orders[0];
        console.log('ORDER ITEMS:', JSON.stringify(o.items?.[0], null, 2));
        console.log('ORDER TOTALS:', {
          subtotal: o.subtotal,
          total: o.total,
          item_subtotal: o.item_subtotal,
          shipping_total: o.shipping_total,
          summary: o.summary
        });
        console.log('ORDER SHIPPING:', JSON.stringify(o.shipping_methods?.[0], null, 2));
        console.log('ORDER SHIPPING_ADDRESS:', JSON.stringify(o.shipping_address, null, 2));
        return NextResponse.json({ order: o, matched_by: 'recent' });
      }
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Debug: log order structure
    console.log('ORDER ITEMS:', JSON.stringify(order.items?.[0], null, 2));
    console.log('ORDER TOTALS:', {
      subtotal: order.subtotal,
      total: order.total,
      item_subtotal: order.item_subtotal,
      shipping_total: order.shipping_total,
      summary: order.summary
    });
    console.log('ORDER SHIPPING:', JSON.stringify(order.shipping_methods?.[0], null, 2));
    console.log('ORDER SHIPPING_ADDRESS:', JSON.stringify(order.shipping_address, null, 2));

    return NextResponse.json({ order, matched_by: 'cart_id' });
  } catch (error) {
    console.error('Order API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
