import { NextRequest, NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.MEDUSA_PUBLISHABLE_KEY || '';

/**
 * POST /api/cart/complete
 * 備用的 complete cart endpoint（冪等性保護）
 * Gateway webhook 是主要觸發點，這是前端備用
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cart_id } = body;

    if (!cart_id) {
      return NextResponse.json({ error: 'cart_id is required' }, { status: 400 });
    }

    if (!MEDUSA_BACKEND_URL || !MEDUSA_PUBLISHABLE_KEY) {
      return NextResponse.json({ error: 'Medusa not configured' }, { status: 500 });
    }

    console.log('[CartComplete] Attempting complete for cart:', cart_id);

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cart_id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();

    // 已經 complete 過了 — 冪等，不是錯誤
    if (!response.ok) {
      if (data?.message?.includes('already completed') || data?.message?.includes('Cart not found')) {
        console.log('[CartComplete] Cart already completed or processed:', cart_id);
        return NextResponse.json({ status: 'already_completed', cart_id });
      }
      console.error('[CartComplete] Failed:', data);
      return NextResponse.json({ error: 'Complete cart failed', detail: data }, { status: 500 });
    }

    if (data.type === 'order') {
      console.log('[CartComplete] Order created:', data.order?.id);
      return NextResponse.json({
        status: 'completed',
        order_id: data.order?.id,
        cart_id,
      });
    }

    // type !== 'order'，可能是 cart 還需要其他步驟
    return NextResponse.json({ status: 'incomplete', type: data.type, cart_id });
  } catch (error) {
    console.error('[CartComplete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
