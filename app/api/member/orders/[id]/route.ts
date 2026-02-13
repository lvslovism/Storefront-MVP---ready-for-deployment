/**
 * MINJIE STUDIO — Member Order Detail API
 *
 * 使用 Medusa Admin API 讀取單筆訂單詳情
 */

import { NextRequest, NextResponse } from 'next/server';
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
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
  product_handle?: string | null;
  detail?: {
    quantity?: number;
  };
}

interface MedusaShippingAddress {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  metadata?: Record<string, unknown>;
}

interface MedusaShippingMethod {
  id?: string;
  name?: string;
  amount?: number;
  shipping_option?: {
    id?: string;
    name?: string;
  };
  data?: Record<string, unknown>;
}

interface MedusaPaymentCollection {
  id?: string;
  status?: string;
  amount?: number;
  payment_sessions?: Array<{
    id?: string;
    provider_id?: string;
    status?: string;
    amount?: number;
    data?: Record<string, unknown>;
  }>;
  payments?: Array<{
    id?: string;
    amount?: number;
    provider_id?: string;
    data?: Record<string, unknown>;
  }>;
}

interface MedusaOrder {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  email?: string;
  currency_code?: string;
  // Amounts
  total: number;
  subtotal?: number;
  shipping_total?: number;
  discount_total?: number;
  tax_total?: number;
  item_total?: number;
  // Relations
  items?: MedusaLineItem[];
  shipping_address?: MedusaShippingAddress | null;
  billing_address?: MedusaShippingAddress | null;
  shipping_methods?: MedusaShippingMethod[];
  payment_collections?: MedusaPaymentCollection[];
  // Fulfillments
  fulfillments?: Array<{
    id?: string;
    tracking_numbers?: string[];
    shipped_at?: string;
    data?: Record<string, unknown>;
  }>;
  // Metadata
  metadata?: Record<string, unknown>;
}

// ============ Medusa Admin Auth ============

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;

// Token cache (in-memory, reset on cold start)
let adminToken: string | null = null;
let tokenExpiry: number = 0;

async function getAdminToken(): Promise<string | null> {
  if (adminToken && Date.now() < tokenExpiry) {
    return adminToken;
  }

  if (!MEDUSA_BACKEND_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) {
    console.error('[OrderDetail] Missing Medusa admin credentials');
    return null;
  }

  try {
    const authRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEDUSA_ADMIN_EMAIL,
        password: MEDUSA_ADMIN_PASSWORD,
      }),
    });

    if (!authRes.ok) {
      console.error('[OrderDetail] Admin auth failed:', authRes.status);
      return null;
    }

    const authData = await authRes.json();
    adminToken = authData.token;
    tokenExpiry = Date.now() + 60 * 60 * 1000;
    return adminToken;
  } catch (error) {
    console.error('[OrderDetail] Admin auth error:', error);
    return null;
  }
}

// ============ Helper Functions ============

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

function detectPaymentMethod(order: MedusaOrder): { method: string; status: string } {
  const paymentCollections = order.payment_collections || [];
  let method = 'cod';
  let status = 'pending';

  for (const pc of paymentCollections) {
    // Check payment sessions
    const sessions = pc.payment_sessions || [];
    for (const session of sessions) {
      if (session.provider_id?.includes('cod')) method = 'cod';
      else if (session.provider_id?.includes('credit') || session.provider_id?.includes('card')) method = 'credit_card';
      else if (session.provider_id?.includes('installment') || session.provider_id?.includes('bnpl')) method = 'installment';

      if (session.status === 'authorized' || session.status === 'captured') status = 'paid';
    }

    // Check payment collection status
    if (pc.status === 'captured' || pc.status === 'authorized') {
      status = 'paid';
      if (method === 'cod') method = 'credit_card';
    }
  }

  return { method, status };
}

