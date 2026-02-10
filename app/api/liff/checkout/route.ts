import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || 'pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2';
const GATEWAY_URL = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_URL || 'https://ecpay-gateway-production.up.railway.app';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lineUserId, medusaCartId, shipping, shippingMethod, localCartId } = body;

    // shipping: { name, phone, email, address }
    // shippingMethod: 'home_delivery' | 'cvs_pickup'

    console.log('=== LIFF CHECKOUT START ===');
    console.log('Cart:', medusaCartId, 'User:', lineUserId);

    // === Step A: 更新 Medusa Cart 收件資訊 ===
    console.log('=== STEP A: Set shipping address ===');
    const addressRes = await fetch(`${MEDUSA_URL}/store/carts/${medusaCartId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PK,
      },
      body: JSON.stringify({
        email: shipping.email || `${lineUserId}@line.user`,
        shipping_address: {
          first_name: shipping.name,
          last_name: '',
          phone: shipping.phone,
          address_1: shipping.address,
          city: '台灣',
          province: '',
          postal_code: '000',
          country_code: 'tw',
        },
      }),
    });
    console.log('Address response:', addressRes.status);
    if (!addressRes.ok) {
      const errText = await addressRes.text();
      console.error('Address error:', errText);
      return NextResponse.json({ error: 'Failed to set address', detail: errText }, { status: 500 });
    }

    // === Step B: 取得 Shipping Options 並設定 ===
    console.log('=== STEP B: Shipping options ===');
    const optionsRes = await fetch(
      `${MEDUSA_URL}/store/shipping-options?cart_id=${medusaCartId}`,
      { headers: { 'x-publishable-api-key': MEDUSA_PK } }
    );
    const optionsData = await optionsRes.json();
    const options = optionsData.shipping_options || [];
    console.log('Available shipping options:', options.length, JSON.stringify(options.map((o: any) => ({ id: o.id, name: o.name }))));

    if (options.length === 0) {
      return NextResponse.json({ error: 'No shipping options available' }, { status: 500 });
    }

    // 選擇 shipping option（目前先用第一個）
    const selectedOption = options[0];
    const shippingRes = await fetch(`${MEDUSA_URL}/store/carts/${medusaCartId}/shipping-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PK,
      },
      body: JSON.stringify({ option_id: selectedOption.id }),
    });
    console.log('Shipping method response:', shippingRes.status);
    if (!shippingRes.ok) {
      const errText = await shippingRes.text();
      console.error('Shipping method error:', errText);
    }

    // === Step C: 初始化 Payment Collection ===
    console.log('=== STEP C: Payment initialization ===');

    // 先取得更新後的 cart
    const cartRes = await fetch(`${MEDUSA_URL}/store/carts/${medusaCartId}`, {
      headers: { 'x-publishable-api-key': MEDUSA_PK },
    });
    const { cart } = await cartRes.json();

    // 建立 payment collection
    const pcRes = await fetch(`${MEDUSA_URL}/store/payment-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PK,
      },
      body: JSON.stringify({ cart_id: medusaCartId }),
    });
    console.log('Payment collection response:', pcRes.status);

    if (!pcRes.ok) {
      const errText = await pcRes.text();
      console.error('Payment collection error:', errText);
      return NextResponse.json({ error: 'Payment init failed', detail: errText }, { status: 500 });
    }

    const pcData = await pcRes.json();
    const paymentCollectionId = pcData.payment_collection?.id;
    console.log('Payment collection ID:', paymentCollectionId);

    // 建立 payment session
    const psRes = await fetch(
      `${MEDUSA_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': MEDUSA_PK,
        },
        body: JSON.stringify({ provider_id: 'pp_system_default' }),
      }
    );
    console.log('Payment session response:', psRes.status);
    if (!psRes.ok) {
      const errText = await psRes.text();
      console.error('Payment session error:', errText);
    }

    // === Step D: 呼叫 ECPay Gateway ===
    console.log('=== STEP D: ECPay Gateway ===');

    // 取得 Gateway API Key
    const { data: merchant } = await supabase
      .from('gateway_merchants')
      .select('api_key')
      .eq('code', 'minjie')
      .single();

    if (!merchant?.api_key) {
      return NextResponse.json({ error: 'Gateway merchant not found' }, { status: 500 });
    }

    const totalAmount = cart.total || cart.item_subtotal || 0;
    const itemNames = (cart.items || []).map((i: any) => i.product_title || i.title).join('#');

    const gatewayRes = await fetch(`${GATEWAY_URL}/api/v1/payment/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': merchant.api_key,
      },
      body: JSON.stringify({
        cart_id: medusaCartId,
        amount: totalAmount,
        item_name: itemNames.substring(0, 200) || 'MINJIE 商品',
        customer_name: shipping.name,
        customer_email: shipping.email || `${lineUserId}@line.user`,
        customer_phone: shipping.phone,
        payment_method: 'Credit',
        metadata: {
          source: 'line_bot',
          line_user_id: lineUserId,
          shipping_method: shippingMethod,
        },
      }),
    });

    console.log('Gateway response:', gatewayRes.status);
    const gatewayData = await gatewayRes.json();
    console.log('Gateway data:', JSON.stringify(gatewayData));

    if (!gatewayRes.ok || !gatewayData.checkout_url) {
      return NextResponse.json({
        error: 'Gateway checkout failed',
        detail: gatewayData
      }, { status: 500 });
    }

    // === Step E: 更新本地狀態 + 保存收件資訊 ===
    console.log('=== STEP E: Update local state ===');

    // 更新 line_bot_carts
    await supabase
      .from('line_bot_carts')
      .update({
        checkout_step: 'awaiting_payment',
        shipping_name: shipping.name,
        shipping_phone: shipping.phone,
        shipping_email: shipping.email,
        shipping_address: shipping.address,
        shipping_method: shippingMethod,
      })
      .eq('id', localCartId);

    // 保存收件資訊到 customer_line_profiles.metadata（下次自動帶入）
    const { data: existingProfile } = await supabase
      .from('customer_line_profiles')
      .select('metadata')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    const updatedMetadata = {
      ...((existingProfile?.metadata as object) || {}),
      shipping: {
        name: shipping.name,
        phone: shipping.phone,
        email: shipping.email,
        address: shipping.address,
      },
      last_checkout_at: new Date().toISOString(),
    };

    await supabase
      .from('customer_line_profiles')
      .update({ metadata: updatedMetadata })
      .eq('line_user_id', lineUserId);

    console.log('=== LIFF CHECKOUT SUCCESS ===');

    return NextResponse.json({
      success: true,
      checkout_url: gatewayData.checkout_url,
      trade_no: gatewayData.merchant_trade_no,
    });

  } catch (e) {
    console.error('LIFF checkout error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
