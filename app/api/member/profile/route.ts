import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getEmailUserById,
  getLineProfileByCustomerId,
  getSupabase,
  getMerchantCode,
} from '@/lib/supabase';

/**
 * GET /api/member/profile
 *
 * 取得會員個人資料
 */
export async function GET() {
  try {
    // ===== 驗證 Session =====
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      );
    }

    // ===== 根據登入方式取得資料 =====
    let profile: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      picture_url: string | null;
      auth_method: 'line' | 'email';
      line_connected: boolean;
      email_connected: boolean;
      customer_id: string | null;
    };

    const authMethod = session.auth_method || 'line';

    if (authMethod === 'email' && session.email_user_id) {
      // Email 登入
      const emailUser = await getEmailUserById(session.email_user_id);
      if (!emailUser) {
        return NextResponse.json(
          { success: false, error: '找不到用戶資料' },
          { status: 404 }
        );
      }

      // 檢查是否有關聯的 LINE 帳號
      const lineProfile = session.customer_id
        ? await getLineProfileByCustomerId(session.customer_id)
        : null;

      profile = {
        id: emailUser.id,
        name: emailUser.name,
        email: emailUser.email,
        phone: emailUser.phone,
        picture_url: null,
        auth_method: 'email',
        line_connected: !!lineProfile,
        email_connected: true,
        customer_id: session.customer_id,
      };
    } else if (session.line_user_id) {
      // LINE 登入
      const lineProfile = session.customer_id
        ? await getLineProfileByCustomerId(session.customer_id)
        : null;

      profile = {
        id: session.line_user_id,
        name: session.display_name,
        email: lineProfile?.email || null,
        phone: lineProfile?.phone || null,
        picture_url: session.picture_url,
        auth_method: 'line',
        line_connected: true,
        email_connected: false, // TODO: 檢查是否有關聯的 Email 帳號
        customer_id: session.customer_id,
      };
    } else {
      return NextResponse.json(
        { success: false, error: '無效的 Session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('[Profile GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/member/profile
 *
 * 更新會員個人資料
 *
 * Request Body:
 * - name?: string
 * - phone?: string
 */
export async function PUT(request: NextRequest) {
  try {
    // ===== 驗證 Session =====
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone } = body;

    // ===== 驗證資料 =====
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: '姓名不可為空' },
        { status: 400 }
      );
    }

    const authMethod = session.auth_method || 'line';

    if (authMethod === 'email' && session.email_user_id) {
      // 更新 email_users
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (name !== undefined) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone || null;

      const { error } = await getSupabase()
        .from('email_users')
        .update(updateData)
        .eq('id', session.email_user_id);

      if (error) {
        console.error('[Profile PUT] Update error:', error);
        return NextResponse.json(
          { success: false, error: '更新失敗，請稍後再試' },
          { status: 500 }
        );
      }
    } else if (session.line_user_id && session.customer_id) {
      // 更新 customer_line_profiles
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.display_name = name.trim();
      if (phone !== undefined) updateData.phone = phone || null;

      if (Object.keys(updateData).length > 0) {
        const { error } = await getSupabase()
          .from('customer_line_profiles')
          .update(updateData)
          .eq('customer_id', session.customer_id)
          .eq('merchant_code', getMerchantCode());

        if (error) {
          console.error('[Profile PUT] Update error:', error);
          return NextResponse.json(
            { success: false, error: '更新失敗，請稍後再試' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '個人資料已更新',
    });
  } catch (error) {
    console.error('[Profile PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
