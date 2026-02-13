import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getEmailUserByEmail,
  getLineProfileByEmail,
  createVerificationCode,
  canResendCode,
  getSupabase,
  getMerchantCode,
} from '@/lib/supabase';
import { generateOTP, getOTPExpiresAt } from '@/lib/auth';

// Resend API for sending emails
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@minjie0326.com';

/**
 * POST /api/auth/email/bind
 *
 * 發送 Email 綁定驗證碼
 *
 * Request Body:
 * - email: string
 *
 * Response:
 * - success: true → 驗證碼已發送
 * - devCode: string (開發環境，寄信失敗時回傳)
 */
export async function POST(request: NextRequest) {
  try {
    // ===== 驗證 Session =====
    const session = await getSession();
    if (!session || !session.customer_id) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = body;

    // ===== 驗證 Email 格式 =====
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: '請輸入 Email' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json(
        { success: false, error: 'Email 格式錯誤' },
        { status: 400 }
      );
    }

    // ===== 檢查 Email 是否已被使用 =====
    // 檢查 email_users
    const existingEmailUser = await getEmailUserByEmail(emailLower);
    if (existingEmailUser && existingEmailUser.customer_id && existingEmailUser.customer_id !== session.customer_id) {
      return NextResponse.json(
        { success: false, error: '此 Email 已被其他帳號使用' },
        { status: 400 }
      );
    }

    // 檢查 customer_line_profiles
    const existingLineProfile = await getLineProfileByEmail(emailLower);
    if (existingLineProfile && existingLineProfile.customer_id !== session.customer_id) {
      return NextResponse.json(
        { success: false, error: '此 Email 已被其他帳號使用' },
        { status: 400 }
      );
    }

    // ===== 檢查是否可以重新發送（60 秒限制）=====
    const canResend = await canResendCode(emailLower, 'register'); // 暫用 register purpose
    if (!canResend) {
      return NextResponse.json(
        { success: false, error: '請稍候 60 秒後再試' },
        { status: 429 }
      );
    }

    // ===== 生成驗證碼 =====
    const code = generateOTP();
    const expiresAt = getOTPExpiresAt();

    // 儲存驗證碼（使用 bind_email 作為 purpose，但因為現有 schema 可能只支援 register/reset_password，暫用 register）
    const verificationRecord = await createVerificationCode({
      email: emailLower,
      code,
      purpose: 'register', // 暫用 register
      expires_at: expiresAt,
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { success: false, error: '發送失敗，請稍後再試' },
        { status: 500 }
      );
    }

    // ===== 發送驗證信 =====
    let emailSent = false;

    if (RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: emailLower,
            subject: 'MINJIE STUDIO - Email 綁定驗證碼',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #D4AF37;">MINJIE STUDIO</h2>
                <p>您好，</p>
                <p>您正在綁定 Email 至您的會員帳號，請輸入以下驗證碼：</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37;">${code}</span>
                </div>
                <p style="color: #666; font-size: 14px;">驗證碼將於 10 分鐘後失效。</p>
                <p style="color: #666; font-size: 14px;">如果這不是您本人的操作，請忽略此信件。</p>
              </div>
            `,
          }),
        });

        emailSent = res.ok;
      } catch (err) {
        console.error('[Bind Email] Send email error:', err);
      }
    }

    // 開發環境或寄信失敗時回傳 devCode
    const response: { success: boolean; message: string; devCode?: string } = {
      success: true,
      message: '驗證碼已發送至您的信箱',
    };

    if (!emailSent) {
      response.devCode = code;
      response.message = '驗證碼已生成（寄信服務暫時無法使用）';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Bind Email] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
