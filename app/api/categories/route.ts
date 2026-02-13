// app/api/categories/route.ts
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

// GET - 取得所有分類
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cms_storefront_categories')
      .select('*')
      .eq('merchant_code', MERCHANT_CODE)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories: data });
  } catch (error: any) {
    console.error('[Categories GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - 建立新分類
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, slug, filter_type, filter_value, custom_filter, icon_url, sort_order, show_in_nav, show_in_home } = body;

    if (!label || !slug) {
      return NextResponse.json(
        { error: 'label and slug are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cms_storefront_categories')
      .insert({
        merchant_code: MERCHANT_CODE,
        label,
        slug,
        filter_type: filter_type || 'all',
        filter_value: filter_value || null,
        custom_filter: custom_filter || {},
        icon_url: icon_url || null,
        sort_order: sort_order || 0,
        show_in_nav: show_in_nav ?? true,
        show_in_home: show_in_home ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    // 觸發前台 revalidation
    triggerRevalidation();

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error: any) {
    console.error('[Categories POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
