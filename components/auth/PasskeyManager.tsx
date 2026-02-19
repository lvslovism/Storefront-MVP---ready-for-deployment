'use client';

import { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { isWebAuthnSupported, guessDeviceName } from '@/lib/webauthn';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8962E';
const GOLD_LIGHT = '#F5E6A3';

interface Credential {
  id: string;
  device_name: string;
  device_type: string;
  last_used_at: string | null;
  created_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '尚未使用';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PasskeyManager() {
  const [supported, setSupported] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isWebAuthnSupported().then((val) => {
      console.log('[PasskeyManager] supported:', val);
      setSupported(val);
    });
  }, []);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/passkey/credentials');
      if (!res.ok) return;
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supported) fetchCredentials();
    else setLoading(false);
  }, [supported, fetchCredentials]);

  if (!supported) return null;

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      // 1. 取得 registration options
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
      });
      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || '無法取得註冊資訊');
      }
      const { options } = await optionsRes.json();

      // 2. 觸發生物辨識
      const regResponse = await startRegistration({ optionsJSON: options });

      // 3. 驗證
      const deviceName = guessDeviceName();
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: regResponse, deviceName }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || '註冊失敗');
      }

      // 4. 刷新列表
      await fetchCredentials();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setRegistering(false);
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('新增失敗，請稍後再試');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string, deviceName: string) => {
    if (!confirm(`確定要移除「${deviceName}」嗎？\n移除後將無法使用此裝置的快速登入。`)) {
      return;
    }
    try {
      const res = await fetch(`/api/auth/passkey/credentials/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '移除失敗');
      }
      await fetchCredentials();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="mb-8">
      <h3
        className="text-[13px] tracking-wider mb-3.5 uppercase flex items-center gap-2"
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}
      >
        <span className="text-base">🔐</span> 快速登入（Face ID / 指紋）
      </h3>

      {loading ? (
        <div className="py-6 text-center text-white/30 text-sm">載入中...</div>
      ) : (
        <>
          {/* Credential 列表 */}
          {credentials.length > 0 && (
            <div className="flex flex-col gap-2.5 mb-4">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="rounded-xl px-4 py-4 flex items-center justify-between"
                  style={{
                    background: '#161616',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: `${GOLD}10`, color: GOLD }}
                    >
                      {cred.device_name?.includes('iPhone') || cred.device_name?.includes('Face ID')
                        ? '📱'
                        : cred.device_name?.includes('Mac') || cred.device_name?.includes('Touch ID')
                        ? '💻'
                        : cred.device_name?.includes('Windows')
                        ? '🖥'
                        : '🔑'}
                    </div>
                    <div>
                      <div className="text-white/80 text-sm font-medium">
                        {cred.device_name || '未知裝置'}
                      </div>
                      <div className="text-white/30 text-[11px]">
                        上次使用：{formatDate(cred.last_used_at)} · 新增於 {formatDate(cred.created_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cred.id, cred.device_name || '此裝置')}
                    className="bg-transparent border border-red-500/30 text-red-400 text-[11px] px-2.5 py-1 rounded-md cursor-pointer hover:bg-red-500/10 transition-colors"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 新增裝置按鈕 */}
          <button
            onClick={handleRegister}
            disabled={registering}
            className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: '#0A0A0A',
              color: GOLD,
              border: `1.5px solid ${GOLD}40`,
              opacity: registering ? 0.6 : 1,
            }}
          >
            {registering ? (
              <>
                <span
                  className="inline-block w-4 h-4 rounded-full animate-spin"
                  style={{
                    border: `2px solid ${GOLD}30`,
                    borderTopColor: GOLD,
                  }}
                />
                設定中...
              </>
            ) : (
              <>+ 新增此裝置</>
            )}
          </button>

          {error && (
            <p className="text-center text-xs mt-2" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          {/* 說明 */}
          <div
            className="mt-4 rounded-xl p-3.5 px-4"
            style={{
              background: `${GOLD}05`,
              border: `1px solid ${GOLD}10`,
            }}
          >
            <p className="text-white/35 text-xs m-0 leading-relaxed">
              啟用後，下次可直接使用臉部辨識或指紋登入，無需輸入帳號密碼。系統不會儲存您的生物特徵資料。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
