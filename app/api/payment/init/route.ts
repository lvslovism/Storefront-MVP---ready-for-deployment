import { NextRequest, NextResponse } from 'next/server';
import { medusa } from '@/lib/config';

const BACKEND_URL = medusa.backendUrl;
const PUBLISHABLE_KEY = medusa.publishableKey;

// 外部配送 shipping option（由 ECPay 處理，0 元）
const EXTERNAL_SHIPPING_OPTION_ID = 'so_01KGT10N7MH9ACTVKJE5G223G8';

interface CustomerInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

/**
 * POST /api/payment/init
 * Server-side proxy for Medusa cart checkout initialization
 * 1. Update cart with customer info (optional)
 * 2. Add shipping method to cart
 * 3. Initialize payment collection
 * 4. Create payment session with pp_system_default
 */
export async function POST(request: NextRequest) {
  try {
    const { cartId, customerInfo } = await request.json() as {
      cartId: string;
      customerInfo?: CustomerInfo;
    };

    if (!cartId) {
      return NextResponse.json(
        { success: false, error: 'Missing cartId' },
        { status: 400 }
      );
    }

    console.log('[Payment Init] Starting for cart:', cartId);

    // 1. Update cart with customer info (non-blocking)
    if (customerInfo) {
      try {
        console.log('[Payment Init] Updating customer info...');
        const updateRes = await fetch(
          `${BACKEND_URL}/store/carts/${cartId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-publishable-api-key': PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              email: customerInfo.email || undefined,
              shipping_address: {
                first_name: customerInfo.firstName || 'Customer',
                last_name: customerInfo.lastName || '.',
                phone: customerInfo.phone || '',
                address_1: customerInfo.address || '超商取貨',
                city: customerInfo.city || 'Taiwan',
                country_code: 'tw',
                postal_code: customerInfo.postalCode || '000',
              },
            }),
          }
        );

        if (updateRes.ok) {
          console.log('[Payment Init] Customer info updated successfully');
        } else {
          const errorData = await updateRes.json().catch(() => ({}));
          console.warn('[Payment Init] Failed to update customer info (non-blocking):', errorData.message || updateRes.status);
        }
      } catch (updateErr: any) {
        console.warn('[Payment Init] Error updating customer info (non-blocking):', updateErr.message);
      }
    }

    // 2. Add shipping method to cart (was step 1)
    console.log('[Payment Init] Adding shipping method...');
    const shippingRes = await fetch(
      `${BACKEND_URL}/store/carts/${cartId}/shipping-methods`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ option_id: EXTERNAL_SHIPPING_OPTION_ID }),
      }
    );

    if (!shippingRes.ok) {
      const errorData = await shippingRes.json().catch(() => ({}));
      console.error('[Payment Init] Failed to add shipping method:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || `Failed to add shipping method: ${shippingRes.status}`
        },
        { status: shippingRes.status }
      );
    }

    const shippingData = await shippingRes.json();
    const shippingMethodId = shippingData.cart?.shipping_methods?.[0]?.id;
    console.log('[Payment Init] Shipping method added:', shippingMethodId);

    // 3. Initialize payment collection (was step 2)
    console.log('[Payment Init] Creating payment collection...');
    const collectionRes = await fetch(
      `${BACKEND_URL}/store/payment-collections`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ cart_id: cartId }),
      }
    );

    if (!collectionRes.ok) {
      const errorData = await collectionRes.json().catch(() => ({}));
      console.error('[Payment Init] Failed to create collection:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || `Failed to create payment collection: ${collectionRes.status}`
        },
        { status: collectionRes.status }
      );
    }

    const collectionData = await collectionRes.json();
    const paymentCollectionId = collectionData.payment_collection?.id;

    if (!paymentCollectionId) {
      console.error('[Payment Init] No payment_collection.id in response:', collectionData);
      return NextResponse.json(
        { success: false, error: 'Invalid payment collection response' },
        { status: 500 }
      );
    }

    console.log('[Payment Init] Collection created:', paymentCollectionId);

    // 4. Create payment session with pp_system_default (was step 3)
    console.log('[Payment Init] Creating payment session...');
    const sessionRes = await fetch(
      `${BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ provider_id: 'pp_system_default' }),
      }
    );

    if (!sessionRes.ok) {
      const errorData = await sessionRes.json().catch(() => ({}));
      console.error('[Payment Init] Failed to create session:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || `Failed to create payment session: ${sessionRes.status}`
        },
        { status: sessionRes.status }
      );
    }

    const sessionData = await sessionRes.json();
    const paymentSessionId = sessionData.payment_session?.id;

    console.log('[Payment Init] Session created:', paymentSessionId);
    console.log('[Payment Init] All steps completed successfully');

    return NextResponse.json({
      success: true,
      shippingMethodId,
      collectionId: paymentCollectionId,
      sessionId: paymentSessionId,
      provider: 'pp_system_default',
    });

  } catch (error: any) {
    console.error('[Payment Init] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
