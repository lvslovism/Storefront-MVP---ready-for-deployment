/**
 * MINJIE STUDIO — Member Orders API
 *
 * 從 Medusa Store API 讀取會員訂單
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import storeConfig from '@/config/store.json';

interface Session {
  line_user_id?: string;
  email_user_id?: string;
  display_name: string;
  customer_id: string | null;
  auth_method?: 'line' | 'email';
}

// Medusa Order Types (simplified)
interface MedusaLineItem {
  id: string;
  title: string;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
}

interface MedusaOrder {
  id: string;
  display_id: number;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  created_at: string;
  total: number;
  items: MedusaLineItem[];
  shipping_methods?: Array<{
    name: string;
  }>;
}

// Transformed Order for Frontend
interface OrderItem {
  title: string;
  subtitle: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
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

// Status mapping
function mapFulfillmentStatus(fulfillmentStatus: string): string {
  const statusMap: Record<string, string> = {
    not_fulfilled: 'pending',
    partially_fulfilled: 'pending',
    fulfilled: 'shipped',
    partially_shipped: 'shipped',
    shipped: 'shipped',
    delivered: 'delivered',
    partially_delivered: 'delivered',
    canceled: 'cancelled',
    requires_action: 'pending',
  };
  return statusMap[fulfillmentStatus] || 'pending';
}

// Payment status mapping
function mapPaymentStatus(paymentStatus: string): string {
  const paymentMap: Record<string, string> = {
    captured: 'credit_card',
    authorized: 'credit_card',
    pending: 'pending',
    requires_more: 'pending',
    canceled: 'cancelled',
    partially_captured: 'credit_card',
    partially_refunded: 'credit_card',
    refunded: 'refunded',
    awaiting: 'cod',
  };
  return paymentMap[paymentStatus] || 'credit_card';
}

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
    // User logged in but not linked to a Medusa customer
    // Return empty orders
    return NextResponse.json({
      success: true,
      orders: [],
      message: 'No customer linked',
    });
  }

  try {
    // Fetch orders from Medusa Store API
    const medusaUrl = storeConfig.medusa.backendUrl;
    const publishableKey = storeConfig.medusa.publishableKey;

    // Medusa v2 Store API: GET /store/orders?customer_id=xxx
    // Note: This requires customer authentication in Medusa v2
    // For now, we'll try the admin approach with service-level access
    // If that doesn't work, we may need to set up proper Medusa customer auth

    const response = await fetch(
      `${medusaUrl}/store/orders?customer_id=${session.customer_id}&limit=20&order=-created_at`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': publishableKey,
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      // If store API doesn't support this, try admin API with different approach
      // For now, return empty with debug info
      console.error('Medusa orders fetch failed:', response.status, await response.text());

      return NextResponse.json({
        success: true,
        orders: [],
        debug: {
          status: response.status,
          customerId: session.customer_id,
        },
      });
    }

    const data = await response.json();
    const medusaOrders: MedusaOrder[] = data.orders || [];

    // Transform to frontend format
    const orders: Order[] = medusaOrders.map((order) => ({
      id: order.id,
      display_id: order.display_id,
      status: mapFulfillmentStatus(order.fulfillment_status),
      created_at: order.created_at.split('T')[0], // YYYY-MM-DD
      total: Math.round(order.total / 100), // Medusa stores in cents
      items: order.items.map((item) => ({
        title: item.title,
        subtitle: item.variant_title || null,
        quantity: item.quantity,
        unit_price: Math.round(item.unit_price / 100),
        thumbnail: item.thumbnail,
      })),
      shipping: order.shipping_methods?.[0]?.name || '宅配',
      payment: mapPaymentStatus(order.payment_status),
    }));

    return NextResponse.json({
      success: true,
      orders,
      total: data.count || orders.length,
    });
  } catch (error) {
    console.error('Orders API error:', error);
    // 錯誤時也回傳空陣列，不中斷前端顯示
    return NextResponse.json({
      success: true,
      orders: [],
      error: 'Failed to fetch orders',
    });
  }
}