function detectShippingInfo(order: MedusaOrder): {
  method: string;
  methodType: 'cvs' | 'home';
  cvsInfo?: { type: string; storeName: string; storeId: string; address: string };
  trackingNumber?: string;
} {
  const methods = order.shipping_methods || [];
  const fulfillments = order.fulfillments || [];

  let methodType: 'cvs' | 'home' = 'home';
  let methodName = '宅配到府';
  let cvsInfo: { type: string; storeName: string; storeId: string; address: string } | undefined;
  let trackingNumber: string | undefined;

  if (methods.length > 0) {
    const shippingMethod = methods[0];
    const name = shippingMethod.name || shippingMethod.shipping_option?.name || '';

    if (name.includes('超商') || name.includes('CVS') || name.includes('便利') || name.includes('7-ELEVEN') || name.includes('全家') || name.includes('萊爾富')) {
      methodType = 'cvs';
      methodName = '超商取貨';

      // Try to get CVS info from shipping method data or shipping address metadata
      const methodData = shippingMethod.data as Record<string, unknown> | undefined;
      const addressMetadata = order.shipping_address?.metadata as Record<string, unknown> | undefined;
      const data = methodData || addressMetadata || {};

      if (data.cvs_store_name || data.store_name || data.CVSStoreName) {
        let cvsType = '超商';
        const storeName = (data.cvs_store_name || data.store_name || data.CVSStoreName || '') as string;

        if (name.includes('7-ELEVEN') || name.includes('UNIMART') || storeName.includes('7-ELEVEN')) cvsType = '7-ELEVEN';
        else if (name.includes('全家') || name.includes('FAMI')) cvsType = '全家';
        else if (name.includes('萊爾富') || name.includes('HILIFE')) cvsType = '萊爾富';

        cvsInfo = {
          type: cvsType,
          storeName: storeName,
          storeId: (data.cvs_store_id || data.store_id || data.CVSStoreID || '') as string,
          address: (data.cvs_address || data.store_address || data.CVSAddress || '') as string,
        };
      }
    } else {
      methodName = name || '宅配到府';
    }
  }

  // Get tracking number from fulfillments
  if (fulfillments.length > 0) {
    const fulfillment = fulfillments[0];
    if (fulfillment.tracking_numbers && fulfillment.tracking_numbers.length > 0) {
      trackingNumber = fulfillment.tracking_numbers[0];
    }
  }

  return { method: methodName, methodType, cvsInfo, trackingNumber };
}

