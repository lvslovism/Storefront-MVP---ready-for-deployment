'use client';

import { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { isWebAuthnSupported } from '@/lib/webauthn';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8962E';
const GOLD_LIGHT = '#F5E6A3';

interface PasskeyLoginButtonProps {
  redirectTo?: string;
}

export default function PasskeyLoginButton({ redirectTo = '/account' }: PasskeyLoginButtonProps) {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isWebAuthnSupported().then(setSupported);
  }, []);

  if (!supported) return null;

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 取得 authentication options
      const optionsRes = await fetch('/api/auth/passkey/authenticate/options', {
        method: 'POST',
      });
      if (!optionsRes.ok) {
        throw new Error('無法取得驗證資訊');
      }
      const { options } = await optionsRes.json();

      // 2. 觸發生物辨識
      const authResponse = await startAuthentication({ optionsJSON: options });

      // 3. 驗證
      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || '驗證失敗');
      }

      // 4. 成功，導向會員中心
      window.location.href = redirectTo;
    } catch (err: unknown) {
      // 用戶取消不顯示錯誤
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setLoading(false);
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登入失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full py-4 px-5 rounded-[10px] text-base font-semibold cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: '#0A0A0A',
          color: GOLD,
          border: `1.5px solid ${GOLD}`,
          boxShadow: `0 4px 16px rgba(212,175,55,0.15)`,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <span
            className="inline-block w-5 h-5 rounded-full animate-spin"
            style={{
              border: `2px solid ${GOLD}30`,
              borderTopColor: GOLD,
            }}
          />
        ) : (
          <span className="text-[20px]">👤</span>
        )}
        {loading ? '驗證中...' : 'Face ID / 指紋快速登入'}
      </button>
      {error && (
        <p className="text-center text-xs mt-2" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  );
}
