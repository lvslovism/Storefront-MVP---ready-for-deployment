import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase, getMerchantCode } from '@/lib/supabase';

/**
 * 常用宅配地址 CRUD API
 */

interface AddressData {
  id?: string;
  label: string;
  name: string;
  phone: string;
  zip_code: string;
  city: string;
  district: string;
  address: string;
  is_default?: boolean;
}

// GET - 取得該會員所有地址
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }

    // 如果沒有 customer_id（例如 LINE 登入尚未完成會員綁定），回傳空資料
    if (!session.customer_id) {
      return NextResponse.json({ success: true, addresses: [] });
    }

    const { data, error } = await getSupabase()
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', getMerchantCode())
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Addresses GET] Error:', error);
      return NextResponse.json({ success: false, error: '讀取失敗' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      addresses: data || [],
    });
  } catch (error) {
    console.error('[Addresses GET] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// POST - 新增地址
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }
    if (!session.customer_id) {
      return NextResponse.json({ success: false, error: '帳號尚未完成會員綁定' }, { status: 403 });
    }

    const body: AddressData = await request.json();
    const { label, name, phone, zip_code, city, district, address, is_default } = body;

    // 驗證必填欄位
    if (!label || !name || !phone || !city || !district || !address) {
      return NextResponse.json({ success: false, error: '請填寫完整地址資料' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 如果設為預設，先把其他地址的 is_default 設為 false
    if (is_default) {
      await getSupabase()
        .from('customer_addresses')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('customer_id', session.customer_id)
        .eq('merchant_code', merchantCode);
    }

    // 新增地址
    const { data, error } = await getSupabase()
      .from('customer_addresses')
      .insert({
        customer_id: session.customer_id,
        merchant_code: merchantCode,
        label,
        name,
        phone,
        zip_code: zip_code || '',
        city,
        district,
        address,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Addresses POST] Error:', error);
      return NextResponse.json({ success: false, error: '新增失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true, address: data });
  } catch (error) {
    console.error('[Addresses POST] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// PUT - 更新地址
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 });
    }
    if (!session.customer_id) {
      return NextResponse.json({ success: false, error: '帳號尚未完成會員綁定' }, { status: 403 });
    }

    const body: AddressData = await request.json();
    const { id, label, name, phone, zip_code, city, district, address, is_default } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少地址 ID' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 驗證是否為該用戶的地址
    const { data: existing } = await getSupabase()
      .from('customer_addresses')
      .select('id')
      .eq('id', id)
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: '地址不存在' }, { status: 404 });
    }

    // 如果設為預設，先把其他地址的 is_default 設為 false
    if (is_default) {
      await getSupabase()
        .from('customer_addresses')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('customer_id', session.customer_id)
        .eq('merchant_code', merchantCode)
        .neq('id', id);
    }

    // 更新地址
    const { data, error } = await getSupabase()
      .from('customer_addresses')
      .update({
        label,
        name,
        phone,
        zip_code: zip_code || '',
        city,
        district,
        address,
        is_default: is_default || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Addresses PUT] Error:', error);
      return NextResponse.json({ success: false, error: '更新失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true, address: data });
  } catch (error) {
    console.error('[Addresses PUT] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}

// DELETE - 刪除地址
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
      return NextResponse.json({ success: false, error: '缺少地址 ID' }, { status: 400 });
    }

    const merchantCode = getMerchantCode();

    // 驗證是否為該用戶的地址
    const { data: existing } = await getSupabase()
      .from('customer_addresses')
      .select('id')
      .eq('id', id)
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: '地址不存在' }, { status: 404 });
    }

    // 刪除地址
    const { error } = await getSupabase()
      .from('customer_addresses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Addresses DELETE] Error:', error);
      return NextResponse.json({ success: false, error: '刪除失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Addresses DELETE] Error:', error);
    return NextResponse.json({ success: false, error: '系統錯誤' }, { status: 500 });
  }
}
