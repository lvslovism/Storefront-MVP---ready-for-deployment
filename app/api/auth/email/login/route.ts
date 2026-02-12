import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createEmailSession, generateOTP, getOTPExpiresAt } from '@/lib/auth';
import { getEmailUserByEmail, createVerificationCode } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

/**
 * POST /api/auth/email/login
 *
 * Email 密碼登入
 *
 * Request Body:
 * - email: string
 * - password: string
 *
 * Response:
 * - success: true → 登入成功
 * - success: false → error 訊息
 * - needsVerification: true → 需要完成信箱驗證
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // ===== 驗證必填欄位 =====
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '請輸入電子郵件和密碼' },
        { status: 400 }
      );
    }

    // ===== 查詢用戶 =====
    const user = await getEmailUserByEmail(email);

    // 安全性：不區分「帳號不存在」和「密碼錯誤」
    if (!user) {
      return NextResponse.json(
        { success: false, error: '帳號或密碼錯誤' },
        { status: 401 }
      );
    }

    // ===== 驗證密碼 =====
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '帳號或密碼錯誤' },
        { status: 401 }
      );
    }

    // ===== 檢查信箱是否已驗證 =====
    if (!user.email_verified) {
      // 自動重新發送驗證碼
      const otp = generateOTP();
      const expiresAt = getOTPExpiresAt();

      await createVerificationCode({
        email,
        code: otp,
        purpose: 'register',
        expires_at: expiresAt,
      });

      await sendVerificationEmail(email, otp, user.name);

      return NextResponse.json(
        {
          success: false,
          error: '請先完成信箱驗證',
          needsVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // ===== 登入成功，建立 Session =====
    await createEmailSession({
      email_user_id: user.id,
      email: user.email,
      display_name: user.name,
      customer_id: user.customer_id,
    });

    return NextResponse.json({
      success: true,
      message: '登入成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        customer_id: user.customer_id,
      },
    });
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
