/**
 * MINJIE STUDIO — Supabase 客戶端
 *
 * 用於 API Routes 存取 Supabase（使用 service_role_key 繞過 RLS）
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============ 環境變數 ============

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ephdzjkgpkuydpbkxnfw.supabase.co';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const merchantCode = process.env.MERCHANT_CODE || 'minjie';

// ============ Supabase Client ============

let supabaseInstance: SupabaseClient | null = null;

/**
 * 取得 Supabase 客戶端（使用 service_role_key）
 * 用於 API Routes，可繞過 RLS 規則
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }
  return supabaseInstance;
}

/**
 * 取得商家代碼
 */
export function getMerchantCode(): string {
  return merchantCode;
}

// ============ Email 用戶型別 ============

export interface EmailUser {
  id: string;
  customer_id: string | null;
  merchant_code: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailVerificationCode {
  id: string;
  email: string;
  code: string;
  purpose: 'register' | 'reset_password';
  attempts: number;
  max_attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// ============ Email 用戶查詢 ============

/**
 * 根據 email 查詢用戶
 */
export async function getEmailUserByEmail(email: string): Promise<EmailUser | null> {
  const { data, error } = await getSupabase()
    .from('email_users')
    .select('*')
    .eq('merchant_code', merchantCode)
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getEmailUserByEmail error:', error);
  }
  return data as EmailUser | null;
}

/**
 * 根據 ID 查詢用戶
 */
export async function getEmailUserById(id: string): Promise<EmailUser | null> {
  const { data, error } = await getSupabase()
    .from('email_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getEmailUserById error:', error);
  }
  return data as EmailUser | null;
}

/**
 * 建立 Email 用戶（未驗證狀態）
 */
export async function createEmailUser(params: {
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
}): Promise<EmailUser | null> {
  const { data, error } = await getSupabase()
    .from('email_users')
    .insert({
      merchant_code: merchantCode,
      email: params.email.toLowerCase(),
      password_hash: params.password_hash,
      name: params.name,
      phone: params.phone || null,
      email_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createEmailUser error:', error);
    return null;
  }
  return data as EmailUser;
}

/**
 * 更新用戶的 email_verified 狀態
 */
export async function verifyEmailUser(userId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('email_users')
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Supabase] verifyEmailUser error:', error);
    return false;
  }
  return true;
}

/**
 * 更新用戶的 customer_id
 */
export async function updateEmailUserCustomerId(userId: string, customerId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('email_users')
    .update({
      customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Supabase] updateEmailUserCustomerId error:', error);
    return false;
  }
  return true;
}

/**
 * 更新用戶密碼
 */
export async function updateEmailUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('email_users')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Supabase] updateEmailUserPassword error:', error);
    return false;
  }
  return true;
}

// ============ 驗證碼相關 ============

/**
 * 建立驗證碼
 */
export async function createVerificationCode(params: {
  email: string;
  code: string;
  purpose: 'register' | 'reset_password';
  expires_at: Date;
}): Promise<EmailVerificationCode | null> {
  // 先刪除該 email + purpose 的舊驗證碼
  await getSupabase()
    .from('email_verification_codes')
    .delete()
    .eq('email', params.email.toLowerCase())
    .eq('purpose', params.purpose);

  // 建立新驗證碼
  const { data, error } = await getSupabase()
    .from('email_verification_codes')
    .insert({
      email: params.email.toLowerCase(),
      code: params.code,
      purpose: params.purpose,
      expires_at: params.expires_at.toISOString(),
      attempts: 0,
      max_attempts: 5,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createVerificationCode error:', error);
    return null;
  }
  return data as EmailVerificationCode;
}

/**
 * 取得驗證碼
 */
export async function getVerificationCode(
  email: string,
  purpose: 'register' | 'reset_password'
): Promise<EmailVerificationCode | null> {
  const { data, error } = await getSupabase()
    .from('email_verification_codes')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .is('used_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getVerificationCode error:', error);
  }
  return data as EmailVerificationCode | null;
}

/**
 * 增加驗證碼嘗試次數
 */
export async function incrementVerificationAttempts(codeId: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('email_verification_codes')
    .update({ attempts: getSupabase().rpc('increment_attempts', { row_id: codeId }) })
    .eq('id', codeId)
    .select('attempts')
    .single();

  // 如果 RPC 不存在，改用直接更新
  if (error) {
    const { data: current } = await getSupabase()
      .from('email_verification_codes')
      .select('attempts')
      .eq('id', codeId)
      .single();

    const newAttempts = (current?.attempts || 0) + 1;
    await getSupabase()
      .from('email_verification_codes')
      .update({ attempts: newAttempts })
      .eq('id', codeId);

    return newAttempts;
  }

  return data?.attempts || 0;
}

/**
 * 標記驗證碼為已使用
 */
export async function markVerificationCodeUsed(codeId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('email_verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', codeId);

  if (error) {
    console.error('[Supabase] markVerificationCodeUsed error:', error);
    return false;
  }
  return true;
}

