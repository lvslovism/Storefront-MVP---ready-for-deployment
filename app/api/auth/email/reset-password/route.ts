import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, clearSession } from '@/lib/auth';
import {
  getEmailUserByEmail,
  updateEmailUserPassword,
  getVerificationCode,
  incrementVerificationAttempts,
  markVerificationCodeUsed,
} from '@/lib/supabase';

/**
 * POST /api/auth/email/reset-password
 *
 * 驗證 OTP + 更新密碼
 *
 * Request Body:
 * - email: string
 * - code: string (6 位數驗證碼)
 * - newPassword: string
 *
 * Response:
 * - success: true → 密碼已重設，請重新登入
 * - success: false → error 訊息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    // ===== 驗證必填欄位 =====
    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: '請填寫所有欄位' },
        { status: 400 }
      );
    }

    // ===== 驗證密碼長度 =====
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: '密碼至少需要 8 個字元' },
        { status: 400 }
      );
    }

    // ===== 取得用戶 =====
    const user = await getEmailUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '找不到此帳號' },
        { status: 400 }
      );
    }

    // ===== 取得驗證碼記錄 =====
    const verificationRecord = await getVerificationCode(email, 'reset_password');
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
      // 增加嘗試次數
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

    // ===== 驗證成功，更新密碼 =====

    // 標記驗證碼為已使用
    await markVerificationCodeUsed(verificationRecord.id);

    // 更新密碼
    const passwordHash = await hashPassword(newPassword);
    const updated = await updateEmailUserPassword(user.id, passwordHash);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: '密碼更新失敗，請稍後再試' },
        { status: 500 }
      );
    }

    // 清除當前 session（要求重新登入）
    await clearSession();

    return NextResponse.json({
      success: true,
      message: '密碼已重設，請使用新密碼登入',
    });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