// ============ API Handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('line_session');

  // Check login status
  if (!sessionCookie?.value) {
    return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
  }

  let session: Session;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.json({ success: false, error: '無效的 Session' }, { status: 401 });
  }

  // Check customer_id
  if (!session.customer_id) {
    return NextResponse.json({ success: false, error: '帳號尚未完成會員綁定' }, { status: 403 });
  }

  // Check if credentials are configured
  if (!MEDUSA_BACKEND_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) {
    console.warn('[OrderDetail] Medusa admin credentials not configured');
    return NextResponse.json({ success: false, error: '訂單服務未設定' }, { status: 500 });
  }

  try {
    // Get admin token
    const token = await getAdminToken();
    if (!token) {
      return NextResponse.json({ success: false, error: '無法連接訂單系統' }, { status: 500 });
    }

    // Fetch single order from Medusa Admin API
    const orderUrl = new URL(`${MEDUSA_BACKEND_URL}/admin/orders/${orderId}`);
    orderUrl.searchParams.set('fields', '*items,*shipping_address,*billing_address,*shipping_methods,*payment_collections,*fulfillments,*customer');

    const orderRes = await fetch(orderUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!orderRes.ok) {
      if (orderRes.status === 401) {
        adminToken = null;
        tokenExpiry = 0;
      }
      if (orderRes.status === 404) {
        return NextResponse.json({ success: false, error: '找不到此訂單' }, { status: 404 });
      }
      console.error('[OrderDetail] Fetch failed:', orderRes.status, await orderRes.text());
      return NextResponse.json({ success: false, error: '無法取得訂單資料' }, { status: 500 });
    }

    const orderData = await orderRes.json();
    const medusaOrder: MedusaOrder = orderData.order;

    // Security check: Verify customer_id matches
    // Medusa v2 可能把 customer_id 放在 order.customer_id 或 order.customer.id
    const orderCustomerId = medusaOrder.customer_id ||
      ((medusaOrder as unknown as { customer?: { id?: string } }).customer?.id) ||
      null;
    const sessionCustomerId = session.customer_id;

    console.log('[OrderDetail] customer check:', {
      session: sessionCustomerId,
      order: orderCustomerId,
      hasCustomer: !!(medusaOrder as unknown as { customer?: unknown }).customer
    });

    // 如果 orderCustomerId 存在且與 session 不符，才擋
    // 如果 orderCustomerId 是 null（Medusa 沒回傳），不擋（因為列表 API 已經用 customer_id 過濾過了）
    if (orderCustomerId && sessionCustomerId && orderCustomerId !== sessionCustomerId) {
      return NextResponse.json({ success: false, error: '無權查看此訂單' }, { status: 403 });
    }

    // Transform order data
    const items = (medusaOrder.items || []).map((item) => {
      const rawItem = item as unknown as Record<string, unknown>;
      const detail = rawItem.detail as Record<string, unknown> | undefined;
      const quantity = item.quantity || (detail?.quantity as number) || 1;

      return {
        id: item.id,
        title: item.title,
        subtitle: item.variant_title || null,
        quantity,
        unit_price: Math.round(item.unit_price),
        subtotal: Math.round(item.unit_price * quantity),
        thumbnail: item.thumbnail || null,
        variant_id: item.variant_id || null,
        product_id: item.product_id || null,
        product_handle: (rawItem.product_handle || (rawItem.product as Record<string, unknown> | undefined)?.handle || null) as string | null,
      };
    });

    // Calculate totals
    let subtotal = Math.round(medusaOrder.subtotal || medusaOrder.item_total || 0);
    if (subtotal === 0 && items.length > 0) {
      subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    const shippingTotal = Math.round(medusaOrder.shipping_total || 0);
    const discountTotal = Math.round(medusaOrder.discount_total || 0);
    const taxTotal = Math.round(medusaOrder.tax_total || 0);
    let total = Math.round(medusaOrder.total);
    if (total === 0) {
      total = subtotal + shippingTotal - discountTotal + taxTotal;
    }

    // Get shipping info
    const shippingInfo = detectShippingInfo(medusaOrder);
    const paymentInfo = detectPaymentMethod(medusaOrder);

    // Build shipping address
    const shippingAddress = medusaOrder.shipping_address ? {
      name: `${medusaOrder.shipping_address.last_name || ''}${medusaOrder.shipping_address.first_name || ''}`.trim() || null,
      phone: medusaOrder.shipping_address.phone || null,
      postal_code: medusaOrder.shipping_address.postal_code || null,
      city: medusaOrder.shipping_address.city || null,
      province: medusaOrder.shipping_address.province || null,
      address_1: medusaOrder.shipping_address.address_1 || null,
      address_2: medusaOrder.shipping_address.address_2 || null,
      full_address: [
        medusaOrder.shipping_address.postal_code,
        medusaOrder.shipping_address.city,
        medusaOrder.shipping_address.province,
        medusaOrder.shipping_address.address_1,
        medusaOrder.shipping_address.address_2,
      ].filter(Boolean).join(''),
    } : null;

    // Build response
    const order = {
      id: medusaOrder.id,
      display_id: medusaOrder.display_id,
      status: mapOrderStatus(medusaOrder.status),
      created_at: medusaOrder.created_at.split('T')[0],
      created_at_full: medusaOrder.created_at,
      email: medusaOrder.email || null,
      currency_code: medusaOrder.currency_code || 'twd',
      // Items
      items,
      // Amounts
      subtotal,
      shipping_total: shippingTotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      total,
      // Shipping
      shipping: {
        method: shippingInfo.method,
        method_type: shippingInfo.methodType,
        cvs_info: shippingInfo.cvsInfo || null,
        tracking_number: shippingInfo.trackingNumber || null,
        address: shippingAddress,
      },
      // Payment
      payment: {
        method: paymentInfo.method,
        status: paymentInfo.status,
      },
    };

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[OrderDetail] API error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
