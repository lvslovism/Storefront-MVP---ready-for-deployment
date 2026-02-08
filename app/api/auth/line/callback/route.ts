import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || '';
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET || '';
const LINE_LOGIN_CALLBACK_URL = process.env.LINE_LOGIN_CALLBACK_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineSession {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  customer_id: string | null;
  linked_at: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 處理 LINE 授權錯誤
  if (error) {
    console.error('LINE Login error:', error);
    return NextResponse.redirect(new URL('/?error=line_login_failed', request.url));
  }

  // 驗證 code 和 state
  if (!code || !state) {
    console.error('Missing code or state');
    return NextResponse.redirect(new URL('/?error=invalid_callback', request.url));
  }

  // 驗證 state（CSRF protection）
  const cookieStore = await cookies();
  const savedState = cookieStore.get('line_login_state')?.value;

  if (!savedState || savedState !== state) {
    console.error('Invalid state');
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
  }

  // 清除 state cookie
  cookieStore.delete('line_login_state');

  try {
    // 1. 換取 access_token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: LINE_LOGIN_CALLBACK_URL,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
    }

    const tokenData: LineTokenResponse = await tokenResponse.json();

    // 2. 取得用戶資料
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Profile fetch failed');
      return NextResponse.redirect(new URL('/?error=profile_fetch_failed', request.url));
    }

    const profile: LineProfile = await profileResponse.json();
    console.log('LINE Profile:', profile.userId, profile.displayName);

    // 3. 查/建 Supabase customer_line_profiles
    let customerId: string | null = null;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // 查詢現有 profile
      const profileQueryResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/customer_line_profiles?line_user_id=eq.${profile.userId}&select=*`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (profileQueryResponse.ok) {
        const profiles = await profileQueryResponse.json();

        if (profiles.length > 0) {
          // 已存在，取得 customer_id
          customerId = profiles[0].customer_id;
          console.log('Existing profile found, customer_id:', customerId);

          // 更新 display_name 和 picture_url
          await fetch(
            `${SUPABASE_URL}/rest/v1/customer_line_profiles?line_user_id=eq.${profile.userId}`,
            {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                display_name: profile.displayName,
                picture_url: profile.pictureUrl || null,
                last_active_at: new Date().toISOString(),
              }),
            }
          );
        } else {
          // 不存在，建立新的
          console.log('Creating new profile');
          await fetch(`${SUPABASE_URL}/rest/v1/customer_line_profiles`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              line_user_id: profile.userId,
              display_name: profile.displayName,
              picture_url: profile.pictureUrl || null,
              last_active_at: new Date().toISOString(),
            }),
          });
        }
      }
    }

    // 4. 設定 session cookie
    const session: LineSession = {
      line_user_id: profile.userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl || null,
      customer_id: customerId,
      linked_at: new Date().toISOString(),
    };

    cookieStore.set('line_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    });

    console.log('LINE Login successful:', profile.displayName);

    // 5. 跳轉回首頁
    return NextResponse.redirect(new URL('/?login=success', request.url));
  } catch (error) {
    console.error('LINE Login callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_error', request.url));
  }
}
