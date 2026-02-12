import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, getOTPExpiresAt } from '@/lib/auth';
import { getEmailUserByEmail, createVerificationCode, canResendCode } from '@/lib/supabase';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

/**
 * POST /api/auth/email/resend-otp
 *
 * 重新發送驗證碼（60 秒限制）
 *
 * Request Body:
 * - email: string
 * - purpose: 'register' | 'reset_password'
 *
 * Response:
 * - success: true → 驗證碼已發送
 * - success: false → error 訊息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose } = body;

    // ===== 驗證必填欄位 =====
    if (!email || !purpose) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // ===== 驗證 purpose =====
    if (purpose !== 'register' && purpose !== 'reset_password') {
      return NextResponse.json(
        { success: false, error: '無效的用途' },
        { status: 400 }
      );
    }

    // ===== 檢查發送頻率（60 秒限制）=====
    const canResend = await canResendCode(email, purpose);
    if (!canResend) {
      return NextResponse.json(
        { success: false, error: '請稍後再試，每 60 秒只能發送一次' },
        { status: 429 }
      );
    }

    // ===== 查詢用戶 =====
    const user = await getEmailUserByEmail(email);

    if (!user) {
      // 對於註冊驗證，用戶必須存在
      if (purpose === 'register') {
        return NextResponse.json(
          { success: false, error: '找不到此帳號，請重新註冊' },
          { status: 400 }
        );
      }
      // 對於密碼重設，出於安全考量，即使帳號不存在也回傳成功
      return NextResponse.json({
        success: true,
        message: '如果此信箱已註冊，您將收到驗證碼',
        email: email.toLowerCase(),
      });
    }

    // ===== 對於註冊驗證，檢查是否已驗證 =====
    if (purpose === 'register' && user.email_verified) {
      return NextResponse.json(
        { success: false, error: '此信箱已驗證，請直接登入' },
        { status: 400 }
      );
    }

    // ===== 生成並發送驗證碼 =====
    const otp = generateOTP();
    const expiresAt = getOTPExpiresAt();

    await createVerificationCode({
      email,
      code: otp,
      purpose,
      expires_at: expiresAt,
    });

    // 根據用途發送不同的 email
    const emailResult =
      purpose === 'register'
        ? await sendVerificationEmail(email, otp, user.name)
        : await sendPasswordResetEmail(email, otp, user.name);

    if (!emailResult.success) {
      console.error('[ResendOTP] Email 發送失敗:', emailResult.error);
      return NextResponse.json(
        { success: false, error: '驗證碼發送失敗，請稍後再試' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '驗證碼已發送至您的信箱',
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error('[ResendOTP] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
