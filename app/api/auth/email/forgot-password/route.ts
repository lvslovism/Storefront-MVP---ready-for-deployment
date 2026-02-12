import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, getOTPExpiresAt } from '@/lib/auth';
import { getEmailUserByEmail, createVerificationCode, canResendCode } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * POST /api/auth/email/forgot-password
 *
 * 發送重設密碼 OTP
 *
 * Request Body:
 * - email: string
 *
 * Response:
 * - success: true → 重設密碼信件已發送（即使帳號不存在也回傳成功，避免洩漏）
 * - success: false → error 訊息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // ===== 驗證必填欄位 =====
    if (!email) {
      return NextResponse.json(
        { success: false, error: '請輸入電子郵件' },
        { status: 400 }
      );
    }

    // ===== 驗證 Email 格式 =====
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '請輸入有效的電子郵件地址' },
        { status: 400 }
      );
    }

    // ===== 查詢用戶 =====
    const user = await getEmailUserByEmail(email);

    // 安全性：即使帳號不存在，也回傳成功訊息
    // 這樣可以避免攻擊者透過此 API 探測哪些 email 已註冊
    if (!user) {
      return NextResponse.json({
        success: true,
        message: '如果此信箱已註冊，您將收到重設密碼信件',
        email: email.toLowerCase(),
      });
    }

    // ===== 檢查發送頻率（60 秒限制）=====
    const canResend = await canResendCode(email, 'reset_password');
    if (!canResend) {
      return NextResponse.json(
        { success: false, error: '請稍後再試，每 60 秒只能發送一次' },
        { status: 429 }
      );
    }

    // ===== 生成並發送驗證碼 =====
    const otp = generateOTP();
    const expiresAt = getOTPExpiresAt();

    await createVerificationCode({
      email,
      code: otp,
      purpose: 'reset_password',
      expires_at: expiresAt,
    });

    const emailResult = await sendPasswordResetEmail(email, otp, user.name);

    if (!emailResult.success) {
      console.error('[ForgotPassword] Email 發送失敗:', emailResult.error);
      // 即使發送失敗，也回傳成功訊息（避免洩漏資訊）
    }

    return NextResponse.json({
      success: true,
      message: '如果此信箱已註冊，您將收到重設密碼信件',
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
