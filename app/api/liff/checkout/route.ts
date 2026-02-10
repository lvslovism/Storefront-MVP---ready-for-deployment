import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'https://medusa-store-minjie-production.up.railway.app';
const MEDUSA_PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || 'pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2';
const GATEWAY_URL = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_URL || 'https://ecpay-gateway-production.up.railway.app';
// FIX MEDIUM-1: API Key 從環境變數讀，不查 DB
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lineUserId, medusaCartId, shipping, shippingMethod, localCartId } = body;

    console.log('=== LIFF CHECKOUT START ===');
    console.log('Cart:', medusaCartId, 'User:', lineUserId, 'Method:', shippingMethod);

    // ===================================================
    // Step A: 更新 Medusa Cart 收件資訊
    // ===================================================
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
        billing_address: {
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

    if (!addressRes.ok) {
      const errText = await addressRes.text();
      console.error('STEP A FAILED - Address:', addressRes.status, errText);
      return NextResponse.json({ error: '設定收件資訊失敗', detail: errText }, { status: 500 });
    }
    console.log('STEP A OK - Address set');

    // ===================================================
    // Step B: 選擇正確的 Shipping Option
    // FIX HIGH-1: 根據 shippingMethod 選對應的 option，不要盲選
    // ===================================================
    const optionsRes = await fetch(
      `${MEDUSA_URL}/store/shipping-options?cart_id=${medusaCartId}`,
      { headers: { 'x-publishable-api-key': MEDUSA_PK } }
    );
    const optionsData = await optionsRes.json();
    const options = optionsData.shipping_options || [];
    console.log('STEP B - Shipping options:', JSON.stringify(options.map((o: any) => ({ id: o.id, name: o.name, amount: o.amount }))));

    if (options.length === 0) {
      return NextResponse.json({ error: '沒有可用的配送方式' }, { status: 500 });
    }

    // 根據用戶選擇匹配 shipping option
    // Medusa shipping option name 可能是「宅配」「超商取貨」等
    let selectedOption = options[0]; // fallback
    if (shippingMethod === 'cvs_pickup') {
      const cvsOption = options.find((o: any) =>
        (o.name || '').includes('超商') || (o.name || '').includes('CVS') || (o.name || '').includes('cvs')
      );
      if (cvsOption) selectedOption = cvsOption;
    } else {
      const homeOption = options.find((o: any) =>
        (o.name || '').includes('宅配') || (o.name || '').includes('Home') || (o.name || '').includes('home')
      );
      if (homeOption) selectedOption = homeOption;
    }
    console.log('STEP B - Selected:', selectedOption.id, selectedOption.name);

    const shippingRes = await fetch(`${MEDUSA_URL}/store/carts/${medusaCartId}/shipping-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PK,
      },
      body: JSON.stringify({ option_id: selectedOption.id }),
    });

    if (!shippingRes.ok) {
      const errText = await shippingRes.text();
      console.error('STEP B FAILED - Shipping method:', shippingRes.status, errText);
      // 不中斷，繼續（有些 Medusa 設定允許沒有 shipping method）
    } else {
      console.log('STEP B OK - Shipping method set');
    }

    // ===================================================
    // Step C: 初始化 Payment Collection + Session
    // ===================================================
    const pcRes = await fetch(`${MEDUSA_URL}/store/payment-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PK,
      },
      body: JSON.stringify({ cart_id: medusaCartId }),
    });

    if (!pcRes.ok) {
      const errText = await pcRes.text();
      console.error('STEP C FAILED - Payment collection:', pcRes.status, errText);
      return NextResponse.json({ error: '付款初始化失敗', detail: errText }, { status: 500 });
    }

    const pcData = await pcRes.json();
    const paymentCollectionId = pcData.payment_collection?.id;
    console.log('STEP C - Payment collection:', paymentCollectionId);

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

    if (!psRes.ok) {
      const errText = await psRes.text();
      console.error('STEP C WARNING - Payment session:', psRes.status, errText);
      // 不中斷，有時 session 已存在
    } else {
      console.log('STEP C OK - Payment session created');
    }

    // ===================================================
    // Step D: 重新取得 cart 確認最終金額
    // FIX CRITICAL-2: 確保金額正確
    // ===================================================
    const finalCartRes = await fetch(`${MEDUSA_URL}/store/carts/${medusaCartId}`, {
      headers: { 'x-publishable-api-key': MEDUSA_PK },
    });
    const { cart: finalCart } = await finalCartRes.json();

    // Medusa v2 TWD region: total 就是整數元（不是分）
    // 但要確認不是 0
    const totalAmount = finalCart.total || 0;
    const itemSubtotal = finalCart.item_subtotal || 0;
    const shippingTotal = finalCart.shipping_total || 0;
    const discountTotal = finalCart.discount_total || 0;

    console.log('STEP D - Final amounts:', {
      total: totalAmount,
      item_subtotal: itemSubtotal,
      shipping: shippingTotal,
      discount: discountTotal
    });

    if (totalAmount <= 0) {
      console.error('STEP D FAILED - Total is 0 or negative');
      return NextResponse.json({ error: '訂單金額異常，請重試' }, { status: 500 });
    }

    const itemNames = (finalCart.items || [])
      .map((i: any) => i.product_title || i.title)
      .join('#')
      .substring(0, 200) || 'MINJIE 商品';

    // ===================================================
    // Step E: 呼叫 ECPay Gateway
    // FIX CRITICAL-1: metadata 必須包含 cart_id
    // FIX MEDIUM-1: API key 從環境變數取
    // ===================================================

    // 如果環境變數沒設 API key，fallback 查 DB
    let apiKey = GATEWAY_API_KEY;
    if (!apiKey) {
      const { data: merchant } = await supabase
        .from('gateway_merchants')
        .select('api_key')
        .eq('code', 'minjie')
        .single();
      apiKey = merchant?.api_key || '';
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gateway 設定錯誤' }, { status: 500 });
    }

    const gatewayPayload = {
      cart_id: medusaCartId,
      amount: totalAmount,
      item_name: itemNames,
      customer_name: shipping.name,
      customer_email: shipping.email || `${lineUserId}@line.user`,
      customer_phone: shipping.phone,
      payment_method: 'Credit',
      // FIX CRITICAL-1: cart_id 必須在 metadata 裡
      // Gateway webhook 用 metadata.cart_id 來 complete Medusa cart
      metadata: {
        cart_id: medusaCartId,           // ★ 關鍵修復！
        source: 'line_bot',
        line_user_id: lineUserId,
        shipping_method: shippingMethod,
        shipping_fee: shippingTotal,
        discount_total: discountTotal,
      },
    };

    console.log('STEP E - Gateway payload:', JSON.stringify(gatewayPayload));

    const gatewayRes = await fetch(`${GATEWAY_URL}/api/v1/payment/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(gatewayPayload),
    });

    const gatewayData = await gatewayRes.json();
    console.log('STEP E - Gateway response:', gatewayRes.status, JSON.stringify(gatewayData));

    if (!gatewayRes.ok || !gatewayData.checkout_url) {
      return NextResponse.json({
        error: '建立付款失敗',
        detail: gatewayData
      }, { status: 500 });
    }

    console.log('STEP E OK - Checkout URL:', gatewayData.checkout_url);

    // ===================================================
    // Step F: 更新本地狀態 + 保存收件資訊（非阻塞）
    // ===================================================
    // 用 Promise.all 並行，不阻塞回覆
    await Promise.all([
      // 更新 line_bot_carts
      supabase
        .from('line_bot_carts')
        .update({
          checkout_step: 'awaiting_payment',
          shipping_name: shipping.name,
          shipping_phone: shipping.phone,
          shipping_email: shipping.email,
          shipping_address: shipping.address,
          shipping_method: shippingMethod,
        })
        .eq('id', localCartId),

      // 保存收件資訊到 customer_line_profiles（下次自動帶入）
      (async () => {
        const { data: existingProfile } = await supabase
          .from('customer_line_profiles')
          .select('metadata')
          .eq('line_user_id', lineUserId)
          .maybeSingle();

        if (existingProfile) {
          await supabase
            .from('customer_line_profiles')
            .update({
              metadata: {
                ...(existingProfile.metadata || {}),
                shipping: {
                  name: shipping.name,
                  phone: shipping.phone,
                  email: shipping.email,
                  address: shipping.address,
                },
                last_checkout_at: new Date().toISOString(),
              },
            })
            .eq('line_user_id', lineUserId);
        }
      })(),
    ]).catch(e => console.error('STEP F WARNING - Local update failed:', e));

    console.log('=== LIFF CHECKOUT SUCCESS ===');

    return NextResponse.json({
      success: true,
      checkout_url: gatewayData.checkout_url,
      trade_no: gatewayData.merchant_trade_no,
    });

  } catch (e) {
    console.error('LIFF checkout critical error:', e);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
