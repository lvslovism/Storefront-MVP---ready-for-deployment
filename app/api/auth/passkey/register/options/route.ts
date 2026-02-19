import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'MINJIE STUDIO';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'minjie0326.com';

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.customer_id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const customerId = session.customer_id;
    const displayName = session.display_name || customerId;
    const email = session.email || customerId;

    const supabase = getSupabase();

    // 查已有的 credentials 做 excludeCredentials
    const { data: existingCreds } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('rp_id', RP_ID)
      .eq('user_type', 'customer')
      .eq('user_id', customerId)
      .eq('is_active', true);

    const excludeCredentials = (existingCreds || []).map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: email,
      userDisplayName: displayName,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
      excludeCredentials,
      timeout: 300000,
    });

    // 存 challenge
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: challengeError } = await supabase
      .from('webauthn_challenges')
      .insert({
        challenge: options.challenge,
        ceremony_type: 'registration',
        user_type: 'customer',
        user_id: customerId,
        rp_id: RP_ID,
        expires_at: expiresAt,
      });

    if (challengeError) {
      console.error('[Passkey Register Options] Challenge insert error:', challengeError);
      return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({ options });
  } catch (error) {
    console.error('[Passkey Register Options] Error:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
