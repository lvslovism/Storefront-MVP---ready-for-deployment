import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.customer_id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const supabase = getSupabase();
    const rpId = process.env.WEBAUTHN_RP_ID || 'minjie0326.com';

    const { data: credentials, error } = await supabase
      .from('webauthn_credentials')
      .select('id, device_name, device_type, last_used_at, created_at')
      .eq('rp_id', rpId)
      .eq('user_type', 'customer')
      .eq('user_id', session.customer_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Passkey Credentials] Query error:', error);
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    return NextResponse.json({ credentials: credentials || [] });
  } catch (error) {
    console.error('[Passkey Credentials] Error:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
