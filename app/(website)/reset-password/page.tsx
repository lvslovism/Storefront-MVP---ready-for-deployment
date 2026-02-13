'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Constants ───
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F5E6A3';
const GOLD_DARK = '#B8962E';

// ─── Animated gold particles ───
function GoldParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      dur: Math.random() * 8 + 6,
      delay: Math.random() * -10,
      opacity: Math.random() * 0.25 + 0.05,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: GOLD,
            opacity: p.opacity,
            animation: `floatP ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Password input ───
function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <div className="mb-5">
      <label
        className="block text-xs tracking-wider mb-2 uppercase"
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}
      >
        {label}
      </label>
      <div
        className="relative rounded-lg overflow-hidden transition-all duration-300"
        style={{
          border: `1px solid ${focused ? `${GOLD}60` : 'rgba(255,255,255,0.1)'}`,
          background: focused ? 'rgba(212,175,55,0.03)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base transition-colors duration-300"
          style={{ color: focused ? GOLD : 'rgba(255,255,255,0.25)' }}
        >
          🔒
        </span>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent border-none outline-none text-white/90 text-[15px]"
          style={{ padding: '14px 48px 14px 42px' }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-white/30 cursor-pointer text-sm p-1"
        >
          {show ? '🙈' : '👁'}
        </button>
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px transition-all duration-400"
          style={{
            width: focused ? '100%' : '0%',
            background: `linear-gradient(to right, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Content Component ───
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [status, setStatus] = useState<'ready' | 'success' | 'expired'>('ready');

  useEffect(() => {
    setMounted(true);
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (codeParam) setCode(decodeURIComponent(codeParam));
  }, [searchParams]);

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    if (!email || !code) {
      showToast('連結無效，請重新申請重設密碼', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast('密碼至少 8 個字元', 'error');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showToast('密碼需包含英文和數字', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('兩次密碼不一致', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 重設密碼
      const res = await fetch('/api/auth/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('過期') || data.error?.includes('失效') || data.error?.includes('不存在')) {
          setStatus('expired');
        }
        showToast(data.error || '重設失敗，請稍後再試', 'error');
        return;
      }

      // 2. 自動登入
      const loginRes = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.success) {
        setStatus('success');
        showToast('密碼已重設成功！', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        showToast('密碼已重設，請重新登入', 'success');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } catch {
      showToast('重設失敗，請稍後再試', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto" style={{ background: '#0A0A0A' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        @keyframes floatP {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(8px); }
          50% { transform: translateY(-8px) translateX(-5px); }
          75% { transform: translateY(-25px) translateX(3px); }
        }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGold { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.2); } 50% { box-shadow:0 0 20px 4px rgba(212,175,55,0.1); } }
        @keyframes slideToast { from { opacity:0; transform:translate(-50%,-12px); } to { opacity:1; transform:translate(-50%,0); } }
        @keyframes checkPop { 0% { transform:scale(0); } 60% { transform:scale(1.2); } 100% { transform:scale(1); } }
      `}</style>

      <GoldParticles />

      {/* Top glow */}
      <div
        className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${GOLD}08 0%, transparent 70%)` }}
      />

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-[10px] text-sm font-medium backdrop-blur-xl"
          style={{
            background: toast.type === 'error' ? 'rgba(220,38,38,0.9)' : 'rgba(212,175,55,0.9)',
            color: toast.type === 'error' ? '#fff' : '#000',
            animation: 'slideToast 0.3s ease',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between relative z-10"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.1)' }}
      >
        <span
          className="text-xl font-bold tracking-widest"
          style={{
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          MINJIE STUDIO
        </span>
        <Link
          href="/"
          className="text-[13px] flex items-center gap-1.5 transition-colors hover:text-gold"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          ← 返回首頁
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-5 py-10 relative z-10">
        <div
          className="w-full max-w-[440px]"
          style={{ animation: mounted ? 'fadeInUp 0.6s ease' : 'none' }}
        >
          {/* Brand Mark */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 mx-auto mb-5 relative"
              style={{ animation: 'pulseGold 3s ease-in-out infinite' }}
            >
              {status === 'success' ? (
                <div
                  className="absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${GOLD}`, animation: 'checkPop 0.4s ease' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13L10 18L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : status === 'expired' ? (
                <div
                  className="absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid #EF4444` }}
                >
                  <span className="text-[22px]">⚠️</span>
                </div>
              ) : (
                <div
                  className="absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${GOLD}` }}
                >
                  <span className="text-[22px]">🔑</span>
                </div>
              )}
            </div>
            <h1
              className="text-[28px] font-semibold text-white/95 m-0 tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {status === 'success' ? '重設成功' : status === 'expired' ? '連結已失效' : '重設密碼'}
            </h1>
            <p className="text-white/40 text-sm mt-2 leading-relaxed">
              {status === 'success'
                ? '您的密碼已成功重設，正在為您登入...'
                : status === 'expired'
                ? '此連結已過期或無效，請重新申請'
                : '請輸入您的新密碼'}
            </p>
            {status === 'ready' && email && (
              <p className="mt-1 font-semibold" style={{ color: GOLD }}>
                {email}
              </p>
            )}
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-7"
            style={{
              background: '#111111',
              border: '1px solid rgba(212,175,55,0.12)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.06)',
            }}
          >
            {status === 'expired' ? (
              <>
                <div
                  className="rounded-xl p-5 text-center mb-6"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <p className="text-white/60 text-sm m-0 leading-relaxed">
                    此重設密碼連結已過期或已被使用。
                    <br />
                    請返回登入頁面重新申請。
                  </p>
                </div>
                <Link
                  href="/login"
                  className="block w-full py-4 px-5 border-none rounded-[10px] text-base font-bold cursor-pointer tracking-wide text-center no-underline"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                    color: '#0A0A0A',
                  }}
                >
                  返回登入頁面
                </Link>
              </>
            ) : status === 'success' ? (
              <div
                className="rounded-xl p-5 text-center"
                style={{ background: 'rgba(212,175,55,0.06)', border: `1px solid ${GOLD}20` }}
              >
                <p className="text-white/60 text-sm m-0 leading-relaxed">
                  密碼已成功重設！
                  <br />
                  正在為您自動登入...
                </p>
              </div>
            ) : (
              <>
                <PasswordInput
                  label="新密碼"
                  placeholder="至少 8 個字元，包含英文和數字"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <PasswordInput
                  label="確認新密碼"
                  placeholder="再次輸入新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <div
                  className="rounded-[10px] p-3 px-4 mb-5 flex items-start gap-2.5"
                  style={{ background: 'rgba(212,175,55,0.04)', border: `1px solid ${GOLD}15` }}
                >
                  <span className="text-base leading-none">🔐</span>
                  <p className="text-white/40 text-xs m-0 leading-relaxed">
                    密碼規則：至少 <span style={{ color: GOLD }}>8 個字元</span>，需包含<span style={{ color: GOLD }}>英文和數字</span>
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 px-5 border-none rounded-[10px] text-base font-bold cursor-pointer tracking-wide transition-all duration-300"
                  style={{
                    background:
                      newPassword.length >= 8
                        ? `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`
                        : 'rgba(255,255,255,0.06)',
                    color: newPassword.length >= 8 ? '#0A0A0A' : 'rgba(255,255,255,0.25)',
                    boxShadow: newPassword.length >= 8 ? '0 4px 16px rgba(212,175,55,0.2)' : 'none',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? '處理中...' : '重設密碼'}
                </button>

                <div className="text-center mt-4">
                  <Link
                    href="/login"
                    className="bg-transparent border-none text-[13px] cursor-pointer no-underline"
                    style={{ color: GOLD }}
                  >
                    ← 返回登入
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div
            className="flex justify-center gap-6 mt-10 pt-6 flex-wrap"
            style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}
          >
            {[
              { icon: '🔐', text: 'SSL 安全加密' },
              { icon: '🛡', text: '資料嚴格保護' },
              { icon: '💳', text: '安全交易環境' },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5">
                <span className="text-sm">{b.icon}</span>
                <span className="text-[11px] text-white/25 tracking-wide">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-4 text-center relative z-10"
        style={{ borderTop: '1px solid rgba(212,175,55,0.06)' }}
      >
        <p className="text-white/20 text-xs m-0">© 2026 MINJIE STUDIO. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ─── Page Component with Suspense ───
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-white/40">載入中...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
