'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Constants ───
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F5E6A3';
const GOLD_DARK = '#B8962E';
const LINE_GREEN = '#06C755';

interface LoginClientProps {
  redirectTo: string;
}

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

// ─── LINE Icon ───
function LineIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.27.174-.51.432-.596.064-.021.133-.031.199-.031.211 0 .391.09.51.25l2.443 3.317V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// ─── Gold Divider ───
function GoldDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 my-7">
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${GOLD}40)` }}
      />
      <span
        className="text-xs tracking-widest uppercase whitespace-nowrap"
        style={{
          color: `${GOLD}90`,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}
      >
        {text}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to left, transparent, ${GOLD}40)` }}
      />
    </div>
  );
}

// ─── Input field ───
function FormInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  disabled = false,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

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
          background: disabled
            ? 'rgba(255,255,255,0.04)'
            : focused
            ? 'rgba(212,175,55,0.03)'
            : 'rgba(255,255,255,0.02)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {icon && (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base transition-colors duration-300"
            style={{ color: focused ? GOLD : 'rgba(255,255,255,0.25)' }}
          >
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent border-none outline-none text-white/90 text-[15px]"
          style={{
            padding: icon ? '14px 16px 14px 42px' : '14px 16px',
          }}
        />
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

// ─── 6-digit OTP input ───
function OTPInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      const next = [...digits];
      next[idx] = '';
      onChange(next.join(''));
      return;
    }
    // Handle paste of full code
    if (val.length > 1) {
      const code = val.slice(0, 6);
      onChange(code);
      const focusIdx = Math.min(code.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...digits];
    next[idx] = val;
    onChange(next.join(''));
    if (idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center my-2 mb-6">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => {
            e.target.select();
            e.target.style.borderColor = GOLD;
            e.target.style.boxShadow = `0 0 0 2px ${GOLD}20`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = d ? `${GOLD}70` : 'rgba(255,255,255,0.12)';
            e.target.style.boxShadow = 'none';
          }}
          className="w-11 h-13 text-center text-[22px] font-bold rounded-[10px] outline-none transition-all duration-200"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, monospace",
            background: d ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1.5px solid ${d ? `${GOLD}70` : 'rgba(255,255,255,0.12)'}`,
            color: GOLD_LIGHT,
            caretColor: GOLD,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───
export default function LoginClient({ redirectTo }: LoginClientProps) {
  // modes: login | register | verify-email | forgot | reset-sent
  const [mode, setMode] = useState<'login' | 'register' | 'verify-email' | 'forgot' | 'reset-sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Initialize component
  useEffect(() => {
    setMounted(true);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLineLogin = () => {
    // Use standard OAuth flow for LINE Login
    // This redirects to LINE, then back to /api/auth/line/callback with code
    window.location.href = '/api/auth/line';
  };

  const handleSendOTP = async () => {
    if (!email) return showToast('請先輸入電子信箱', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('信箱格式不正確', 'error');

    try {
      const res = await fetch('/api/auth/email/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '發送失敗，請稍後再試', 'error');
        return;
      }
      // 開發模式：如果有 devCode，自動填入
      if (data.devCode) {
        setOtp(data.devCode);
        showToast(`驗證碼：${data.devCode}（${data.devMessage}）`, 'info');
      } else {
        showToast(`驗證碼已寄送至 ${email}`, 'success');
      }
      setCountdown(60);
    } catch {
      showToast('發送失敗，請稍後再試', 'error');
    }
  };

  const handleRegisterSubmit = async () => {
    if (!name) return showToast('請填寫姓名', 'error');
    if (!email) return showToast('請填寫電子信箱', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('信箱格式不正確', 'error');
    if (!phone) return showToast('請填寫手機號碼', 'error');
    if (!password || password.length < 8) return showToast('密碼至少 8 個字元', 'error');
    if (password !== confirmPassword) return showToast('兩次密碼不一致', 'error');
    if (!agreed) return showToast('請同意服務條款', 'error');

    try {
      const res = await fetch('/api/auth/email/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '註冊失敗，請稍後再試', 'error');
        return;
      }
      setMode('verify-email');
      setCountdown(60);
      // 開發模式：如果有 devCode，自動填入
      if (data.devCode) {
        setOtp(data.devCode);
        showToast(`驗證碼：${data.devCode}（${data.devMessage}）`, 'info');
      } else {
        setOtp('');
        showToast(`驗證碼已寄送至 ${email}`, 'success');
      }
    } catch {
      showToast('註冊失敗，請稍後再試', 'error');
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return showToast('請輸入完整的 6 位驗證碼', 'error');

    try {
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '驗證失敗，請稍後再試', 'error');
        return;
      }
      showToast('信箱驗證成功！帳號已建立', 'success');
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1500);
    } catch {
      showToast('驗證失敗，請稍後再試', 'error');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return showToast('請填寫所有欄位', 'error');

    try {
      const res = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 如果需要驗證信箱，切換到驗證模式
        if (data.needsVerification) {
          setMode('verify-email');
          setOtp('');
          setCountdown(60);
          showToast('請先完成信箱驗證', 'info');
          return;
        }
        showToast(data.error || '登入失敗，請稍後再試', 'error');
        return;
      }
      showToast('登入成功！', 'success');
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);
    } catch {
      showToast('登入失敗，請稍後再試', 'error');
    }
  };

  const handleForgot = async () => {
    if (!email) return showToast('請輸入電子信箱', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('信箱格式不正確', 'error');

    try {
      const res = await fetch('/api/auth/email/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '發送失敗，請稍後再試', 'error');
        return;
      }
      setMode('reset-sent');
    } catch {
      showToast('發送失敗，請稍後再試', 'error');
    }
  };

  const titles = {
    login: { main: '歡迎回來', sub: '登入您的會員帳號，享有專屬優惠' },
    register: { main: '加入會員', sub: '立即註冊，開啟您的健康旅程' },
    'verify-email': { main: '驗證信箱', sub: '我們已發送 6 位數驗證碼至' },
    forgot: { main: '重設密碼', sub: '我們將寄送重設連結至您的信箱' },
    'reset-sent': { main: '信件已寄出', sub: '請至信箱查收重設密碼連結' },
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
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
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
              {mode === 'verify-email' ? (
                <div
                  className="absolute top-2.5 left-1 w-12 h-[38px] rounded-lg flex items-center justify-center"
                  style={{ border: `1.5px solid ${GOLD}` }}
                >
                  <span className="text-[22px]">✉</span>
                </div>
              ) : mode === 'reset-sent' ? (
                <div
                  className="absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${GOLD}`, animation: 'checkPop 0.4s ease' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13L10 18L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <>
                  <div
                    className="absolute top-2 left-2 w-10 h-10 rounded-xl"
                    style={{ border: `1.5px solid ${GOLD}60`, transform: 'rotate(45deg)' }}
                  />
                  <div
                    className="absolute top-4 left-4 w-6 h-6 rounded-md"
                    style={{ border: `1.5px solid ${GOLD}`, transform: 'rotate(45deg)' }}
                  />
                  <div
                    className="absolute top-[25px] left-[25px] w-1.5 h-1.5 rounded-sm"
                    style={{ background: GOLD, transform: 'rotate(45deg)' }}
                  />
                </>
              )}
            </div>
            <h1
              className="text-[28px] font-semibold text-white/95 m-0 tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {titles[mode].main}
            </h1>
            <p className="text-white/40 text-sm mt-2 leading-relaxed">
              {titles[mode].sub}
              {mode === 'verify-email' && (
                <span className="block mt-1 font-semibold" style={{ color: GOLD }}>
                  {email}
                </span>
              )}
            </p>
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
            {/* ═══════ VERIFY EMAIL MODE ═══════ */}
            {mode === 'verify-email' && (
              <>
                <p className="text-white/50 text-sm text-center mb-5 leading-relaxed">
                  請輸入信箱收到的 <span style={{ color: GOLD }}>6 位數驗證碼</span>
                  <br />
                  <span className="text-xs text-white/30">找不到信件？請檢查垃圾郵件匣</span>
                </p>

                <OTPInput value={otp} onChange={setOtp} />

                <div className="text-center mb-6">
                  {countdown > 0 ? (
                    <span className="text-white/30 text-[13px]">{countdown} 秒後可重新發送</span>
                  ) : (
                    <button
                      onClick={handleSendOTP}
                      className="bg-transparent border-none text-[13px] cursor-pointer underline underline-offset-[3px]"
                      style={{ color: GOLD }}
                    >
                      重新發送驗證碼
                    </button>
                  )}
                </div>

                <button
                  onClick={handleVerifyOTP}
                  className="w-full py-4 px-5 border-none rounded-[10px] text-base font-bold tracking-wide cursor-pointer transition-all duration-300"
                  style={{
                    background:
                      otp.length === 6
                        ? `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`
                        : 'rgba(255,255,255,0.06)',
                    color: otp.length === 6 ? '#0A0A0A' : 'rgba(255,255,255,0.25)',
                    boxShadow: otp.length === 6 ? '0 4px 16px rgba(212,175,55,0.2)' : 'none',
                  }}
                >
                  確認驗證
                </button>

                <div className="text-center mt-4">
                  <button
                    onClick={() => {
                      setMode('register');
                      setOtp('');
                    }}
                    className="bg-transparent border-none text-[13px] cursor-pointer text-white/35 hover:text-gold transition-colors"
                  >
                    ← 修改信箱或資料
                  </button>
                </div>
              </>
            )}

            {/* ═══════ RESET SENT MODE ═══════ */}
            {mode === 'reset-sent' && (
              <>
                <div
                  className="rounded-xl p-5 text-center mb-6"
                  style={{ background: 'rgba(212,175,55,0.06)', border: `1px solid ${GOLD}20` }}
                >
                  <p className="text-white/60 text-sm m-0 leading-relaxed">
                    重設密碼連結已寄送至
                    <br />
                    <span className="font-semibold" style={{ color: GOLD }}>
                      {email}
                    </span>
                  </p>
                  <p className="text-white/30 text-xs mt-3 mb-0">連結將於 30 分鐘內有效，請盡速操作</p>
                </div>
                <button
                  onClick={() => setMode('login')}
                  className="w-full py-4 px-5 border-none rounded-[10px] text-base font-bold cursor-pointer tracking-wide"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                    color: '#0A0A0A',
                  }}
                >
                  返回登入
                </button>
              </>
            )}

            {/* ═══════ LOGIN / REGISTER / FORGOT ═══════ */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <>
                {mode !== 'forgot' && (
                  <>
                    <button
                      onClick={handleLineLogin}
                      className="w-full py-4 px-5 border-none rounded-[10px] text-base font-semibold cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: LINE_GREEN,
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(6,199,85,0.25)',
                      }}
                    >
                      <LineIcon size={22} />
                      使用 LINE 帳號{mode === 'login' ? '登入' : '註冊'}
                    </button>
                    <div className="flex justify-center gap-4 mt-3 flex-wrap">
                      {['一鍵快速登入', '自動累積消費', 'LINE 訊息通知'].map((t) => (
                        <span key={t} className="text-[11px] text-white/30 flex items-center gap-1">
                          <span style={{ color: `${GOLD}80`, fontSize: 10 }}>✦</span> {t}
                        </span>
                      ))}
                    </div>
                    <GoldDivider text="或使用電子信箱" />
                  </>
                )}

                {mode === 'register' && (
                  <>
                    <FormInput
                      label="姓名"
                      placeholder="請輸入您的姓名"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      icon="👤"
                    />
                    <FormInput
                      label="手機號碼"
                      type="tel"
                      placeholder="0912-345-678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      icon="📱"
                    />
                  </>
                )}

                <FormInput
                  label="電子信箱"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon="✉"
                />

                {mode !== 'forgot' && (
                  <PasswordInput
                    label="密碼"
                    placeholder={mode === 'register' ? '至少 8 個字元' : '請輸入密碼'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
                {mode === 'register' && (
                  <PasswordInput
                    label="確認密碼"
                    placeholder="再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                )}

                {mode === 'login' && (
                  <div className="text-right -mt-2 mb-5">
                    <button
                      onClick={() => setMode('forgot')}
                      className="bg-transparent border-none text-[13px] cursor-pointer transition-colors"
                      style={{ color: `${GOLD}80` }}
                    >
                      忘記密碼？
                    </button>
                  </div>
                )}

                {mode === 'register' && (
                  <div
                    className="rounded-[10px] p-3 px-4 mb-5 flex items-start gap-2.5"
                    style={{ background: 'rgba(212,175,55,0.04)', border: `1px solid ${GOLD}15` }}
                  >
                    <span className="text-base leading-none">📧</span>
                    <p className="text-white/40 text-xs m-0 leading-relaxed">
                      送出後將發送 <span style={{ color: GOLD }}>6 位數驗證碼</span> 至您的信箱，
                      請確認信箱填寫正確，以免收不到驗證信。
                    </p>
                  </div>
                )}

                {mode === 'register' && (
                  <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
                    <div
                      onClick={() => setAgreed(!agreed)}
                      className="w-5 h-5 min-w-[20px] rounded-[5px] flex items-center justify-center transition-all duration-200 mt-0.5"
                      style={{
                        border: `1.5px solid ${agreed ? GOLD : 'rgba(255,255,255,0.2)'}`,
                        background: agreed ? `${GOLD}20` : 'transparent',
                      }}
                    >
                      {agreed && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[13px] text-white/45 leading-relaxed">
                      我已閱讀並同意{' '}
                      <Link href="/policy/terms" className="no-underline" style={{ color: GOLD }}>
                        服務條款
                      </Link>{' '}
                      及{' '}
                      <Link href="/policy/privacy" className="no-underline" style={{ color: GOLD }}>
                        隱私權政策
                      </Link>
                    </span>
                  </label>
                )}

                <button
                  onClick={mode === 'login' ? handleLogin : mode === 'register' ? handleRegisterSubmit : handleForgot}
                  className="w-full py-4 px-5 border-none rounded-[10px] text-base font-bold cursor-pointer tracking-wide transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                    backgroundSize: '200% auto',
                    color: '#0A0A0A',
                    boxShadow: '0 4px 16px rgba(212,175,55,0.2)',
                  }}
                >
                  {mode === 'login' ? '登入' : mode === 'register' ? '下一步：驗證信箱' : '發送重設連結'}
                </button>
              </>
            )}
          </div>

          {/* Mode switch */}
          <div className="text-center mt-6 text-sm text-white/40">
            {mode === 'login' && (
              <>
                還不是會員？{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setPassword('');
                  }}
                  className="bg-transparent border-none cursor-pointer text-sm font-medium"
                  style={{ color: GOLD }}
                >
                  立即註冊
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                已經有帳號？{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="bg-transparent border-none cursor-pointer text-sm font-medium"
                  style={{ color: GOLD }}
                >
                  登入
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="bg-transparent border-none cursor-pointer text-sm font-medium"
                style={{ color: GOLD }}
              >
                ← 返回登入
              </button>
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
