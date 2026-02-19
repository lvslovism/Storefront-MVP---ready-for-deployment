import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { setSession } from '@/lib/auth';
import type { Session } from '@/lib/auth';
import { getSupabase, getMerchantCode } from '@/lib/supabase';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'minjie0326.com';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://shop.minjie0326.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response } = body as { response: AuthenticationResponseJSON };

    if (!response) {
      return NextResponse.json({ error: '缺少驗證資料' }, { status: 400 });
    }

    const supabase = getSupabase();
    const merchantCode = getMerchantCode();

    // 查 credential
    const { data: credRow, error: credError } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', response.id)
      .eq('rp_id', RP_ID)
      .eq('is_active', true)
      .single();

    if (credError || !credRow) {
      return NextResponse.json({ error: '找不到此裝置的登入資訊' }, { status: 404 });
    }

    // 查 challenge
    const { data: challengeRow, error: challengeError } = await supabase
      .from('webauthn_challenges')
      .select('*')
      .eq('ceremony_type', 'authentication')
      .eq('rp_id', RP_ID)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeRow) {
      return NextResponse.json({ error: '驗證已過期，請重新操作' }, { status: 400 });
    }

    // public_key 從 DB BYTEA 轉 Uint8Array
    const publicKeyBytes = Buffer.from(credRow.public_key, 'base64');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credRow.credential_id,
        publicKey: new Uint8Array(publicKeyBytes),
        counter: Number(credRow.counter),
        transports: credRow.transports as AuthenticatorTransport[] | undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: '驗證失敗' }, { status: 400 });
    }

    // 刪除 challenge
    await supabase
      .from('webauthn_challenges')
      .delete()
      .eq('id', challengeRow.id);

    // 更新 counter + last_used_at
    await supabase
      .from('webauthn_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', credRow.id);

    // 查用戶資料以建立 session
    const customerId = credRow.user_id;

    // 先查 email_users
    const { data: emailUser } = await supabase
      .from('email_users')
      .select('id, email, name, customer_id')
      .eq('customer_id', customerId)
      .eq('merchant_code', merchantCode)
      .maybeSingle();

    // 再查 LINE profile
    const { data: lineProfile } = await supabase
      .from('customer_line_profiles')
      .select('line_user_id, display_name, picture_url, customer_id')
      .eq('customer_id', customerId)
      .eq('merchant_code', merchantCode)
      .maybeSingle();

    // 建立 session（跟 LINE callback / Email login 完全一致）
    const session: Session = {
      display_name: emailUser?.name || lineProfile?.display_name || '用戶',
      picture_url: lineProfile?.picture_url || null,
      customer_id: customerId,
      linked_at: new Date().toISOString(),
      auth_method: 'passkey',
    };

    // 補上原始登入來源欄位
    if (emailUser) {
      session.email_user_id = emailUser.id;
      session.email = emailUser.email;
    }
    if (lineProfile) {
      session.line_user_id = lineProfile.line_user_id;
    }

    await setSession(session);

    return NextResponse.json({
      success: true,
      user: {
        display_name: session.display_name,
        customer_id: customerId,
        auth_method: 'passkey',
      },
    });
  } catch (error) {
    console.error('[Passkey Auth Verify] Error:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
