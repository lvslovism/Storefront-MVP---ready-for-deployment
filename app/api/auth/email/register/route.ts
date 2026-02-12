import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateOTP, getOTPExpiresAt } from '@/lib/auth';
import {
  getEmailUserByEmail,
  createEmailUser,
  createVerificationCode,
  getLineProfileByEmail,
} from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

/**
 * POST /api/auth/email/register
 *
 * Email 註冊（建立未驗證帳號 + 發送 OTP）
 *
 * Request Body:
 * - email: string
 * - password: string
 * - name: string
 * - phone?: string
 *
 * Response:
 * - success: true → 驗證碼已發送
 * - success: false → error 訊息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    // ===== 驗證必填欄位 =====
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: '請填寫必要欄位' },
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

    // ===== 驗證密碼長度 =====
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: '密碼至少需要 8 個字元' },
        { status: 400 }
      );
    }

    // ===== 檢查 Email 是否已存在 =====
    const existingUser = await getEmailUserByEmail(email);

    if (existingUser) {
      if (existingUser.email_verified) {
        // 已存在且已驗證 → 請直接登入
        return NextResponse.json(
          { success: false, error: '此信箱已註冊，請直接登入' },
          { status: 400 }
        );
      } else {
        // 已存在但未驗證 → 重新發送驗證碼
        const otp = generateOTP();
        const expiresAt = getOTPExpiresAt();

        await createVerificationCode({
          email,
          code: otp,
          purpose: 'register',
          expires_at: expiresAt,
        });

        await sendVerificationEmail(email, otp, existingUser.name);

        return NextResponse.json({
          success: true,
          message: '驗證碼已重新發送至您的信箱',
          email: email.toLowerCase(),
        });
      }
    }

    // ===== 檢查是否有關聯的 LINE 帳號（帳號合併） =====
    const lineProfile = await getLineProfileByEmail(email);

    // ===== 建立新用戶（未驗證狀態） =====
    const passwordHash = await hashPassword(password);
    const newUser = await createEmailUser({
      email,
      password_hash: passwordHash,
      name,
      phone,
    });

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: '註冊失敗，請稍後再試' },
        { status: 500 }
      );
    }

    // 如果有關聯的 LINE 帳號，使用同一個 customer_id
    // 這個會在 verify 時處理

    // ===== 發送驗證碼 =====
    const otp = generateOTP();
    const expiresAt = getOTPExpiresAt();

    await createVerificationCode({
      email,
      code: otp,
      purpose: 'register',
      expires_at: expiresAt,
    });

    const emailResult = await sendVerificationEmail(email, otp, name);

    if (!emailResult.success) {
      console.error('[Register] Email 發送失敗:', emailResult.error);
      // 即使 email 發送失敗，帳號已建立，讓用戶可以重新發送
    }

    return NextResponse.json({
      success: true,
      message: '驗證碼已發送至您的信箱',
      email: email.toLowerCase(),
      hasLinkedLine: !!lineProfile, // 告知前端有關聯的 LINE 帳號
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
