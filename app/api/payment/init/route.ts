import { NextRequest, NextResponse } from 'next/server';
import { medusa } from '@/lib/config';

const BACKEND_URL = medusa.backendUrl;
const PUBLISHABLE_KEY = medusa.publishableKey;

/**
 * POST /api/payment/init
 * Server-side proxy for Medusa payment collection initialization
 * Avoids CORS issues by running on the server
 */
export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { success: false, error: 'Missing cartId' },
        { status: 400 }
      );
    }

    console.log('[Payment Init] Starting for cart:', cartId);

    // 1. Initialize payment collection
    const collectionRes = await fetch(
      `${BACKEND_URL}/store/carts/${cartId}/payment-collections`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
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

    // 2. Create payment session with pp_system_default
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

    return NextResponse.json({
      success: true,
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
