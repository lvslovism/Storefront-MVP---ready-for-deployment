import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('line_user_id');

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing line_user_id' }, { status: 400 });
    }

    // 並行查詢 line_bot_carts 和 customer_line_profiles
    const [cartResult, profileResult] = await Promise.all([
      supabase
        .from('line_bot_carts')
        .select('id, medusa_cart_id, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_method')
        .eq('line_user_id', lineUserId)
        .not('checkout_step', 'in', '("completed","expired")')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('customer_line_profiles')
        .select('metadata, display_name, customer_id')
        .eq('line_user_id', lineUserId)
        .limit(1)
        .maybeSingle(),
    ]);

    const localCart = cartResult.data?.[0];
    const profile = profileResult.data;

    if (!localCart?.medusa_cart_id) {
      return NextResponse.json({ error: 'No active cart', cart: null, shipping: null });
    }

    // 取 Medusa Cart
    const cartRes = await fetch(
      `${MEDUSA_URL}/store/carts/${localCart.medusa_cart_id}`,
      { headers: { 'x-publishable-api-key': MEDUSA_PK } }
    );

    if (!cartRes.ok) {
      return NextResponse.json({ error: 'Cart not found', cart: null });
    }

    const { cart: medusaCart } = await cartRes.json();

    const savedShipping = (profile?.metadata as any)?.shipping || {};
    const shipping = {
      name: localCart.shipping_name || savedShipping.name || profile?.display_name || '',
      phone: localCart.shipping_phone || savedShipping.phone || '',
      email: localCart.shipping_email || savedShipping.email || '',
      address: localCart.shipping_address || savedShipping.address || '',
    };

    return NextResponse.json({
      cart: medusaCart,
      shipping,
      localCartId: localCart.id,
      customerId: profile?.customer_id || null,
    });
  } catch (error) {
    console.error('LIFF cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
