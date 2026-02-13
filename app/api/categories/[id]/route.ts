// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MERCHANT_CODE = process.env.MERCHANT_CODE || 'default';

// Fire-and-forget revalidation
function triggerRevalidation() {
  const storefrontUrl = process.env.STOREFRONT_URL || 'https://shop.minjie0326.com';
  const secret = process.env.REVALIDATE_SECRET || '';

  fetch(`${storefrontUrl}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, path: '/products' })
  }).catch(e => console.error('Revalidation failed:', e));
}

// GET - 取得單一分類
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('cms_storefront_categories')
      .select('*')
      .eq('id', params.id)
      .eq('merchant_code', MERCHANT_CODE)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category: data });
  } catch (error: any) {
    console.error('[Categories GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// PUT - 更新分類
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { label, slug, filter_type, filter_value, custom_filter, icon_url, sort_order, show_in_nav, show_in_home } = body;

    const updateData: Record<string, any> = {};
    if (label !== undefined) updateData.label = label;
    if (slug !== undefined) updateData.slug = slug;
    if (filter_type !== undefined) updateData.filter_type = filter_type;
    if (filter_value !== undefined) updateData.filter_value = filter_value;
    if (custom_filter !== undefined) updateData.custom_filter = custom_filter;
    if (icon_url !== undefined) updateData.icon_url = icon_url;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (show_in_nav !== undefined) updateData.show_in_nav = show_in_nav;
    if (show_in_home !== undefined) updateData.show_in_home = show_in_home;

    const { data, error } = await supabase
      .from('cms_storefront_categories')
      .update(updateData)
      .eq('id', params.id)
      .eq('merchant_code', MERCHANT_CODE)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // 觸發前台 revalidation
    triggerRevalidation();

    return NextResponse.json({ category: data });
  } catch (error: any) {
    console.error('[Categories PUT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - 刪除分類
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('cms_storefront_categories')
      .delete()
      .eq('id', params.id)
      .eq('merchant_code', MERCHANT_CODE);

    if (error) throw error;

    // 觸發前台 revalidation
    triggerRevalidation();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Categories DELETE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}
