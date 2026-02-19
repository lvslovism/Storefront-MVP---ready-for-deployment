import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getSupabase } from '@/lib/supabase';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'minjie0326.com';

export async function POST() {
  try {
    const supabase = getSupabase();

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'required',
      timeout: 300000,
    });

    // 存 challenge
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: challengeError } = await supabase
      .from('webauthn_challenges')
      .insert({
        challenge: options.challenge,
        ceremony_type: 'authentication',
        user_type: null,
        user_id: null,
        rp_id: RP_ID,
        expires_at: expiresAt,
      });

    if (challengeError) {
      console.error('[Passkey Auth Options] Challenge insert error:', challengeError);
      return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({ options });
  } catch (error) {
    console.error('[Passkey Auth Options] Error:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
