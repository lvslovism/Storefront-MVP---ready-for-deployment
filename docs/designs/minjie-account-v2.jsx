import { useState, useEffect } from "react";

// ─── MINJIE STUDIO 會員中心 v2 ───
// 4 Tabs + 快速結帳功能：常用地址/超商、再買一次、偏好配送
// Mock data based on actual Supabase schema

const GOLD = "#D4AF37";
const GOLD_LIGHT = "#F5E6A3";
const GOLD_DARK = "#B8962E";
const BG = "#0A0A0A";
const BG_CARD = "#111111";
const BG_CARD2 = "#161616";
const LINE_GREEN = "#06C755";

// ─── Mock Data ───

const MOCK_USER = {
  name: "林小美", email: "mei@example.com", phone: "0912-345-678",
  line_display_name: "小美 ✨", line_picture_url: null,
  birthday: "1992-06-15", login_method: "line",
  preferred_shipping: "cvs", // cvs | home | null
};

const MOCK_ADDRESSES = [
  { id: "addr_1", label: "住家", name: "林小美", phone: "0912-345-678", zip: "106", city: "台北市", district: "大安區", address: "忠孝東路四段 100 號 5 樓", is_default: true },
  { id: "addr_2", label: "公司", name: "林小美", phone: "0912-345-678", zip: "110", city: "台北市", district: "信義區", address: "松仁路 50 號 12 樓", is_default: false },
];

const MOCK_CVS_STORES = [
  { id: "cvs_1", type: "UNIMARTC2C", store_id: "131386", store_name: "統一超商 忠孝門市", address: "台北市大安區忠孝東路四段 120 號", is_default: true },
  { id: "cvs_2", type: "FAMIC2C", store_id: "007543", store_name: "全家 信義莊敬店", address: "台北市信義區莊敬路 178 號", is_default: false },
];

const MOCK_TIER = {
  tier_level: "silver", tier_points: 2480, total_orders: 8,
  total_spent: 12600, discount_rate: 0.03,
  upgraded_at: "2026-01-15", expires_at: "2027-01-15",
};

const TIER_CONFIG = [
  { tier_level: "normal", tier_name: "一般會員", min_spent: 0, points_multiplier: 1.0, birthday_points: 50, monthly_credits: 0, color: "#888", icon: "☆" },
  { tier_level: "silver", tier_name: "白銀會員", min_spent: 5000, points_multiplier: 1.5, birthday_points: 100, monthly_credits: 50, color: "#C0C0C0", icon: "✦" },
  { tier_level: "gold", tier_name: "黃金會員", min_spent: 20000, points_multiplier: 2.0, birthday_points: 200, monthly_credits: 100, color: GOLD, icon: "★" },
  { tier_level: "vip", tier_name: "VIP 會員", min_spent: 50000, points_multiplier: 3.0, birthday_points: 500, monthly_credits: 200, color: "#E8C4FF", icon: "♛" },
];

const MOCK_WALLET = { balance: 350, total_earned: 1260, total_spent: 910 };

const MOCK_TRANSACTIONS = [
  { id: 1, type: "earn", amount: 126, description: "訂單 #42 消費回饋", created_at: "2026-02-10", balance_after: 350 },
  { id: 2, type: "spend", amount: -200, description: "訂單 #41 折抵", created_at: "2026-02-05", balance_after: 224 },
  { id: 3, type: "earn", amount: 100, description: "生日禮金", created_at: "2026-01-15", balance_after: 424 },
  { id: 4, type: "earn", amount: 50, description: "每月配額（白銀會員）", created_at: "2026-01-01", balance_after: 324 },
  { id: 5, type: "spend", amount: -150, description: "訂單 #38 折抵", created_at: "2025-12-20", balance_after: 274 },
  { id: 6, type: "earn", amount: 84, description: "訂單 #38 消費回饋", created_at: "2025-12-18", balance_after: 424 },
];

