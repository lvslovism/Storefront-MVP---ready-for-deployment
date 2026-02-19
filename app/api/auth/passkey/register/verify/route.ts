import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'minjie0326.com';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://shop.minjie0326.com';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.customer_id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const customerId = session.customer_id;
    const body = await request.json();
    const { response, deviceName } = body as {
      response: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!response) {
      return NextResponse.json({ error: '缺少驗證資料' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 查 challenge
    const { data: challengeRow, error: challengeQueryError } = await supabase
      .from('webauthn_challenges')
      .select('*')
      .eq('ceremony_type', 'registration')
      .eq('user_type', 'customer')
      .eq('user_id', customerId)
      .eq('rp_id', RP_ID)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeQueryError || !challengeRow) {
      return NextResponse.json({ error: '驗證已過期，請重新操作' }, { status: 400 });
    }

    // 驗證 registration
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: '驗證失敗' }, { status: 400 });
    }

    const { credential, credentialDeviceType, aaguid } = verification.registrationInfo;

    // 刪除 challenge
    await supabase
      .from('webauthn_challenges')
      .delete()
      .eq('id', challengeRow.id);

    // 寫入 credential
    const { error: insertError } = await supabase
      .from('webauthn_credentials')
      .insert({
        user_type: 'customer',
        user_id: customerId,
        credential_id: credential.id,
        public_key: '\\x' + Buffer.from(credential.publicKey).toString('hex'),
        counter: credential.counter,
        device_name: deviceName || '未命名裝置',
        device_type: credentialDeviceType || 'platform',
        aaguid: aaguid || null,
        transports: credential.transports || [],
        rp_id: RP_ID,
        is_active: true,
      });

    if (insertError) {
      console.error('[Passkey Register Verify] Insert error:', insertError);
      return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      credential: {
        id: credential.id,
        deviceName: deviceName || '未命名裝置',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Passkey Register Verify] Error:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
