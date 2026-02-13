import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getEmailUserByEmail,
  getVerificationCode,
  incrementVerificationAttempts,
  markVerificationCodeUsed,
  getSupabase,
  getMerchantCode,
} from '@/lib/supabase';

/**
 * POST /api/auth/email/bind-verify
 *
 * 驗證 OTP 並綁定 Email
 *
 * Request Body:
 * - email: string
 * - code: string (6 位數驗證碼)
 *
 * Response:
 * - success: true → 綁定成功
 * - success: false → error 訊息
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
    const { email, code } = body;

    // ===== 驗證必填欄位 =====
    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: '請輸入驗證碼' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // ===== 取得驗證碼記錄 =====
    const verificationRecord = await getVerificationCode(emailLower, 'register'); // 暫用 register
    if (!verificationRecord) {
      return NextResponse.json(
        { success: false, error: '驗證碼已過期或不存在，請重新發送' },
        { status: 400 }
      );
    }

    // ===== 檢查是否過期 =====
    const now = new Date();
    const expiresAt = new Date(verificationRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: '驗證碼已過期，請重新發送' },
        { status: 400 }
      );
    }

    // ===== 檢查嘗試次數 =====
    if (verificationRecord.attempts >= verificationRecord.max_attempts) {
      return NextResponse.json(
        { success: false, error: '驗證碼已失效，請重新發送' },
        { status: 400 }
      );
    }

    // ===== 驗證碼比對 =====
    if (verificationRecord.code !== code) {
      const attempts = await incrementVerificationAttempts(verificationRecord.id);
      const remaining = verificationRecord.max_attempts - attempts;

      if (remaining <= 0) {
        return NextResponse.json(
          { success: false, error: '驗證碼已失效，請重新發送' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: `驗證碼錯誤，還可嘗試 ${remaining} 次` },
        { status: 400 }
      );
    }

    // ===== 驗證成功，開始綁定 =====

    // 標記驗證碼為已使用
    await markVerificationCodeUsed(verificationRecord.id);

    const merchantCode = getMerchantCode();

    // 1. 更新 customer_line_profiles.email
    const { error: updateLineError } = await getSupabase()
      .from('customer_line_profiles')
      .update({ email: emailLower })
      .eq('customer_id', session.customer_id)
      .eq('merchant_code', merchantCode);

    if (updateLineError) {
      console.error('[Bind Verify] Update line profile error:', updateLineError);
      return NextResponse.json(
        { success: false, error: '綁定失敗，請稍後再試' },
        { status: 500 }
      );
    }

    // 2. 檢查 email_users 是否已存在
    const existingEmailUser = await getEmailUserByEmail(emailLower);

    if (existingEmailUser) {
      // 如果 email_users 已存在且 customer_id 不同，回傳錯誤
      if (existingEmailUser.customer_id && existingEmailUser.customer_id !== session.customer_id) {
        return NextResponse.json(
          { success: false, error: '此 Email 已被其他帳號使用' },
          { status: 400 }
        );
      }

      // 如果 customer_id 為空或相同，更新 customer_id
      if (!existingEmailUser.customer_id || existingEmailUser.customer_id === session.customer_id) {
        await getSupabase()
          .from('email_users')
          .update({ customer_id: session.customer_id })
          .eq('id', existingEmailUser.id);
      }
    } else {
      // 建立新的 email_users 記錄（無密碼，因為是透過 LINE 登入綁定）
      const { error: insertError } = await getSupabase()
        .from('email_users')
        .insert({
          merchant_code: merchantCode,
          email: emailLower,
          password_hash: '', // 無密碼
          name: session.display_name,
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          customer_id: session.customer_id,
        });

      if (insertError) {
        console.error('[Bind Verify] Insert email user error:', insertError);
        // 不回傳錯誤，因為 LINE profile 已更新成功
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email 綁定成功',
    });
  } catch (error) {
    console.error('[Bind Verify] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
