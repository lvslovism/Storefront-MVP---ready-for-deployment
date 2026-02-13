/**
 * MINJIE STUDIO — Email 服務（Resend）
 *
 * 用於發送信箱驗證碼、密碼重設信件
 * 若 RESEND_API_KEY 未設定，會 fallback 到 console.log（開發用）
 */

import { Resend } from 'resend';

// ============ 初始化 ============

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// 發送設定（minjie0326.com domain 已驗證）
const FROM_EMAIL = process.env.FROM_EMAIL || 'MINJIE STUDIO <noreply@minjie0326.com>';
const STORE_NAME = 'MINJIE STUDIO';

// ============ Email 模板 ============

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getVerificationEmailTemplate(code: string, name: string): EmailTemplate {
  return {
    subject: `[${STORE_NAME}] 您的信箱驗證碼：${code}`,
    html: `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 480px; background-color: #111111; border: 1px solid #D4AF37; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
              <h1 style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: 600; letter-spacing: 2px;">${STORE_NAME}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #FFFFFF; font-size: 16px;">親愛的 ${name}，您好！</p>
              <p style="margin: 0 0 24px; color: #AAAAAA; font-size: 14px;">請使用以下驗證碼完成信箱驗證：</p>
              <!-- OTP Code -->
              <div style="background-color: #1A1A1A; border: 2px solid #D4AF37; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; color: #D4AF37; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="margin: 0 0 8px; color: #888888; font-size: 13px;">此驗證碼將於 <strong style="color: #D4AF37;">10 分鐘</strong> 後失效。</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">如果您沒有申請此驗證碼，請忽略此信件。</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0A0A0A; border-top: 1px solid rgba(212, 175, 55, 0.2); text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
${STORE_NAME} 信箱驗證

親愛的 ${name}，您好！

請使用以下驗證碼完成信箱驗證：

${code}

此驗證碼將於 10 分鐘後失效。
如果您沒有申請此驗證碼，請忽略此信件。

© ${new Date().getFullYear()} ${STORE_NAME}
    `.trim(),
  };
}

function getPasswordResetEmailTemplate(code: string, name: string, resetLink: string): EmailTemplate {
  return {
    subject: `[${STORE_NAME}] 密碼重設驗證碼：${code}`,
    html: `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 480px; background-color: #111111; border: 1px solid #D4AF37; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
              <h1 style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: 600; letter-spacing: 2px;">${STORE_NAME}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #FFFFFF; font-size: 16px;">親愛的 ${name}，您好！</p>
              <p style="margin: 0 0 24px; color: #AAAAAA; font-size: 14px;">我們收到了您的密碼重設請求。您可以使用以下任一方式重設密碼：</p>

              <!-- Method 1: OTP Code -->
              <p style="margin: 0 0 12px; color: #FFFFFF; font-size: 14px; font-weight: 600;">方式一：輸入驗證碼</p>
              <div style="background-color: #1A1A1A; border: 2px solid #D4AF37; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 36px; font-weight: 700; color: #D4AF37; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="margin: 0 0 24px; color: #888888; font-size: 12px; text-align: center;">在登入頁面的忘記密碼流程中輸入此驗證碼</p>

              <!-- Method 2: Reset Link -->
              <p style="margin: 0 0 12px; color: #FFFFFF; font-size: 14px; font-weight: 600;">方式二：點擊連結</p>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #B8962E, #D4AF37, #F5E6A3); color: #0A0A0A; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; letter-spacing: 1px;">重設密碼</a>
              </div>

              <p style="margin: 0 0 8px; color: #888888; font-size: 13px;">此驗證碼將於 <strong style="color: #D4AF37;">10 分鐘</strong> 後失效。</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">如果您沒有申請重設密碼，請忽略此信件，您的帳號仍然安全。</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0A0A0A; border-top: 1px solid rgba(212, 175, 55, 0.2); text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
${STORE_NAME} 密碼重設

親愛的 ${name}，您好！

我們收到了您的密碼重設請求。您可以使用以下任一方式重設密碼：

方式一：輸入驗證碼
${code}
（在登入頁面的忘記密碼流程中輸入此驗證碼）

方式二：點擊連結
${resetLink}

此驗證碼將於 10 分鐘後失效。
如果您沒有申請重設密碼，請忽略此信件，您的帳號仍然安全。

© ${new Date().getFullYear()} ${STORE_NAME}
    `.trim(),
  };
}

// ============ 發送函式 ============

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 發送信箱驗證碼
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  name: string
): Promise<SendEmailResult> {
  const template = getVerificationEmailTemplate(code, name);

  // 開發模式：無 API Key 時 fallback 到 console
  if (!resend) {
    console.log('========================================');
    console.log('[Email] 驗證碼信件（開發模式）');
    console.log(`收件人: ${to}`);
    console.log(`姓名: ${name}`);
    console.log(`驗證碼: ${code}`);
    console.log('========================================');
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] 發送失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[Email] 發送錯誤:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * 發送密碼重設驗證碼
 */
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  name: string,
  resetLink: string
): Promise<SendEmailResult> {
  const template = getPasswordResetEmailTemplate(code, name, resetLink);

  // 開發模式
  if (!resend) {
    console.log('========================================');
    console.log('[Email] 密碼重設信件（開發模式）');
    console.log(`收件人: ${to}`);
    console.log(`姓名: ${name}`);
    console.log(`驗證碼: ${code}`);
    console.log(`重設連結: ${resetLink}`);
    console.log('========================================');
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] 發送失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[Email] 發送錯誤:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
