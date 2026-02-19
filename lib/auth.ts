import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

/**
 * MINJIE STUDIO — 認證工具函式
 *
 * Session Cookie 名稱和格式必須與 /api/auth/line/callback 一致
 * 支援 LINE Login 和 Email 登入兩種方式
 */

// ============ Cookie 常數 ============

export const SESSION_COOKIE_NAME = 'line_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 天
  path: '/',
};

// ============ 密碼雜湊設定 ============

const BCRYPT_ROUNDS = 10;

// ============ Session 型別 ============

export interface Session {
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
  // 登入方式識別
  auth_method: 'line' | 'email' | 'passkey';
}

export interface SessionResponse {
  logged_in: boolean;
  line_user_id?: string;
  email_user_id?: string;
  email?: string;
  display_name?: string;
  picture_url?: string | null;
  customer_id?: string | null;
  linked_at?: string;
  auth_method?: 'line' | 'email' | 'passkey';
}

// ============ 密碼工具函式 ============

/**
 * 將密碼進行 bcrypt 雜湊
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * 驗證密碼是否正確
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============ OTP 工具函式 ============

/**
 * 生成 6 位數字驗證碼
 */
export function generateOTP(): string {
  // 生成 100000 ~ 999999 之間的數字
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

/**
 * 計算 OTP 過期時間（10 分鐘後）
 */
export function getOTPExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  return expiresAt;
}

// ============ Server-side 工具函式 ============

/**
 * 從 request cookie 讀取 session（Server Component / API Route 用）
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value) as Session;
  } catch {
    return null;
  }
}

/**
 * 清除 session cookie（API Route 用）
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * 設定 session cookie（API Route 用）
 */
export async function setSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), SESSION_COOKIE_OPTIONS);
}

/**
 * 為 Email 登入建立 session（API Route 用）
 */
export async function createEmailSession(params: {
  email_user_id: string;
  email: string;
  display_name: string;
  customer_id: string | null;
}): Promise<void> {
  const session: Session = {
    email_user_id: params.email_user_id,
    email: params.email,
    display_name: params.display_name,
    picture_url: null,
    customer_id: params.customer_id,
    linked_at: new Date().toISOString(),
    auth_method: 'email',
  };
  await setSession(session);
}
