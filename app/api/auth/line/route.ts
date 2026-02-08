import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || '';
const LINE_LOGIN_CALLBACK_URL = process.env.LINE_LOGIN_CALLBACK_URL || '';

// 產生隨機 state（CSRF protection）
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function GET() {
  // 產生 state 並存到 cookie
  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set('line_login_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 分鐘
    path: '/',
  });

  // 組合 LINE 授權 URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: LINE_LOGIN_CALLBACK_URL,
    state: state,
    scope: 'profile openid email',
  });

  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;

  // 跳轉到 LINE 授權頁
  return NextResponse.redirect(authUrl);
}