const MOCK_ORDERS = [
  { id: "order_01KH001", display_id: 42, status: "shipped", created_at: "2026-02-10", total: 1260, items: [{ title: "598 益生菌", subtitle: "原味", quantity: 2, unit_price: 598 }], shipping: "超商取貨", payment: "credit_card" },
  { id: "order_01KH002", display_id: 41, status: "delivered", created_at: "2026-02-05", total: 2380, items: [{ title: "膠原蛋白粉", subtitle: "莓果風味", quantity: 1, unit_price: 1280 }, { title: "綜合維他命", subtitle: null, quantity: 1, unit_price: 980 }], shipping: "宅配到府", payment: "credit_card" },
  { id: "order_01KH003", display_id: 38, status: "delivered", created_at: "2025-12-18", total: 1596, items: [{ title: "598 益生菌", subtitle: "原味", quantity: 1, unit_price: 598 }, { title: "蔓越莓膠囊", subtitle: null, quantity: 1, unit_price: 780 }], shipping: "超商取貨", payment: "cod" },
  { id: "order_01KH004", display_id: 35, status: "delivered", created_at: "2025-11-22", total: 598, items: [{ title: "598 葉酸鐵", subtitle: null, quantity: 1, unit_price: 598 }], shipping: "超商取貨", payment: "credit_card" },
];

// ─── Shared Components ───

function GoldParticles() {
  const [p] = useState(() => Array.from({ length: 14 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 1, dur: Math.random() * 8 + 6,
    delay: Math.random() * -10, opacity: Math.random() * 0.15 + 0.03,
  })));
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {p.map((d) => (
        <div key={d.id} style={{
          position: "absolute", left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size, borderRadius: "50%",
          background: GOLD, opacity: d.opacity,
          animation: `floatP ${d.dur}s ease-in-out ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{
      color: "rgba(255,255,255,0.6)", fontSize: 13, letterSpacing: 1,
      marginBottom: 14, fontFamily: "'Cormorant Garamond', Georgia, serif",
      textTransform: "uppercase",
    }}>{children}</h3>
  );
}

function SmallButton({ children, onClick, variant = "gold", style: sx = {} }) {
  const base = {
    gold: { bg: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30`, hoverBg: `${GOLD}25` },
    green: { bg: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", hoverBg: "rgba(16,185,129,0.2)" },
    red: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)", hoverBg: "rgba(239,68,68,0.15)" },
    ghost: { bg: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)", hoverBg: "rgba(255,255,255,0.05)" },
  }[variant];
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500,
      background: base.bg, color: base.color, border: base.border,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap", ...sx,
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = base.hoverBg}
      onMouseLeave={(e) => e.currentTarget.style.background = base.bg}
    >{children}</button>
  );
}

// ─── Tab: 訂單紀錄（含再買一次）───

