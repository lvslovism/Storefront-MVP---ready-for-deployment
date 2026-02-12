import { NextRequest, NextResponse } from 'next/server';
import { createEmailSession } from '@/lib/auth';
import {
  getEmailUserByEmail,
  verifyEmailUser,
  updateEmailUserCustomerId,
  getVerificationCode,
  incrementVerificationAttempts,
  markVerificationCodeUsed,
  getLineProfileByEmail,
  initMemberWallet,
  initMemberTier,
} from '@/lib/supabase';

/**
 * POST /api/auth/email/verify
 *
 * 驗證 OTP → 完成註冊 → 建立 Session
 *
 * Request Body:
 * - email: string
 * - code: string (6 位數驗證碼)
 *
 * Response:
 * - success: true → 驗證成功，已登入
 * - success: false → error 訊息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    // ===== 驗證必填欄位 =====
    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: '請輸入驗證碼' },
        { status: 400 }
      );
    }

    // ===== 取得用戶 =====
    const user = await getEmailUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '找不到此帳號，請重新註冊' },
        { status: 400 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        { success: false, error: '此信箱已驗證，請直接登入' },
        { status: 400 }
      );
    }

    // ===== 取得驗證碼記錄 =====
    const verificationRecord = await getVerificationCode(email, 'register');
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

    // ===== 驗證成功 =====

    // 標記驗證碼為已使用
    await markVerificationCodeUsed(verificationRecord.id);

    // 更新用戶驗證狀態
    const verified = await verifyEmailUser(user.id);
    if (!verified) {
      return NextResponse.json(
        { success: false, error: '驗證失敗，請稍後再試' },
        { status: 500 }
      );
    }

    // ===== 處理 customer_id =====
    let customerId = user.customer_id;

    // 檢查是否有關聯的 LINE 帳號（帳號合併）
    const lineProfile = await getLineProfileByEmail(email);
    if (lineProfile && lineProfile.customer_id) {
      // 使用 LINE 帳號的 customer_id
      customerId = lineProfile.customer_id;
      await updateEmailUserCustomerId(user.id, customerId);
    } else if (!customerId) {
      // 建立新的 Medusa Customer
      // 注意：這裡先跳過 Medusa 整合，只使用 email_user.id 作為臨時 customer_id
      // 實際上應該呼叫 Medusa API 建立 Customer
      customerId = user.id;
      await updateEmailUserCustomerId(user.id, customerId);
    }

    // 初始化會員錢包和等級
    if (customerId) {
      await initMemberWallet(customerId);
      await initMemberTier(customerId);
    }

    // ===== 建立 Session =====
    await createEmailSession({
      email_user_id: user.id,
      email: user.email,
      display_name: user.name,
      customer_id: customerId,
    });

    return NextResponse.json({
      success: true,
      message: '驗證成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        customer_id: customerId,
      },
    });
  } catch (error) {
    console.error('[Verify] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
