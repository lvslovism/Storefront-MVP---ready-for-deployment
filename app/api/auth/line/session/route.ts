import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface LineSession {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  customer_id: string | null;
  linked_at: string;
}

// GET: 取得當前 session
export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('line_session');

  if (!sessionCookie?.value) {
    return NextResponse.json({ logged_in: false });
  }

  try {
    const session: LineSession = JSON.parse(sessionCookie.value);
    return NextResponse.json({
      logged_in: true,
      ...session,
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
