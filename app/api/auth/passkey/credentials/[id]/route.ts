import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.customer_id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '缺少 ID' }, { status: 400 });
    }

    const supabase = getSupabase();
    const rpId = process.env.WEBAUTHN_RP_ID || 'minjie0326.com';

    // 軟刪除：只能刪自己的
    const { data, error } = await supabase
      .from('webauthn_credentials')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('rp_id', rpId)
      .eq('user_type', 'customer')
      .eq('user_id', session.customer_id)
      .eq('is_active', true)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '找不到此裝置' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Passkey Delete] Error:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