/**
 * 檢查是否可以重新發送驗證碼（60 秒限制）
 */
export async function canResendCode(email: string, purpose: 'register' | 'reset_password'): Promise<boolean> {
  const { data } = await getSupabase()
    .from('email_verification_codes')
    .select('created_at')
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return true;

  const createdAt = new Date(data.created_at);
  const now = new Date();
  const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;

  return diffSeconds >= 60;
}

// ============ 會員資料相關 ============

export interface MemberWallet {
  id: string;
  customer_id: string;
  merchant_code: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'earn' | 'spend' | 'expire' | 'adjust';
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface MemberTier {
  id: string;
  customer_id: string;
  merchant_code: string;
  tier_level: 'normal' | 'silver' | 'gold' | 'vip';
  tier_points: number;
  total_orders: number;
  total_spent: number;
  discount_rate: number;
  upgraded_at: string | null;
  expires_at: string | null;
}

export interface TierConfig {
  tier_level: string;
  tier_name: string;
  min_spent: number;
  points_multiplier: number;
  birthday_points: number;
  monthly_credits: number;
}

/**
 * 取得會員錢包
 */
export async function getMemberWallet(customerId: string): Promise<MemberWallet | null> {
  const { data, error } = await getSupabase()
    .from('member_wallet')
    .select('*')
    .eq('customer_id', customerId)
    .eq('merchant_code', merchantCode)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getMemberWallet error:', error);
  }
  return data as MemberWallet | null;
}

/**
 * 取得錢包交易紀錄
 */
export async function getWalletTransactions(
  walletId: string,
  limit: number = 20
): Promise<WalletTransaction[]> {
  const { data, error } = await getSupabase()
    .from('wallet_transaction')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] getWalletTransactions error:', error);
    return [];
  }
  return (data as WalletTransaction[]) || [];
}

/**
 * 取得會員等級
 */
export async function getMemberTier(customerId: string): Promise<MemberTier | null> {
  const { data, error } = await getSupabase()
    .from('member_tier')
    .select('*')
    .eq('customer_id', customerId)
    .eq('merchant_code', merchantCode)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getMemberTier error:', error);
  }
  return data as MemberTier | null;
}

/**
 * 取得所有等級設定
 */
export async function getTierConfigs(): Promise<TierConfig[]> {
  const { data, error } = await getSupabase()
    .from('tier_config')
    .select('*')
    .eq('merchant_code', merchantCode)
    .order('min_spent', { ascending: true });

  if (error) {
    console.error('[Supabase] getTierConfigs error:', error);
    return [];
  }
  return (data as TierConfig[]) || [];
}

/**
 * 初始化會員錢包（如果不存在）
 */
export async function initMemberWallet(customerId: string): Promise<MemberWallet | null> {
  // 先檢查是否已存在
  const existing = await getMemberWallet(customerId);
  if (existing) return existing;

  // 建立新錢包
  const { data, error } = await getSupabase()
    .from('member_wallet')
    .insert({
      customer_id: customerId,
      merchant_code: merchantCode,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] initMemberWallet error:', error);
    return null;
  }
  return data as MemberWallet;
}

/**
 * 初始化會員等級（如果不存在）
 */
export async function initMemberTier(customerId: string): Promise<MemberTier | null> {
  // 先檢查是否已存在
  const existing = await getMemberTier(customerId);
  if (existing) return existing;

  // 建立新等級
  const { data, error } = await getSupabase()
    .from('member_tier')
    .insert({
      customer_id: customerId,
      merchant_code: merchantCode,
      tier_level: 'normal',
      tier_points: 0,
      total_orders: 0,
      total_spent: 0,
      discount_rate: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] initMemberTier error:', error);
    return null;
  }
  return data as MemberTier;
}

// ============ LINE Profile 相關 ============

export interface CustomerLineProfile {
  id: string;
  customer_id: string;
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  status_message: string | null;
  email: string | null;
  phone: string | null;
  merchant_code: string;
  linked_at: string;
  last_active_at: string;
}

/**
 * 根據 customer_id 取得 LINE Profile
 */
export async function getLineProfileByCustomerId(customerId: string): Promise<CustomerLineProfile | null> {
  const { data, error } = await getSupabase()
    .from('customer_line_profiles')
    .select('*')
    .eq('customer_id', customerId)
    .eq('merchant_code', merchantCode)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getLineProfileByCustomerId error:', error);
  }
  return data as CustomerLineProfile | null;
}

/**
 * 根據 email 取得 LINE Profile（用於帳號合併）
 */
export async function getLineProfileByEmail(email: string): Promise<CustomerLineProfile | null> {
  const { data, error } = await getSupabase()
    .from('customer_line_profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('merchant_code', merchantCode)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getLineProfileByEmail error:', error);
  }
  return data as CustomerLineProfile | null;
}
