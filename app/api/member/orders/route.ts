/**
 * MINJIE STUDIO — Member Orders API
 *
 * 使用 Medusa Admin API 讀取會員訂單
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface Session {
  line_user_id?: string;
  email_user_id?: string;
  display_name: string;
  customer_id: string | null;
  auth_method?: 'line' | 'email';
}

// Medusa Admin Order Types
interface MedusaLineItem {
  id: string;
  title: string;
  variant_title?: string | null;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
}

interface MedusaShippingAddress {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  postal_code?: string;
}

interface MedusaOrder {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  items?: MedusaLineItem[];
  shipping_address?: MedusaShippingAddress | null;
  shipping_methods?: Array<{
    name?: string;
    shipping_option?: {
      name?: string;
    };
  }>;
  payment_collections?: Array<{
    status?: string;
    payment_sessions?: Array<{
      provider_id?: string;
    }>;
  }>;
}

// Frontend Order Types
interface OrderItem {
  title: string;
  subtitle: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
  variant_id?: string | null;
}

interface Order {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  items: OrderItem[];
  shipping: string;
  payment: string;
}

// ============ Medusa Admin Auth ============

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;

// Token cache (in-memory, reset on cold start)
let adminToken: string | null = null;
let tokenExpiry: number = 0;

async function getAdminToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (adminToken && Date.now() < tokenExpiry) {
    return adminToken;
  }

  if (!MEDUSA_BACKEND_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) {
    console.error('[Orders] Missing Medusa admin credentials');
    return null;
  }

  try {
    // Medusa v2 auth endpoint
    const authRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEDUSA_ADMIN_EMAIL,
        password: MEDUSA_ADMIN_PASSWORD,
      }),
    });

    if (!authRes.ok) {
      console.error('[Orders] Admin auth failed:', authRes.status);
      return null;
    }

    const authData = await authRes.json();
    adminToken = authData.token;
    // Cache for 1 hour (tokens typically last longer, but refresh periodically)
    tokenExpiry = Date.now() + 60 * 60 * 1000;
    return adminToken;
  } catch (error) {
    console.error('[Orders] Admin auth error:', error);
    return null;
  }
}

// ============ Status Mapping ============

function mapOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    completed: 'delivered',
    canceled: 'cancelled',
    archived: 'delivered',
    requires_action: 'pending',
    draft: 'pending',
  };
  return statusMap[status] || 'pending';
}

function detectPaymentMethod(order: MedusaOrder): string {
  // Check payment collections for provider info
  const paymentCollections = order.payment_collections || [];
  for (const pc of paymentCollections) {
    const sessions = pc.payment_sessions || [];
    for (const session of sessions) {
      if (session.provider_id?.includes('cod')) return 'cod';
      if (session.provider_id?.includes('credit') || session.provider_id?.includes('card')) return 'credit_card';
    }
    // Check status
    if (pc.status === 'captured' || pc.status === 'authorized') return 'credit_card';
  }
  return 'cod'; // Default to COD for Taiwan market
}

function detectShippingMethod(order: MedusaOrder): string {
  const methods = order.shipping_methods || [];
  if (methods.length > 0) {
    const name = methods[0].name || methods[0].shipping_option?.name || '';
    if (name.includes('超商') || name.includes('CVS') || name.includes('便利')) return '超商取貨';
    if (name.includes('宅配') || name.includes('Home')) return '宅配';
    return name || '宅配';
  }
  return '宅配';
}

// ============ API Handler ============

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('line_session');

  // Check login status
  if (!sessionCookie?.value) {
    return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
  }

  let session: Session;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
  }

  // Check customer_id
  if (!session.customer_id) {
    return NextResponse.json({
      success: true,
      orders: [],
      message: 'No customer linked',
    });
  }

  // Check if credentials are configured
  if (!MEDUSA_BACKEND_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) {
    console.warn('[Orders] Medusa admin credentials not configured');
    return NextResponse.json({
      success: true,
      orders: [],
      message: 'Orders API not configured',
    });
  }

  try {
    // Get admin token
    const token = await getAdminToken();
    if (!token) {
      return NextResponse.json({
        success: true,
        orders: [],
        error: 'Failed to authenticate with Medusa',
      });
    }

    // Fetch orders from Medusa Admin API
    // Medusa v2 Admin API: GET /admin/orders?customer_id=xxx
    const ordersUrl = new URL(`${MEDUSA_BACKEND_URL}/admin/orders`);
    ordersUrl.searchParams.set('customer_id', session.customer_id);
    ordersUrl.searchParams.set('order', '-created_at');
    ordersUrl.searchParams.set('limit', '50');
    ordersUrl.searchParams.set('fields', '*items,*shipping_address,*shipping_methods,*payment_collections');

    const ordersRes = await fetch(ordersUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      next: { revalidate: 60 },
    });

    if (!ordersRes.ok) {
      // If 401, clear cached token and retry once
      if (ordersRes.status === 401) {
        adminToken = null;
        tokenExpiry = 0;
      }
      console.error('[Orders] Fetch failed:', ordersRes.status, await ordersRes.text());
      return NextResponse.json({
        success: true,
        orders: [],
        error: 'Failed to fetch orders',
      });
    }

    const ordersData = await ordersRes.json();
    const medusaOrders: MedusaOrder[] = ordersData.orders || [];

    // Transform to frontend format
    const orders: Order[] = medusaOrders.map((order) => {
      // 計算商品總額（用於 total 為 0 時的 fallback）
      const items = (order.items || []).map((item) => {
        // Medusa v2: quantity 可能在 item.quantity 或 item.detail?.quantity
        const rawItem = item as unknown as Record<string, unknown>;
        const detail = rawItem.detail as Record<string, unknown> | undefined;
        const quantity = item.quantity || (detail?.quantity as number) || 1;

        return {
          title: item.title,
          subtitle: item.variant_title || null,
          quantity,
          unit_price: Math.round(item.unit_price), // TWD 不除以 100
          thumbnail: item.thumbnail,
          variant_id: item.variant_id || null,
        };
      });

      // 訂單總金額：優先使用 order.total，若為 0 則用 items 加總
      let total = Math.round(order.total);
      if (total === 0 && items.length > 0) {
        total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      }

      return {
        id: order.id,
        display_id: order.display_id,
        status: mapOrderStatus(order.status),
        created_at: order.created_at.split('T')[0], // YYYY-MM-DD
        total,
        items,
        shipping: detectShippingMethod(order),
        payment: detectPaymentMethod(order),
      };
    });

    return NextResponse.json({
      success: true,
      orders,
      total: ordersData.count || orders.length,
    });
  } catch (error) {
    console.error('[Orders] API error:', error);
    return NextResponse.json({
      success: true,
      orders: [],
      error: 'Failed to fetch orders',
    });
  }
}
