import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Session 可能來自 LINE 或 Email 登入
 * 使用 auth_method 欄位區分
 */
interface Session {
  // LINE 登入欄位
  line_user_id?: string;
  // Email 登入欄位
  email_user_id?: string;
  email?: string;
  // 共用欄位
  display_name: string;
  picture_url: string | null;
  customer_id: string | null;
  linked_at: string;
  auth_method?: 'line' | 'email' | 'passkey';
}

// GET: 取得當前 session
export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('line_session');

  if (!sessionCookie?.value) {
    return NextResponse.json({ logged_in: false });
  }

  try {
    const session: Session = JSON.parse(sessionCookie.value);

    // 向後相容：如果沒有 auth_method，預設為 line
    const authMethod = session.auth_method || 'line';

    return NextResponse.json({
      logged_in: true,
      auth_method: authMethod,
      // LINE 相關欄位
      line_user_id: session.line_user_id,
      // Email 相關欄位
      email_user_id: session.email_user_id,
      email: session.email,
      // 共用欄位
      display_name: session.display_name,
      picture_url: session.picture_url,
      customer_id: session.customer_id,
      linked_at: session.linked_at,
    });
  } catch {
    return NextResponse.json({ logged_in: false });
  }
}

// DELETE: 登出（清除 cookie）
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('line_session');

  return NextResponse.json({ success: true });
}
