import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase, getMerchantCode } from '@/lib/supabase';

/**
 * 常用超商門市 CRUD API
 */

interface CvsStoreData {
  id?: string;
  cvs_type: 'UNIMARTC2C' | 'FAMIC2C' | 'HILIFEC2C';
  store_id: string;
  store_name: string;
  address: string;
  is_default?: boolean;
}

// GET - 取得該會員所有門市
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }

    // 如果沒有 customer_id（例如 LINE 登入尚未完成會員綁定），回傳空資料
    if (!session.customer_id) {
      return NextResponse.json({ success: true, stores: [] });
    }

    const { data, error } = await getSupabase()
      .from('customer_cvs_stores')
      .select('*')
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', getMerchantCode())
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CvsStores GET] Error:', error);
      return NextResponse.json({ success: false, error: '讀取失敗' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stores: data || [],
    });
  } catch (error) {
    console.error('[CvsStores GET] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// POST - 新增門市
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }
    if (!session.customer_id) {
      return NextResponse.json({ success: false, error: '帳號尚未完成會員綁定' }, { status: 403 });
    }

    const body: CvsStoreData = await request.json();
    const { cvs_type, store_id, store_name, address, is_default } = body;

    // 驗證必填欄位
    if (!cvs_type || !store_id || !store_name) {
      return NextResponse.json({ success: false, error: '請填寫完整門市資料' }, { status: 400 });
    }

    // 驗證 cvs_type
    const validTypes = ['UNIMARTC2C', 'FAMIC2C', 'HILIFEC2C'];
    if (!validTypes.includes(cvs_type)) {
      return NextResponse.json({ success: false, error: '無效的超商類型' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 如果設為預設，先把同類型的其他門市 is_default 設為 false
    if (is_default) {
      await getSupabase()
        .from('customer_cvs_stores')
        .update({ is_default: false })
        .eq('customer_id', session.customer_id)
        .eq('merchant_code', merchantCode)
        .eq('cvs_type', cvs_type);
    }

    // 新增門市
    const { data, error } = await getSupabase()
      .from('customer_cvs_stores')
      .insert({
        customer_id: session.customer_id,
        merchant_code: merchantCode,
        cvs_type,
        store_id,
        store_name,
        address: address || '',
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('[CvsStores POST] Error:', error);
      return NextResponse.json({ success: false, error: '新增失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true, store: data });
  } catch (error) {
    console.error('[CvsStores POST] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// PUT - 設為預設門市
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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少門市 ID' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 取得該門市資料
    const { data: existing } = await getSupabase()
      .from('customer_cvs_stores')
      .select('*')
      .eq('id', id)
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: '門市不存在' }, { status: 404 });
    }

    // 先把同類型的其他門市 is_default 設為 false
    await getSupabase()
      .from('customer_cvs_stores')
      .update({ is_default: false })
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode)
      .eq('cvs_type', existing.cvs_type);

    // 設為預設
    const { data, error } = await getSupabase()
      .from('customer_cvs_stores')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[CvsStores PUT] Error:', error);
      return NextResponse.json({ success: false, error: '更新失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true, store: data });
  } catch (error) {
    console.error('[CvsStores PUT] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// DELETE - 刪除門市
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }
    if (!session.customer_id) {
      return NextResponse.json({ success: false, error: '帳號尚未完成會員綁定' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少門市 ID' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 驗證是否為該用戶的門市
    const { data: existing } = await getSupabase()
      .from('customer_cvs_stores')
      .select('id')
      .eq('id', id)
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: '門市不存在' }, { status: 404 });
    }

    // 刪除門市
    const { error } = await getSupabase()
      .from('customer_cvs_stores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CvsStores DELETE] Error:', error);
      return NextResponse.json({ success: false, error: '刪除失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CvsStores DELETE] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}
