import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase, getMerchantCode, initMemberTier, initMemberWallet } from '@/lib/supabase';
import { medusa } from '@/lib/config';

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || '';
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET || '';
const LINE_LOGIN_CALLBACK_URL = process.env.LINE_LOGIN_CALLBACK_URL || '';

const MEDUSA_BACKEND_URL = medusa.backendUrl;

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

interface LineIdTokenPayload {
  email?: string;
  name?: string;
  picture?: string;
  sub: string; // LINE user ID
}

interface LineSession {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  customer_id: string | null;
  linked_at: string;
  auth_method: 'line' | 'email';
}

/**
 * Decode LINE id_token JWT payload (no signature verification needed
 * since we just received it directly from LINE's token endpoint over HTTPS)
 */
function decodeIdToken(idToken: string): LineIdTokenPayload | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return payload as LineIdTokenPayload;
  } catch {
    console.error('[LINE Callback] Failed to decode id_token');
    return null;
  }
}

/**
 * Create a Medusa Customer via Admin API
 */
async function createMedusaCustomer(params: {
  email: string;
  first_name: string;
}): Promise<{ id: string } | null> {
  try {
    // Get admin token
    const authRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.MEDUSA_ADMIN_EMAIL || 'admin@minjie.com',
        password: process.env.MEDUSA_ADMIN_PASSWORD || '',
      }),
    });

    if (!authRes.ok) {
      console.error('[LINE Callback] Medusa admin auth failed:', authRes.status);
      return null;
    }

    const authData = await authRes.json();
    const adminToken = authData.token;

    // Create customer
    const customerRes = await fetch(`${MEDUSA_BACKEND_URL}/admin/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: params.email,
        first_name: params.first_name,
      }),
    });

    if (!customerRes.ok) {
      const errText = await customerRes.text();
      console.error('[LINE Callback] Medusa create customer failed:', errText);
      return null;
    }

    const customerData = await customerRes.json();
    return { id: customerData.customer?.id || customerData.id };
  } catch (err) {
    console.error('[LINE Callback] createMedusaCustomer error:', err);
    return null;
  }
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

    // 2.5 從 id_token 解析 email（LINE profile API 不含 email）
    let lineEmail: string | null = null;
    if (tokenData.id_token) {
      const idTokenPayload = decodeIdToken(tokenData.id_token);
      if (idTokenPayload?.email) {
        lineEmail = idTokenPayload.email.toLowerCase();
        console.log('[LINE Callback] Email from id_token:', lineEmail);
      }
    }

    // 3. 查/建 Supabase customer_line_profiles
    const supabase = getSupabase();
    const merchantCode = getMerchantCode();
    let customerId: string | null = null;

    // 查詢現有 LINE profile
    const { data: existingLineProfile } = await supabase
      .from('customer_line_profiles')
      .select('*')
      .eq('line_user_id', profile.userId)
      .maybeSingle();

    if (existingLineProfile) {
      // 已存在，取得 customer_id
      customerId = existingLineProfile.customer_id;
      console.log('[LINE Callback] Existing profile found, customer_id:', customerId);

      // 更新 display_name 和 picture_url
      await supabase
        .from('customer_line_profiles')
        .update({
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          last_active_at: new Date().toISOString(),
        })
        .eq('line_user_id', profile.userId);
    } else {
      // ★ 不存在 LINE profile → 建立新用戶流程
      console.log('[LINE Callback] No existing LINE profile, creating new user');

      // ★ 帳號合併：檢查 email_users 是否有同 email 的帳號（含遷移會員）
      if (lineEmail) {
        const { data: emailUser } = await supabase
          .from('email_users')
          .select('customer_id')
          .eq('email', lineEmail)
          .eq('merchant_code', merchantCode)
          .maybeSingle();

        if (emailUser?.customer_id) {
          customerId = emailUser.customer_id;
          console.log(`[LINE Callback] Reusing existing customer_id ${customerId} from email_users`);
        }
      }

      // 只有在 email_users 沒找到時才建立新 Medusa Customer
      if (!customerId) {
        const placeholderEmail = lineEmail || `line_${profile.userId}@placeholder.minjie.com`;
        const customer = await createMedusaCustomer({
          email: placeholderEmail,
          first_name: profile.displayName,
        });
        if (customer) {
          customerId = customer.id;
          console.log(`[LINE Callback] Created new Medusa customer: ${customerId}`);
        }
      }

      // 建立 customer_line_profiles（使用可能是既有的 customerId）
      await supabase.from('customer_line_profiles').insert({
        line_user_id: profile.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl || null,
        email: lineEmail,
        customer_id: customerId,
        merchant_code: merchantCode,
        last_active_at: new Date().toISOString(),
      });

      // 初始化 member_tier 和 member_wallet（冪等：已存在則跳過）
      if (customerId) {
        await initMemberTier(customerId);
        await initMemberWallet(customerId);
      }
    }

    // 4. 設定 session cookie
    const session: LineSession = {
      line_user_id: profile.userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl || null,
      customer_id: customerId,
      linked_at: new Date().toISOString(),
      auth_method: 'line',
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
