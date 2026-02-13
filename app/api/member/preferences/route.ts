import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase, getMerchantCode } from '@/lib/supabase';

/**
 * 會員偏好設定 API
 */

// GET - 讀取偏好
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }

    // 如果沒有 customer_id（例如 LINE 登入尚未完成會員綁定），回傳預設偏好
    if (!session.customer_id) {
      return NextResponse.json({ success: true, preferences: { preferred_shipping: null } });
    }

    const { data, error } = await getSupabase()
      .from('customer_preferences')
      .select('*')
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', getMerchantCode())
      .maybeSingle();

    if (error) {
      console.error('[Preferences GET] Error:', error);
      return NextResponse.json({ success: false, error: '讀取失敗' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: data || { preferred_shipping: null },
    });
  } catch (error) {
    console.error('[Preferences GET] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// PUT - 更新偏好
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }
    if (!session.customer_id) {
      return NextResponse.json({ success: false, error: '帳號尚未完成會員綁定' }, { status: 403 });
    }

    const body = await request.json();
    const { preferred_shipping } = body;

    // 驗證 preferred_shipping 值
    const validValues = ['cvs', 'home', null];
    if (!validValues.includes(preferred_shipping)) {
      return NextResponse.json({ success: false, error: '無效的配送偏好' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 檢查是否已有偏好記錄
    const { data: existing } = await getSupabase()
      .from('customer_preferences')
      .select('id')
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode)
      .maybeSingle();

    let result;
    if (existing) {
      // 更新
      const { data, error } = await getSupabase()
        .from('customer_preferences')
        .update({
          preferred_shipping,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[Preferences PUT] Update error:', error);
        return NextResponse.json({ success: false, error: '更新失敗' }, { status: 500 });
      }
      result = data;
    } else {
      // 新增
      const { data, error } = await getSupabase()
        .from('customer_preferences')
        .insert({
          customer_id: session.customer_id,
          merchant_code: merchantCode,
          preferred_shipping,
        })
        .select()
        .single();

      if (error) {
        console.error('[Preferences PUT] Insert error:', error);
        return NextResponse.json({ success: false, error: '儲存失敗' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ success: true, preferences: result });
  } catch (error) {
    console.error('[Preferences PUT] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}
