// lib/webauthn.ts
'use client';

export function isLineInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('line/') || ua.includes('liff');
}

export async function isWebAuthnSupported(): Promise<boolean> {
  if (isLineInAppBrowser()) return false;
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function isConditionalUISupported(): Promise<boolean> {
  if (!await isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false;
  } catch {
    return false;
  }
}

export function guessDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone (Face ID)';
  if (/iPad/.test(ua)) return 'iPad (Touch ID)';
  if (/Macintosh/.test(ua)) return 'Mac (Touch ID)';
  if (/Windows/.test(ua)) return 'Windows (Windows Hello)';
  if (/Android/.test(ua)) return 'Android';
  return '未知裝置';
}