function OrdersTab({ showToast }) {
  const statusMap = {
    pending: { label: "處理中", color: "#F59E0B" },
    shipped: { label: "已出貨", color: "#3B82F6" },
    delivered: { label: "已送達", color: "#10B981" },
    cancelled: { label: "已取消", color: "#EF4444" },
  };
  const paymentMap = { credit_card: "信用卡", cod: "貨到付款" };

  const handleReorder = (order) => {
    const itemNames = order.items.map((i) => i.title).join("、");
    showToast(`已將「${itemNames}」加入購物車 🛒`);
  };

  return (
    <div>
      {MOCK_ORDERS.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📦</div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>尚無訂單紀錄</p>
          <a href="/products" style={{
            display: "inline-block", marginTop: 16, padding: "10px 24px",
            background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
            color: "#0A0A0A", borderRadius: 8, textDecoration: "none",
            fontSize: 14, fontWeight: 600,
          }}>開始選購</a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOCK_ORDERS.map((order) => {
            const s = statusMap[order.status] || statusMap.pending;
            return (
              <div key={order.id} style={{
                background: BG_CARD2, borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)", padding: 20,
                transition: "border-color 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${GOLD}30`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600 }}>
                      訂單 #{order.display_id}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: `${s.color}18`, color: s.color, fontWeight: 500,
                    }}>{s.label}</span>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{order.created_at}</span>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 12 }}>
                  {order.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                        {item.title}
                        {item.subtitle && <span style={{ color: "rgba(255,255,255,0.3)" }}> · {item.subtitle}</span>}
                        {" "}×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{order.shipping}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{paymentMap[order.payment]}</span>
                  </div>
                  <span style={{ color: GOLD, fontSize: 16, fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    NT${order.total.toLocaleString()}
                  </span>
                </div>

                {/* Reorder button */}
                <div style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <button onClick={() => {}} style={{
                    background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                    fontSize: 12, cursor: "pointer", padding: 0,
                  }}>查看詳情 →</button>
                  <SmallButton onClick={() => handleReorder(order)} variant="green">
                    🔄 再買一次
                  </SmallButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: 會員等級 ───

function TierTab() {
  const current = TIER_CONFIG.find((t) => t.tier_level === MOCK_TIER.tier_level);
  const currentIdx = TIER_CONFIG.findIndex((t) => t.tier_level === MOCK_TIER.tier_level);
  const next = TIER_CONFIG[currentIdx + 1];
  const progress = next ? Math.min((MOCK_TIER.total_spent / next.min_spent) * 100, 100) : 100;
  const remaining = next ? next.min_spent - MOCK_TIER.total_spent : 0;

  return (
    <div>
      {/* Tier Card */}
      <div style={{
        background: `linear-gradient(135deg, ${BG_CARD2} 0%, ${BG_CARD} 100%)`,
        border: `1.5px solid ${current.color}40`, borderRadius: 16,
        padding: "28px 24px", marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 120, height: 120,
          borderRadius: "50%", background: `radial-gradient(circle, ${current.color}12 0%, transparent 70%)`,
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{current.icon}</span>
              <span style={{
                fontSize: 22, fontWeight: 700, color: current.color,
                fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: 1,
              }}>{current.tier_name}</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
              有效期至 {MOCK_TIER.expires_at}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>目前積點</div>
            <div style={{ color: GOLD_LIGHT, fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {MOCK_TIER.tier_points.toLocaleString()}
            </div>
          </div>
        </div>
        {next && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                距離 <span style={{ color: next.color, fontWeight: 600 }}>{next.tier_name}</span>
              </span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                還需消費 <span style={{ color: GOLD }}>NT${remaining.toLocaleString()}</span>
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${progress}%`,
                background: `linear-gradient(to right, ${current.color}, ${next.color})`,
                transition: "width 1s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>NT${MOCK_TIER.total_spent.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>NT${next.min_spent.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "累計消費", value: `NT$${MOCK_TIER.total_spent.toLocaleString()}` },
          { label: "累計訂單", value: `${MOCK_TIER.total_orders} 筆` },
          { label: "會員折扣", value: `${(MOCK_TIER.discount_rate * 100).toFixed(0)}% OFF` },
        ].map((s) => (
          <div key={s.label} style={{
            background: BG_CARD2, borderRadius: 10, padding: "16px 12px", textAlign: "center",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <SectionTitle>等級權益</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: "🎂", label: "生日禮金", value: `${current.birthday_points} 點`, active: true },
          { icon: "💰", label: "每月購物金", value: current.monthly_credits > 0 ? `NT$${current.monthly_credits}` : "—", active: current.monthly_credits > 0 },
          { icon: "✨", label: "積點倍率", value: `${current.points_multiplier}x`, active: true },
          { icon: "🏷", label: "會員折扣", value: MOCK_TIER.discount_rate > 0 ? `${(MOCK_TIER.discount_rate * 100).toFixed(0)}%` : "—", active: MOCK_TIER.discount_rate > 0 },
        ].map((b) => (
          <div key={b.label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderRadius: 10,
            background: b.active ? "rgba(212,175,55,0.04)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${b.active ? `${GOLD}15` : "rgba(255,255,255,0.04)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{b.label}</span>
            </div>
            <span style={{ color: b.active ? GOLD : "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: 600 }}>{b.value}</span>
          </div>
        ))}
      </div>

      {/* All tiers */}
      <SectionTitle>等級一覽</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        {TIER_CONFIG.map((t) => {
          const isCurrent = t.tier_level === MOCK_TIER.tier_level;
          return (
            <div key={t.tier_level} style={{
              padding: "14px 16px", borderRadius: 10,
              background: isCurrent ? `${t.color}08` : "rgba(255,255,255,0.02)",
              border: `1px solid ${isCurrent ? `${t.color}40` : "rgba(255,255,255,0.05)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span style={{ color: t.color, fontSize: 13, fontWeight: 600 }}>{t.tier_name}</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                {t.min_spent > 0 ? `累計消費 NT$${t.min_spent.toLocaleString()}` : "免費加入"}
              </div>
              {isCurrent && (
                <div style={{
                  marginTop: 6, fontSize: 10, color: GOLD, fontWeight: 600,
                  display: "inline-block", padding: "2px 8px", borderRadius: 4, background: `${GOLD}15`,
                }}>目前等級</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: 購物金 ───

function WalletTab() {
  const typeMap = {
    earn: { label: "獲得", color: "#10B981", prefix: "+" },
    spend: { label: "使用", color: "#F59E0B", prefix: "" },
    expire: { label: "到期", color: "#EF4444", prefix: "" },
    admin_adjust: { label: "調整", color: "#8B5CF6", prefix: "" },
  };

  return (
    <div>
      {/* Balance */}
      <div style={{
        background: `linear-gradient(135deg, ${BG_CARD2}, ${BG_CARD})`,
        border: `1px solid ${GOLD}20`, borderRadius: 16,
        padding: "28px 24px", marginBottom: 24,
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 200, height: 120, borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`,
        }} />
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 8, position: "relative" }}>購物金餘額</div>
        <div style={{
          fontSize: 42, fontWeight: 700, color: GOLD_LIGHT, position: "relative",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}>NT${MOCK_WALLET.balance}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 16, position: "relative" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>累計獲得</div>
            <div style={{ color: "#10B981", fontSize: 15, fontWeight: 600 }}>NT${MOCK_WALLET.total_earned}</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>累計使用</div>
            <div style={{ color: "#F59E0B", fontSize: 15, fontWeight: 600 }}>NT${MOCK_WALLET.total_spent}</div>
          </div>
        </div>
      </div>

      <div style={{
        background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD}12`,
        borderRadius: 10, padding: "12px 16px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>💡</span>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          購物金可於結帳時折抵，<span style={{ color: GOLD }}>1 點 = NT$1</span>，每筆訂單最多折抵 50%。
        </p>
      </div>

      <SectionTitle>交易紀錄</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {MOCK_TRANSACTIONS.map((tx, i) => {
          const t = typeMap[tx.type] || typeMap.earn;
          return (
            <div key={tx.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px",
              background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
              borderRadius: 8,
            }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 3 }}>{tx.description}</div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{tx.created_at}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: t.color, fontSize: 16, fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  {t.prefix}{tx.amount > 0 ? "+" : ""}{tx.amount}
                </div>
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>餘額 {tx.balance_after}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: 個人資料（含地址/超商/偏好配送）───

function ProfileTab({ showToast }) {
  const [name, setName] = useState(MOCK_USER.name);
  const [phone, setPhone] = useState(MOCK_USER.phone);
  const [birthday, setBirthday] = useState(MOCK_USER.birthday);
  const [preferredShipping, setPreferredShipping] = useState(MOCK_USER.preferred_shipping);
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  const [cvsStores, setCvsStores] = useState(MOCK_CVS_STORES);
  const [showAddAddress, setShowAddAddress] = useState(false);

  const labelStyle = {
    display: "block", fontSize: 12, letterSpacing: 1,
    color: "rgba(255,255,255,0.45)", marginBottom: 8,
    fontFamily: "'Cormorant Garamond', Georgia, serif", textTransform: "uppercase",
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "rgba(255,255,255,0.9)",
    fontSize: 15, outline: "none", fontFamily: "system-ui, sans-serif",
    transition: "border-color 0.2s", boxSizing: "border-box",
  };

  const cvsTypeNames = { UNIMARTC2C: "7-ELEVEN", FAMIC2C: "全家", HILIFEC2C: "萊爾富" };

  return (
    <div>
      {/* LINE Binding */}
      {MOCK_USER.login_method === "line" && (
        <div style={{
          background: "rgba(6,199,85,0.06)", border: "1px solid rgba(6,199,85,0.15)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: LINE_GREEN,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: "#fff", fontWeight: 700,
            }}>L</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 500 }}>{MOCK_USER.line_display_name}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>LINE 帳號已綁定</div>
            </div>
          </div>
          <span style={{ color: LINE_GREEN, fontSize: 12, fontWeight: 500 }}>✓ 已連結</span>
        </div>
      )}

      {/* Basic Info */}
      <SectionTitle>基本資料</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
        <div>
          <label style={labelStyle}>姓名</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = `${GOLD}50`}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </div>
        <div>
          <label style={labelStyle}>電子信箱</label>
          <div style={{
            padding: "12px 14px", background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
            color: "rgba(255,255,255,0.4)", fontSize: 15,
            display: "flex", justifyContent: "space-between",
          }}>
            {MOCK_USER.email}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>不可修改</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>手機號碼</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = `${GOLD}50`}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </div>
        <div>
          <label style={labelStyle}>生日</label>
          <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" style={{ ...inputStyle, colorScheme: "dark" }}
            onFocus={(e) => e.target.style.borderColor = `${GOLD}50`}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 6 }}>生日設定後無法修改，用於發放生日禮金</p>
        </div>
      </div>

      {/* ── Preferred Shipping ── */}
      <SectionTitle>偏好配送方式</SectionTitle>
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: -8, marginBottom: 14 }}>
        結帳時將自動預選您偏好的配送方式
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
        {[
          { key: "cvs", label: "超商取貨", icon: "🏪", desc: "7-ELEVEN / 全家" },
          { key: "home", label: "宅配到府", icon: "🚚", desc: "送到指定地址" },
        ].map((m) => {
          const isActive = preferredShipping === m.key;
          return (
            <button key={m.key} onClick={() => setPreferredShipping(m.key)} style={{
              padding: "16px", borderRadius: 12, border: "none", cursor: "pointer",
              background: isActive ? `${GOLD}10` : "rgba(255,255,255,0.02)",
              outline: `2px solid ${isActive ? `${GOLD}50` : "rgba(255,255,255,0.06)"}`,
              textAlign: "left", transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ color: isActive ? GOLD : "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{m.desc}</div>
              {isActive && (
                <div style={{
                  marginTop: 8, fontSize: 10, color: GOLD, fontWeight: 600,
                  display: "inline-block", padding: "2px 8px", borderRadius: 4, background: `${GOLD}15`,
                }}>已選擇</div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Saved Addresses ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionTitle>常用宅配地址</SectionTitle>
        <SmallButton onClick={() => setShowAddAddress(true)}>+ 新增地址</SmallButton>
      </div>
      {addresses.length === 0 ? (
        <div style={{
          padding: "32px 20px", textAlign: "center", borderRadius: 12,
          border: "1px dashed rgba(255,255,255,0.1)", marginBottom: 32,
        }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>尚無儲存的地址</p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>新增地址後，結帳時可一鍵帶入</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {addresses.map((addr) => (
            <div key={addr.id} style={{
              background: BG_CARD2, borderRadius: 12, padding: "16px 18px",
              border: `1px solid ${addr.is_default ? `${GOLD}25` : "rgba(255,255,255,0.06)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    background: addr.is_default ? `${GOLD}15` : "rgba(255,255,255,0.04)",
                    color: addr.is_default ? GOLD : "rgba(255,255,255,0.4)",
                    fontWeight: 500,
                  }}>{addr.label}</span>
                  {addr.is_default && (
                    <span style={{ fontSize: 10, color: GOLD, fontWeight: 500 }}>預設</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <SmallButton variant="ghost" onClick={() => showToast("功能開發中")}>編輯</SmallButton>
                  <SmallButton variant="red" onClick={() => {
                    setAddresses(addresses.filter((a) => a.id !== addr.id));
                    showToast("已刪除地址");
                  }}>刪除</SmallButton>
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 4 }}>
                {addr.name}　{addr.phone}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                {addr.zip} {addr.city}{addr.district}{addr.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Saved CVS Stores ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionTitle>常用超商門市</SectionTitle>
        <SmallButton onClick={() => showToast("選擇門市功能將串接 ECPay 門市地圖")}>+ 新增門市</SmallButton>
      </div>
      {cvsStores.length === 0 ? (
        <div style={{
          padding: "32px 20px", textAlign: "center", borderRadius: 12,
          border: "1px dashed rgba(255,255,255,0.1)", marginBottom: 32,
        }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>尚無儲存的門市</p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>結帳時選擇超商門市後，會自動儲存到這裡</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {cvsStores.map((store) => (
            <div key={store.id} style={{
              background: BG_CARD2, borderRadius: 12, padding: "16px 18px",
              border: `1px solid ${store.is_default ? `${GOLD}25` : "rgba(255,255,255,0.06)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    background: store.type === "UNIMARTC2C" ? "rgba(230,0,18,0.1)" : store.type === "FAMIC2C" ? "rgba(0,125,0,0.1)" : "rgba(255,165,0,0.1)",
                    color: store.type === "UNIMARTC2C" ? "#E60012" : store.type === "FAMIC2C" ? "#007D00" : "#FF8C00",
                    fontWeight: 600,
                  }}>{cvsTypeNames[store.type]}</span>
                  {store.is_default && (
                    <span style={{ fontSize: 10, color: GOLD, fontWeight: 500 }}>預設</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!store.is_default && (
                    <SmallButton variant="gold" onClick={() => {
                      setCvsStores(cvsStores.map((s) => ({ ...s, is_default: s.id === store.id })));
                      showToast("已設為預設門市");
                    }}>設為預設</SmallButton>
                  )}
                  <SmallButton variant="red" onClick={() => {
                    setCvsStores(cvsStores.filter((s) => s.id !== store.id));
                    showToast("已刪除門市");
                  }}>刪除</SmallButton>
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 4 }}>
                {store.store_name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                門市代號 {store.store_id}　·　{store.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      <button onClick={() => showToast("個人資料已更新 ✓")} style={{
        width: "100%", padding: "14px", marginTop: 8,
        background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
        backgroundSize: "200% auto", border: "none", borderRadius: 10,
        color: "#0A0A0A", fontSize: 15, fontWeight: 700, cursor: "pointer",
        letterSpacing: 1, transition: "all 0.3s ease",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundPosition = "right center"; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundPosition = "left center"; e.currentTarget.style.transform = "translateY(0)"; }}
      >儲存變更</button>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.25)",
          fontSize: 13, cursor: "pointer",
        }}
          onMouseEnter={(e) => e.target.style.color = "#EF4444"}
          onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.25)"}
        >刪除帳號</button>
      </div>
    </div>
  );
}

// ─── Main Component ───

const TABS = [
  { key: "orders", label: "訂單紀錄", icon: "📦" },
  { key: "tier", label: "會員等級", icon: "👑" },
  { key: "wallet", label: "購物金", icon: "💰" },
  { key: "profile", label: "個人資料", icon: "👤" },
];

export default function MinjieAccountPage() {
  const [activeTab, setActiveTab] = useState("orders");
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);
  useEffect(() => { setMounted(true); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div style={{
      minHeight: "100vh", background: BG,
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        @keyframes floatP {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-18px) translateX(6px); }
          50% { transform: translateY(-6px) translateX(-4px); }
          75% { transform: translateY(-22px) translateX(3px); }
        }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 2px; }
      `}</style>

      <GoldParticles />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100,
          padding: "12px 24px", borderRadius: 10,
          background: "rgba(212,175,55,0.9)", color: "#000",
          fontSize: 14, fontWeight: 500, backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          animation: "fadeInUp 0.3s ease",
        }}>{toast}</div>
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
        <a href="/" style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none" }}
          onMouseEnter={(e) => e.target.style.color = GOLD}
          onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.4)"}
        >← 返回首頁</a>
      </header>

      {/* User greeting */}
      <div style={{
        padding: "28px 24px 0", position: "relative", zIndex: 10,
        maxWidth: 600, margin: "0 auto",
        animation: mounted ? "fadeInUp 0.5s ease" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "#0A0A0A", fontWeight: 700,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            boxShadow: `0 0 0 2px ${BG}, 0 0 0 3px ${GOLD}40`,
          }}>
            {MOCK_USER.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
              {MOCK_USER.name}
            </h1>
            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              {TIER_CONFIG.find((t) => t.tier_level === MOCK_TIER.tier_level)?.icon}{" "}
              {TIER_CONFIG.find((t) => t.tier_level === MOCK_TIER.tier_level)?.tier_name}
              　·　購物金 <span style={{ color: GOLD }}>NT${MOCK_WALLET.balance}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, background: BG_CARD, borderRadius: 12,
          padding: 4, marginBottom: 24,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                flex: 1, padding: "10px 4px", border: "none", borderRadius: 10,
                background: isActive ? `${GOLD}15` : "transparent",
                color: isActive ? GOLD : "rgba(255,255,255,0.4)",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: "pointer", transition: "all 0.2s ease",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div key={activeTab} style={{ animation: "fadeInUp 0.3s ease", paddingBottom: 40 }}>
          {activeTab === "orders" && <OrdersTab showToast={showToast} />}
          {activeTab === "tier" && <TierTab />}
          {activeTab === "wallet" && <WalletTab />}
          {activeTab === "profile" && <ProfileTab showToast={showToast} />}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: "16px 24px", textAlign: "center",
        borderTop: `1px solid rgba(212,175,55,0.06)`, position: "relative", zIndex: 10,
      }}>
        <button style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.25)",
          fontSize: 13, cursor: "pointer",
        }}
          onMouseEnter={(e) => e.target.style.color = "#EF4444"}
          onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.25)"}
        >登出</button>
        <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, margin: "8px 0 0" }}>© 2026 MINJIE STUDIO</p>
      </footer>
    </div>
  );
}
