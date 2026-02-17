import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

/**
 * POST /api/auth/logout
 *
 * 清除 session cookie，回傳 { success: true }
 * 不需要驗證登入狀態（已登出的人再 call 也不報錯）
 */
export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
