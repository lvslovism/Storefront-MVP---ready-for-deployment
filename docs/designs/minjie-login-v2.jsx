import { useState, useEffect, useRef } from "react";

// ─── MINJIE STUDIO Login / Register Page v2 ───
// LINE LIFF Login = Primary CTA
// Email + Password = Secondary (with email verification)
// Based on Auth Security Technical Guide v1.0

const GOLD = "#D4AF37";
const GOLD_LIGHT = "#F5E6A3";
const GOLD_DARK = "#B8962E";
const BG_PRIMARY = "#0A0A0A";
const BG_CARD = "#111111";
const LINE_GREEN = "#06C755";

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
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: GOLD, opacity: p.opacity,
          animation: `floatP ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── LINE Icon ───
function LineIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.27.174-.51.432-.596.064-.021.133-.031.199-.031.211 0 .391.09.51.25l2.443 3.317V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// ─── Gold Divider ───
function GoldDivider({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "28px 0" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD}40)` }} />
      <span style={{ color: `${GOLD}90`, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Cormorant Garamond', Georgia, serif", whiteSpace: "nowrap" }}>
        {text}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${GOLD}40)` }} />
    </div>
  );
}

// ─── Input field ───
function FormInput({ label, type = "text", placeholder, value, onChange, icon, disabled = false, rightSlot }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: "block", fontSize: 12, letterSpacing: 1,
        color: "rgba(255,255,255,0.5)", marginBottom: 8,
        fontFamily: "'Cormorant Garamond', Georgia, serif", textTransform: "uppercase",
      }}>{label}</label>
      <div style={{
        position: "relative", borderRadius: 8,
        border: `1px solid ${focused ? `${GOLD}60` : "rgba(255,255,255,0.1)"}`,
        background: disabled ? "rgba(255,255,255,0.04)" : focused ? "rgba(212,175,55,0.03)" : "rgba(255,255,255,0.02)",
        transition: "all 0.3s ease", overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
      }}>
        {icon && (
          <span style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            color: focused ? GOLD : "rgba(255,255,255,0.25)", fontSize: 16, transition: "color 0.3s ease",
          }}>{icon}</span>
        )}
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={onChange} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: icon ? `14px ${rightSlot ? "120px" : "16px"} 14px 42px` : `14px ${rightSlot ? "120px" : "16px"}`,
            background: "transparent", border: "none", outline: "none",
            color: "rgba(255,255,255,0.9)", fontSize: 15, fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box",
          }}
        />
        {rightSlot && (
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
            {rightSlot}
          </div>
        )}
        <div style={{
          position: "absolute", bottom: 0, left: "50%",
          width: focused ? "100%" : "0%", height: 1,
          background: `linear-gradient(to right, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})`,
          transform: "translateX(-50%)", transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Password input ───
function PasswordInput({ label, placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: "block", fontSize: 12, letterSpacing: 1,
        color: "rgba(255,255,255,0.5)", marginBottom: 8,
        fontFamily: "'Cormorant Garamond', Georgia, serif", textTransform: "uppercase",
      }}>{label}</label>
      <div style={{
        position: "relative", borderRadius: 8,
        border: `1px solid ${focused ? `${GOLD}60` : "rgba(255,255,255,0.1)"}`,
        background: focused ? "rgba(212,175,55,0.03)" : "rgba(255,255,255,0.02)",
        transition: "all 0.3s ease", overflow: "hidden",
      }}>
        <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          color: focused ? GOLD : "rgba(255,255,255,0.25)", fontSize: 16, transition: "color 0.3s ease",
        }}>🔒</span>
        <input
          type={show ? "text" : "password"} placeholder={placeholder}
          value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "14px 48px 14px 42px",
            background: "transparent", border: "none", outline: "none",
            color: "rgba(255,255,255,0.9)", fontSize: 15, fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box",
          }}
        />
        <button type="button" onClick={() => setShow(!show)} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", color: "rgba(255,255,255,0.3)",
          cursor: "pointer", fontSize: 14, padding: 4,
        }}>{show ? "🙈" : "👁"}</button>
        <div style={{
          position: "absolute", bottom: 0, left: "50%",
          width: focused ? "100%" : "0%", height: 1,
          background: `linear-gradient(to right, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})`,
          transform: "translateX(-50%)", transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

// ─── 6-digit OTP input ───
function OTPInput({ value, onChange }) {
  const inputRefs = useRef([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKey = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (idx, e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      const next = [...digits];
      next[idx] = "";
      onChange(next.join(""));
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
    onChange(next.join(""));
    if (idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "8px 0 24px" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          style={{
            width: 44, height: 52, textAlign: "center", fontSize: 22, fontWeight: 700,
            fontFamily: "'Cormorant Garamond', Georgia, monospace",
            background: d ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
            border: `1.5px solid ${d ? `${GOLD}70` : "rgba(255,255,255,0.12)"}`,
            borderRadius: 10, color: GOLD_LIGHT, outline: "none",
            transition: "all 0.2s ease", caretColor: GOLD,
            boxSizing: "border-box",
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = GOLD;
            e.target.style.boxShadow = `0 0 0 2px ${GOLD}20`;
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = d ? `${GOLD}70` : "rgba(255,255,255,0.12)";
            e.target.style.boxShadow = "none";
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───
export default function MinjieLoginPage() {
  // modes: login | register | verify-email | forgot | reset-sent
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLineLogin = () => {
    // In production: liff.login()
    showToast("正在導向 LINE 登入（LIFF SDK）...", "success");
  };

  const handleSendOTP = () => {
    if (!email) return showToast("請先輸入電子信箱", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast("信箱格式不正確", "error");
    showToast(`驗證碼已寄送至 ${email}`, "success");
    setCountdown(60);
  };

  const handleRegisterSubmit = () => {
    if (!name) return showToast("請填寫姓名", "error");
    if (!email) return showToast("請填寫電子信箱", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast("信箱格式不正確", "error");
    if (!phone) return showToast("請填寫手機號碼", "error");
    if (!password || password.length < 8) return showToast("密碼至少 8 個字元", "error");
    if (password !== confirmPassword) return showToast("兩次密碼不一致", "error");
    if (!agreed) return showToast("請同意服務條款", "error");
    // Move to email verification step
    setMode("verify-email");
    setOtp("");
    setCountdown(60);
    showToast(`驗證碼已寄送至 ${email}`, "success");
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) return showToast("請輸入完整的 6 位驗證碼", "error");
    // In production: POST /api/auth/verify-email { email, otp }
    showToast("信箱驗證成功！帳號已建立 🎉", "success");
    setTimeout(() => setMode("login"), 1500);
  };

  const handleLogin = () => {
    if (!email || !password) return showToast("請填寫所有欄位", "error");
    showToast("登入中...", "success");
  };

  const handleForgot = () => {
    if (!email) return showToast("請輸入電子信箱", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast("信箱格式不正確", "error");
    setMode("reset-sent");
  };

  const titles = {
    login: { main: "歡迎回來", sub: "登入您的會員帳號，享有專屬優惠" },
    register: { main: "加入會員", sub: "立即註冊，開啟您的健康旅程" },
    "verify-email": { main: "驗證信箱", sub: `我們已發送 6 位數驗證碼至` },
    forgot: { main: "重設密碼", sub: "我們將寄送重設連結至您的信箱" },
    "reset-sent": { main: "信件已寄出", sub: "請至信箱查收重設密碼連結" },
  };

  return (
    <div style={{
      minHeight: "100vh", background: BG_PRIMARY,
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
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
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <GoldParticles />

      {/* Top glow */}
      <div style={{
        position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 300, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${GOLD}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100,
          padding: "12px 24px", borderRadius: 10,
          background: toast.type === "error" ? "rgba(220,38,38,0.9)" : "rgba(212,175,55,0.9)",
          color: toast.type === "error" ? "#fff" : "#000",
          fontSize: 14, fontWeight: 500, backdropFilter: "blur(12px)",
          animation: "slideToast 0.3s ease", boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <header style={{
        padding: "16px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "relative", zIndex: 10,
        borderBottom: `1px solid rgba(212,175,55,0.1)`,
      }}>
        <span style={{
          fontSize: 20, fontWeight: 700,
          background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: 2,
        }}>MINJIE STUDIO</span>
        <a href="/" style={{
          color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none",
          display: "flex", alignItems: "center", gap: 6,
        }}
          onMouseEnter={(e) => e.target.style.color = GOLD}
          onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.4)"}
        >← 返回首頁</a>
      </header>

      {/* Main */}
      <main style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 20px", position: "relative", zIndex: 10,
      }}>
        <div style={{
          width: "100%", maxWidth: 440,
          animation: mounted ? "fadeInUp 0.6s ease" : "none",
        }}>
          {/* Brand Mark */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, margin: "0 auto 20px", position: "relative",
              animation: "pulseGold 3s ease-in-out infinite",
            }}>
              {mode === "verify-email" ? (
                // Mail icon for verification
                <div style={{
                  width: 48, height: 38, border: `1.5px solid ${GOLD}`, borderRadius: 8,
                  position: "absolute", top: 9, left: 4,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 22 }}>✉</span>
                </div>
              ) : mode === "reset-sent" ? (
                // Checkmark icon
                <div style={{
                  width: 48, height: 48, border: `2px solid ${GOLD}`, borderRadius: "50%",
                  position: "absolute", top: 4, left: 4,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "checkPop 0.4s ease",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13L10 18L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <>
                  <div style={{
                    width: 40, height: 40, border: `1.5px solid ${GOLD}60`, borderRadius: 12,
                    transform: "rotate(45deg)", position: "absolute", top: 8, left: 8,
                  }} />
                  <div style={{
                    width: 24, height: 24, border: `1.5px solid ${GOLD}`, borderRadius: 6,
                    transform: "rotate(45deg)", position: "absolute", top: 16, left: 16,
                  }} />
                  <div style={{
                    width: 6, height: 6, background: GOLD, borderRadius: 2,
                    transform: "rotate(45deg)", position: "absolute", top: 25, left: 25,
                  }} />
                </>
              )}
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.95)", margin: 0,
              fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: 1,
            }}>{titles[mode].main}</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              {titles[mode].sub}
              {mode === "verify-email" && (
                <span style={{ display: "block", color: GOLD, fontWeight: 600, marginTop: 4 }}>{email}</span>
              )}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: BG_CARD, border: `1px solid rgba(212,175,55,0.12)`,
            borderRadius: 16, padding: "32px 28px",
            boxShadow: `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.06)`,
          }}>

            {/* ═══════ VERIFY EMAIL MODE ═══════ */}
            {mode === "verify-email" && (
              <>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", margin: "0 0 20px", lineHeight: 1.6 }}>
                  請輸入信箱收到的 <span style={{ color: GOLD }}>6 位數驗證碼</span><br />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>找不到信件？請檢查垃圾郵件匣</span>
                </p>

                <OTPInput value={otp} onChange={setOtp} />

                {/* Resend */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {countdown > 0 ? (
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                      {countdown} 秒後可重新發送
                    </span>
                  ) : (
                    <button onClick={handleSendOTP} style={{
                      background: "none", border: "none", color: GOLD, fontSize: 13,
                      cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
                    }}>重新發送驗證碼</button>
                  )}
                </div>

                {/* Verify button */}
                <button onClick={handleVerifyOTP} style={{
                  width: "100%", padding: "15px 20px",
                  background: otp.length === 6
                    ? `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`
                    : "rgba(255,255,255,0.06)",
                  backgroundSize: "200% auto", border: "none", borderRadius: 10,
                  color: otp.length === 6 ? "#0A0A0A" : "rgba(255,255,255,0.25)",
                  fontSize: 16, fontWeight: 700, cursor: otp.length === 6 ? "pointer" : "default",
                  letterSpacing: 1, transition: "all 0.3s ease",
                  boxShadow: otp.length === 6 ? `0 4px 16px rgba(212,175,55,0.2)` : "none",
                }}
                  onMouseEnter={(e) => { if (otp.length === 6) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(212,175,55,0.35)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = otp.length === 6 ? "0 4px 16px rgba(212,175,55,0.2)" : "none"; }}
                >確認驗證</button>

                {/* Change email */}
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button onClick={() => { setMode("register"); setOtp(""); }} style={{
                    background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 13,
                    cursor: "pointer",
                  }}
                    onMouseEnter={(e) => e.target.style.color = GOLD}
                    onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.35)"}
                  >← 修改信箱或資料</button>
                </div>
              </>
            )}

            {/* ═══════ RESET SENT MODE ═══════ */}
            {mode === "reset-sent" && (
              <>
                <div style={{
                  background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}20`,
                  borderRadius: 12, padding: "20px", textAlign: "center", marginBottom: 24,
                }}>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                    重設密碼連結已寄送至<br />
                    <span style={{ color: GOLD, fontWeight: 600 }}>{email}</span>
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "12px 0 0" }}>
                    連結將於 30 分鐘內有效，請盡速操作
                  </p>
                </div>
                <button onClick={() => setMode("login")} style={{
                  width: "100%", padding: "15px 20px",
                  background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                  backgroundSize: "200% auto", border: "none", borderRadius: 10,
                  color: "#0A0A0A", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
                }}>返回登入</button>
              </>
            )}

            {/* ═══════ LOGIN / REGISTER / FORGOT ═══════ */}
            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <>
                {/* LINE Login — primary CTA for login/register */}
                {mode !== "forgot" && (
                  <>
                    <button onClick={handleLineLogin} style={{
                      width: "100%", padding: "15px 20px",
                      background: LINE_GREEN, border: "none", borderRadius: 10,
                      color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      transition: "all 0.2s ease", boxShadow: `0 4px 16px rgba(6,199,85,0.25)`,
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(6,199,85,0.35)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(6,199,85,0.25)"; }}
                    >
                      <LineIcon size={22} />
                      使用 LINE 帳號{mode === "login" ? "登入" : "註冊"}
                    </button>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                      {["一鍵快速登入", "自動累積消費", "LINE 訊息通知"].map((t) => (
                        <span key={t} style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: `${GOLD}80`, fontSize: 10 }}>✦</span> {t}
                        </span>
                      ))}
                    </div>
                    <GoldDivider text="或使用電子信箱" />
                  </>
                )}

                {/* Register extra fields */}
                {mode === "register" && (
                  <>
                    <FormInput label="姓名" placeholder="請輸入您的姓名" value={name} onChange={(e) => setName(e.target.value)} icon="👤" />
                    <FormInput label="手機號碼" type="tel" placeholder="0912-345-678" value={phone} onChange={(e) => setPhone(e.target.value)} icon="📱" />
                  </>
                )}

                {/* Email field */}
                <FormInput label="電子信箱" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} icon="✉" />

                {/* Password fields */}
                {mode !== "forgot" && (
                  <PasswordInput label="密碼" placeholder={mode === "register" ? "至少 8 個字元" : "請輸入密碼"} value={password} onChange={(e) => setPassword(e.target.value)} />
                )}
                {mode === "register" && (
                  <PasswordInput label="確認密碼" placeholder="再次輸入密碼" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                )}

                {/* Forgot link */}
                {mode === "login" && (
                  <div style={{ textAlign: "right", marginTop: -8, marginBottom: 20 }}>
                    <button onClick={() => setMode("forgot")} style={{
                      background: "none", border: "none", color: `${GOLD}80`, fontSize: 13,
                      cursor: "pointer", transition: "color 0.2s",
                    }}
                      onMouseEnter={(e) => e.target.style.color = GOLD}
                      onMouseLeave={(e) => e.target.style.color = `${GOLD}80`}
                    >忘記密碼？</button>
                  </div>
                )}

                {/* Email verification notice for register */}
                {mode === "register" && (
                  <div style={{
                    background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD}15`,
                    borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>📧</span>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      送出後將發送 <span style={{ color: GOLD }}>6 位數驗證碼</span> 至您的信箱，
                      請確認信箱填寫正確，以免收不到驗證信。
                    </p>
                  </div>
                )}

                {/* Terms checkbox */}
                {mode === "register" && (
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, cursor: "pointer" }}>
                    <div onClick={() => setAgreed(!agreed)} style={{
                      width: 20, height: 20, minWidth: 20, borderRadius: 5,
                      border: `1.5px solid ${agreed ? GOLD : "rgba(255,255,255,0.2)"}`,
                      background: agreed ? `${GOLD}20` : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease", marginTop: 1,
                    }}>
                      {agreed && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      我已閱讀並同意{" "}
                      <a href="/policy/terms" style={{ color: GOLD, textDecoration: "none" }}>服務條款</a>
                      {" "}及{" "}
                      <a href="/policy/privacy" style={{ color: GOLD, textDecoration: "none" }}>隱私權政策</a>
                    </span>
                  </label>
                )}

                {/* Submit */}
                <button onClick={mode === "login" ? handleLogin : mode === "register" ? handleRegisterSubmit : handleForgot} style={{
                  width: "100%", padding: "15px 20px",
                  background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                  backgroundSize: "200% auto", border: "none", borderRadius: 10,
                  color: "#0A0A0A", fontSize: 16, fontWeight: 700, cursor: "pointer",
                  letterSpacing: 1, transition: "all 0.3s ease",
                  boxShadow: `0 4px 16px rgba(212,175,55,0.2)`,
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundPosition = "right center"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(212,175,55,0.35)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundPosition = "left center"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(212,175,55,0.2)"; }}
                >
                  {mode === "login" ? "登入" : mode === "register" ? "下一步：驗證信箱" : "發送重設連結"}
                </button>
              </>
            )}
          </div>

          {/* Mode switch */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
            {mode === "login" && (
              <>還不是會員？{" "}
                <button onClick={() => { setMode("register"); setPassword(""); }} style={{
                  background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 14, fontWeight: 500,
                }}>立即註冊</button>
              </>
            )}
            {mode === "register" && (
              <>已經有帳號？{" "}
                <button onClick={() => { setMode("login"); setPassword(""); setConfirmPassword(""); }} style={{
                  background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 14, fontWeight: 500,
                }}>登入</button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} style={{
                background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 14, fontWeight: 500,
              }}>← 返回登入</button>
            )}
          </div>

          {/* Trust badges */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 24, marginTop: 40,
            paddingTop: 24, borderTop: `1px solid rgba(212,175,55,0.08)`, flexWrap: "wrap",
          }}>
            {[
              { icon: "🔐", text: "SSL 安全加密" },
              { icon: "🛡", text: "資料嚴格保護" },
              { icon: "💳", text: "安全交易環境" },
            ].map((b) => (
              <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 0.5 }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: "16px 24px", textAlign: "center",
        borderTop: `1px solid rgba(212,175,55,0.06)`, position: "relative", zIndex: 10,
      }}>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, margin: 0 }}>
          © 2026 MINJIE STUDIO. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
