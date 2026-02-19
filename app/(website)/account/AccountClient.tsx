'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Session } from '@/lib/auth';
import { useCart } from '@/components/CartProvider';
import PasskeyManager from '@/components/auth/PasskeyManager';

// ─── Constants ───
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F5E6A3';
const GOLD_DARK = '#B8962E';
const BG_CARD = '#111111';
const BG_CARD2 = '#161616';
const LINE_GREEN = '#06C755';

// ─── Types ───
interface TierData {
  level: string;
  name: string;
  points: number;
  totalOrders: number;
  totalSpent: number;
  discountRate: number;
  upgradedAt: string | null;
  expiresAt: string | null;
}

interface TierConfigItem {
  level: string;
  name: string;
  minSpent: number;
  pointsMultiplier: number;
  birthdayPoints: number;
  monthlyCredits: number;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

interface Transaction {
  id: string;
  type: string;
  typeName: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

// ─── Fallback Data (used when API fails or data not available) ───
const FALLBACK_TIER: TierData = {
  level: 'silver',
  name: '白銀會員',
  points: 0,
  totalOrders: 0,
  totalSpent: 0,
  discountRate: 0,
  upgradedAt: null,
  expiresAt: null,
};

const FALLBACK_WALLET: WalletData = { balance: 0, totalEarned: 0, totalSpent: 0 };

// 等級顏色和圖標（六級制）
const TIER_VISUALS: Record<string, { color: string; icon: string }> = {
  silver: { color: '#C0C0C0', icon: '✦' },
  gold: { color: GOLD, icon: '★' },
  platinum: { color: '#E5E4E2', icon: '◆' },
  diamond: { color: '#B9F2FF', icon: '💎' },
  elite: { color: '#FF6B6B', icon: '🔥' },
  throne: { color: '#FFD700', icon: '👑' },
};

// ─── Address & CVS Store Types ───
interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  zip_code: string;
  city: string;
  district: string;
  address: string;
  is_default: boolean;
}

interface CvsStore {
  id: string;
  cvs_type: 'UNIMARTC2C' | 'FAMIC2C' | 'HILIFEC2C';
  store_id: string;
  store_name: string;
  address: string;
  is_default: boolean;
}

// Orders interface for API data
interface OrderItem {
  title: string;
  subtitle: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
  variant_id?: string | null;
}

// Profile data from API
interface ProfileData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  picture_url: string | null;
  auth_method: 'line' | 'email';
  line_connected: boolean;
  email_connected: boolean;
  customer_id: string | null;
}

interface Order {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  items: OrderItem[];
  shipping: string;
  payment: string;
}

// ─── Types ───
interface AccountClientProps {
  session: Session;
}

// ─── Shared Components ───

function GoldParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      dur: Math.random() * 8 + 6,
      delay: Math.random() * -10,
      opacity: Math.random() * 0.15 + 0.03,
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[13px] tracking-wider mb-3.5 uppercase"
      style={{
        color: 'rgba(255,255,255,0.6)',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}
    >
      {children}
    </h3>
  );
}

function SmallButton({
  children,
  onClick,
  variant = 'gold',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'gold' | 'green' | 'red' | 'ghost';
}) {
  const variants = {
    gold: 'bg-[#D4AF3715] text-[#D4AF37] border-[#D4AF3730] hover:bg-[#D4AF3725]',
    green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/15 hover:bg-red-500/15',
    ghost: 'bg-transparent text-white/40 border-white/10 hover:bg-white/5',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-[7px] text-xs font-medium border transition-all whitespace-nowrap ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

// ─── Tab: Orders ───

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  showToast: (msg: string) => void;
  onReorder: (order: Order) => Promise<void>;
  reordering: boolean;
}

function OrdersTab({ orders, loading, showToast, onReorder, reordering }: OrdersTabProps) {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '處理中', color: '#F59E0B' },
    shipped: { label: '已出貨', color: '#3B82F6' },
    delivered: { label: '已送達', color: '#10B981' },
    cancelled: { label: '已取消', color: '#EF4444' },
  };
  const paymentMap: Record<string, string> = { credit_card: '信用卡', cod: '貨到付款', pending: '待付款', refunded: '已退款' };

  if (loading) {
    return (
      <div className="text-center py-16 px-5">
        <div className="text-4xl mb-4 opacity-50 animate-pulse">📦</div>
        <p className="text-white/40 text-[15px]">載入訂單中...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 px-5">
        <div className="text-5xl mb-4 opacity-30">📦</div>
        <p className="text-white/40 text-[15px]">尚無訂單紀錄</p>
        <Link
          href="/products"
          className="inline-block mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold text-[#0A0A0A]"
          style={{ background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})` }}
        >
          開始選購
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => {
        const s = statusMap[order.status] || statusMap.pending;
        return (
          <div
            key={order.id}
            className="rounded-xl p-5 transition-colors border hover:border-[#D4AF3730]"
            style={{ background: BG_CARD2, borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-white/80 text-[15px] font-semibold">訂單 #{order.display_id}</span>
                <span
                  className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                  style={{ background: `${s.color}18`, color: s.color }}
                >
                  {s.label}
                </span>
              </div>
              <span className="text-white/30 text-xs">{order.created_at}</span>
            </div>

            {/* Items */}
            <div className="mb-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-white/55 text-[13px]">
                    {item.title}
                    {item.subtitle && <span className="text-white/30"> · {item.subtitle}</span>}
                    {' '}×{item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <span className="text-xs text-white/30">{order.shipping}</span>
                <span className="text-xs text-white/30">{paymentMap[order.payment]}</span>
              </div>
              <span
                className="text-base font-bold"
                style={{ color: GOLD, fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                NT${order.total.toLocaleString()}
              </span>
            </div>

            {/* Reorder */}
            <div className="mt-3.5 pt-3.5 border-t border-white/5 flex justify-between items-center">
              <Link
                href={`/account/orders/${order.id}`}
                className="bg-transparent border-none text-white/30 text-xs cursor-pointer p-0 hover:text-white/50 no-underline"
              >
                查看詳情 →
              </Link>
              <SmallButton onClick={() => onReorder(order)} variant="green">
                {reordering ? '加入中...' : '🔄 再買一次'}
              </SmallButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Tier ───

interface TierTabProps {
  tier: TierData;
  currentConfig: TierConfigItem | null;
  nextTier: TierConfigItem | null;
  progress: number;
  amountToNextTier: number;
  allConfigs: TierConfigItem[];
}

function TierTab({ tier, currentConfig, nextTier, progress, amountToNextTier, allConfigs }: TierTabProps) {
  const visual = TIER_VISUALS[tier.level] || TIER_VISUALS.normal;
  const currentColor = visual.color;
  const currentIcon = visual.icon;
  const currentName = currentConfig?.name || tier.name;

  const nextVisual = nextTier ? (TIER_VISUALS[nextTier.level] || TIER_VISUALS.normal) : null;

  return (
    <div>
      {/* Tier Card */}
      <div
        className="rounded-2xl p-7 mb-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BG_CARD2} 0%, ${BG_CARD} 100%)`,
          border: `1.5px solid ${currentColor}40`,
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-[120px] h-[120px] rounded-full"
          style={{ background: `radial-gradient(circle, ${currentColor}12 0%, transparent 70%)` }}
        />
        <div className="flex justify-between items-start relative">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl">{currentIcon}</span>
              <span
                className="text-[22px] font-bold tracking-wide"
                style={{ color: currentColor, fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {currentName}
              </span>
            </div>
            <p className="text-white/40 text-[13px] m-0">
              {tier.expiresAt ? `有效期至 ${tier.expiresAt.split('T')[0]}` : '永久有效'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-[11px] mb-1">目前積點</div>
            <div
              className="text-[28px] font-bold"
              style={{ color: GOLD_LIGHT, fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {tier.points.toLocaleString()}
            </div>
          </div>
        </div>

        {nextTier && nextVisual && (
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-white/50 text-xs">
                距離 <span className="font-semibold" style={{ color: nextVisual.color }}>{nextTier.name}</span>
              </span>
              <span className="text-white/50 text-xs">
                還需消費 <span style={{ color: GOLD }}>NT${amountToNextTier.toLocaleString()}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(to right, ${currentColor}, ${nextVisual.color})`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-white/30">NT${tier.totalSpent.toLocaleString()}</span>
              <span className="text-[11px] text-white/30">NT${nextTier.minSpent.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '累計消費', value: `NT$${tier.totalSpent.toLocaleString()}` },
          { label: '累計訂單', value: `${tier.totalOrders} 筆` },
          { label: '會員折扣', value: tier.discountRate > 0 ? `${(tier.discountRate * 100).toFixed(0)}% OFF` : '—' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[10px] p-4 text-center border border-white/5"
            style={{ background: BG_CARD2 }}
          >
            <div className="text-white/35 text-[11px] mb-1.5">{s.label}</div>
            <div className="text-white/85 text-base font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <SectionTitle>等級權益</SectionTitle>
      <div className="flex flex-col gap-2.5">
        {[
          { icon: '🎂', label: '生日禮金', value: currentConfig ? `${currentConfig.birthdayPoints} 點` : '—', active: currentConfig ? currentConfig.birthdayPoints > 0 : false },
          { icon: '💰', label: '每月購物金', value: currentConfig && currentConfig.monthlyCredits > 0 ? `NT$${currentConfig.monthlyCredits}` : '—', active: currentConfig ? currentConfig.monthlyCredits > 0 : false },
          { icon: '✨', label: '積點倍率', value: currentConfig ? `${currentConfig.pointsMultiplier}x` : '1x', active: true },
          { icon: '🏷', label: '會員折扣', value: tier.discountRate > 0 ? `${(tier.discountRate * 100).toFixed(0)}%` : '—', active: tier.discountRate > 0 },
        ].map((b) => (
          <div
            key={b.label}
            className="flex items-center justify-between px-4 py-3 rounded-[10px] border"
            style={{
              background: b.active ? 'rgba(212,175,55,0.04)' : 'rgba(255,255,255,0.02)',
              borderColor: b.active ? `${GOLD}15` : 'rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{b.icon}</span>
              <span className="text-white/60 text-sm">{b.label}</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: b.active ? GOLD : 'rgba(255,255,255,0.25)' }}>
              {b.value}
            </span>
          </div>
        ))}
      </div>

      {/* All Tiers */}
      <SectionTitle>等級一覽</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 mt-3.5">
        {allConfigs.map((t) => {
          const isCurrent = t.level === tier.level;
          const tVisual = TIER_VISUALS[t.level] || TIER_VISUALS.normal;
          return (
            <div
              key={t.level}
              className="p-3.5 rounded-[10px] border"
              style={{
                background: isCurrent ? `${tVisual.color}08` : 'rgba(255,255,255,0.02)',
                borderColor: isCurrent ? `${tVisual.color}40` : 'rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">{tVisual.icon}</span>
                <span className="text-[13px] font-semibold" style={{ color: tVisual.color }}>{t.name}</span>
              </div>
              <div className="text-white/35 text-[11px]">
                {t.minSpent > 0 ? `累計消費 NT$${t.minSpent.toLocaleString()}` : '免費加入'}
              </div>
              {isCurrent && (
                <div
                  className="mt-1.5 text-[10px] font-semibold inline-block px-2 py-0.5 rounded"
                  style={{ color: GOLD, background: `${GOLD}15` }}
                >
                  目前等級
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Wallet ───

interface WalletTabProps {
  wallet: WalletData;
  transactions: Transaction[];
}

function WalletTab({ wallet, transactions }: WalletTabProps) {
  const typeMap: Record<string, { label: string; color: string; prefix: string }> = {
    earn: { label: '獲得', color: '#10B981', prefix: '+' },
    spend: { label: '使用', color: '#F59E0B', prefix: '' },
    expire: { label: '到期', color: '#EF4444', prefix: '' },
    adjust: { label: '調整', color: '#8B5CF6', prefix: '' },
  };

  return (
    <div>
      {/* Balance */}
      <div
        className="rounded-2xl p-7 mb-6 text-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BG_CARD2}, ${BG_CARD})`,
          border: `1px solid ${GOLD}20`,
        }}
      >
        <div
          className="absolute -top-[60px] left-1/2 -translate-x-1/2 w-[200px] h-[120px] rounded-full"
          style={{ background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)` }}
        />
        <div className="text-white/40 text-[13px] mb-2 relative">購物金餘額</div>
        <div
          className="text-[42px] font-bold relative"
          style={{ color: GOLD_LIGHT, fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          NT${wallet.balance.toLocaleString()}
        </div>
        <div className="flex justify-center gap-8 mt-4 relative">
          <div>
            <div className="text-white/30 text-[11px]">累計獲得</div>
            <div className="text-emerald-500 text-[15px] font-semibold">NT${wallet.totalEarned.toLocaleString()}</div>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <div className="text-white/30 text-[11px]">累計使用</div>
            <div className="text-amber-500 text-[15px] font-semibold">NT${wallet.totalSpent.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div
        className="rounded-[10px] px-4 py-3 mb-6 flex items-center gap-2.5"
        style={{ background: 'rgba(212,175,55,0.04)', border: `1px solid ${GOLD}12` }}
      >
        <span className="text-base">💡</span>
        <p className="text-white/40 text-xs m-0 leading-relaxed">
          購物金可於結帳時折抵，<span style={{ color: GOLD }}>1 點 = NT$1</span>，每筆訂單最多折抵 50%。
        </p>
      </div>

      {/* Transactions */}
      <SectionTitle>交易紀錄</SectionTitle>
      {transactions.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3 opacity-30">📋</div>
          <p className="text-white/40 text-sm">尚無交易紀錄</p>
        </div>
      ) : (
        <div className="flex flex-col gap-px">
          {transactions.map((tx, i) => {
            const t = typeMap[tx.type] || typeMap.earn;
            return (
              <div
                key={tx.id}
                className="flex justify-between items-center px-4 py-3.5 rounded-lg"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}
              >
                <div>
                  <div className="text-white/70 text-sm mb-0.5">{tx.description}</div>
                  <div className="text-white/25 text-[11px]">{tx.createdAt.split('T')[0]}</div>
                </div>
                <div className="text-right">
                  <div
                    className="text-base font-bold"
                    style={{ color: t.color, fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                  <div className="text-white/20 text-[11px]">餘額 {tx.balanceAfter}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Modal Component ───
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ background: BG_CARD, border: `1px solid ${GOLD}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold text-white/90">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xl bg-transparent border-none cursor-pointer">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tab: Profile ───
interface ProfileTabProps {
  showToast: (msg: string) => void;
  session: Session;
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
  cvsStores: CvsStore[];
  setCvsStores: (stores: CvsStore[]) => void;
  preferredShipping: 'cvs' | 'home' | null;
  setPreferredShipping: (pref: 'cvs' | 'home' | null) => void;
  profileData: ProfileData | null;
  onProfileUpdate: () => void;
}

function ProfileTab({ showToast, session, addresses, setAddresses, cvsStores, setCvsStores, preferredShipping, setPreferredShipping, profileData, onProfileUpdate }: ProfileTabProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [birthdayLocked, setBirthdayLocked] = useState(false);
  // Track original values to detect changes
  const [originalName, setOriginalName] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');

  // Email 綁定 Modal 狀態
  const [emailBindModal, setEmailBindModal] = useState(false);
  const [bindEmail, setBindEmail] = useState('');
  const [bindOtp, setBindOtp] = useState(['', '', '', '', '', '']);
  const [bindStep, setBindStep] = useState<1 | 2>(1);
  const [bindLoading, setBindLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 從 profileData 初始化表單
  useEffect(() => {
    if (profileData) {
      setName(profileData.name || '');
      setOriginalName(profileData.name || '');
      setPhone(profileData.phone || '');
      setOriginalPhone(profileData.phone || '');
      setBirthday(profileData.birthday || '');
      setBirthdayLocked(!!profileData.birthday);
    }
  }, [profileData]);

  const userEmail = profileData?.email || null;

  // Modal states
  const [addressModal, setAddressModal] = useState<{ open: boolean; editing: Address | null }>({ open: false, editing: null });

  // Address form
  const [addrForm, setAddrForm] = useState({ label: '', name: '', phone: '', zip_code: '', city: '', district: '', address: '', is_default: false });

  const cvsTypeNames: Record<string, string> = { UNIMARTC2C: '7-ELEVEN', FAMIC2C: '全家', HILIFEC2C: '萊爾富' };
  const inputClass = "w-full px-3.5 py-3 bg-white/[0.02] border border-white/10 rounded-lg text-white/90 text-[15px] outline-none transition-colors focus:border-[#D4AF3750]";
  const labelClass = "block text-xs tracking-wider mb-2 uppercase text-white/45";

  // Handle preference change
  const handlePreferenceChange = async (pref: 'cvs' | 'home') => {
    setPreferredShipping(pref);
    try {
      const res = await fetch('/api/member/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_shipping: pref }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('已更新配送偏好');
    } catch {
      showToast('更新失敗，請稍後再試');
    }
  };

  // Open address modal
  const openAddressModal = (addr?: Address) => {
    if (addr) {
      setAddrForm({ label: addr.label, name: addr.name, phone: addr.phone, zip_code: addr.zip_code, city: addr.city, district: addr.district, address: addr.address, is_default: addr.is_default });
      setAddressModal({ open: true, editing: addr });
    } else {
      setAddrForm({ label: '', name: '', phone: '', zip_code: '', city: '', district: '', address: '', is_default: false });
      setAddressModal({ open: true, editing: null });
    }
  };

  // Save address
  const saveAddress = async () => {
    if (!addrForm.label || !addrForm.name || !addrForm.phone || !addrForm.city || !addrForm.district || !addrForm.address) {
      showToast('請填寫完整資料');
      return;
    }
    try {
      const method = addressModal.editing ? 'PUT' : 'POST';
      const body = addressModal.editing ? { ...addrForm, id: addressModal.editing.id } : addrForm;
      const res = await fetch('/api/member/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Refresh addresses
      const listRes = await fetch('/api/member/addresses');
      const listData = await listRes.json();
      if (listData.success) setAddresses(listData.addresses);

      setAddressModal({ open: false, editing: null });
      showToast(addressModal.editing ? '地址已更新' : '地址已新增');
    } catch {
      showToast('儲存失敗，請稍後再試');
    }
  };

  // Delete address
  const deleteAddress = async (id: string) => {
    try {
      const res = await fetch('/api/member/addresses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAddresses(addresses.filter((a) => a.id !== id));
      showToast('已刪除地址');
    } catch {
      showToast('刪除失敗');
    }
  };

  // Set default CVS
  const setDefaultCvs = async (id: string) => {
    try {
      const res = await fetch('/api/member/cvs-stores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const listRes = await fetch('/api/member/cvs-stores');
      const listData = await listRes.json();
      if (listData.success) setCvsStores(listData.stores);
      showToast('已設為預設門市');
    } catch {
      showToast('設定失敗');
    }
  };

  // Delete CVS store
  const deleteCvsStore = async (id: string) => {
    try {
      const res = await fetch('/api/member/cvs-stores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setCvsStores(cvsStores.filter((s) => s.id !== id));
      showToast('已刪除門市');
    } catch {
      showToast('刪除失敗');
    }
  };

  // 儲存姓名
  const handleSaveName = async () => {
    if (!name.trim()) {
      showToast('請輸入姓名');
      return;
    }
    if (name.trim() === originalName) return; // No change
    setSavingName(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('姓名已更新');
      setOriginalName(name.trim());
      onProfileUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失敗，請稍後再試');
    } finally {
      setSavingName(false);
    }
  };

  // 儲存手機
  const handleSavePhone = async () => {
    if (phone.trim() === originalPhone) return; // No change
    setSavingPhone(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('手機號碼已更新');
      setOriginalPhone(phone.trim());
      onProfileUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失敗，請稍後再試');
    } finally {
      setSavingPhone(false);
    }
  };

  // 儲存生日（選擇後立即儲存）
  const handleSaveBirthday = async (newBirthday: string) => {
    if (!newBirthday || birthdayLocked) return;
    setSavingBirthday(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthday: newBirthday }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('生日已設定');
      setBirthdayLocked(true);
      onProfileUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '設定失敗，請稍後再試');
      setBirthday(''); // Reset on error
    } finally {
      setSavingBirthday(false);
    }
  };

  // Email 綁定 - 發送驗證碼
  const handleSendBindCode = async () => {
    if (!bindEmail.trim()) {
      showToast('請輸入 Email');
      return;
    }
    setBindLoading(true);
    setDevCode(null);
    try {
      const res = await fetch('/api/auth/email/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: bindEmail.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setBindStep(2);
      showToast('驗證碼已發送');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '發送失敗，請稍後再試');
    } finally {
      setBindLoading(false);
    }
  };

  // Email 綁定 - OTP 輸入處理
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...bindOtp];
    newOtp[index] = value;
    setBindOtp(newOtp);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !bindOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Email 綁定 - 驗證並綁定
  const handleVerifyBind = async () => {
    const code = bindOtp.join('');
    if (code.length !== 6) {
      showToast('請輸入完整驗證碼');
      return;
    }
    setBindLoading(true);
    try {
      const res = await fetch('/api/auth/email/bind-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: bindEmail.trim(), code }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Email 綁定成功');
      setEmailBindModal(false);
      setBindEmail('');
      setBindOtp(['', '', '', '', '', '']);
      setBindStep(1);
      setDevCode(null);
      onProfileUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '綁定失敗，請稍後再試');
    } finally {
      setBindLoading(false);
    }
  };

  // 關閉 Email 綁定 Modal
  const closeEmailBindModal = () => {
    setEmailBindModal(false);
    setBindEmail('');
    setBindOtp(['', '', '', '', '', '']);
    setBindStep(1);
    setDevCode(null);
  };

  return (
    <div>
      {/* Address Modal */}
      <Modal isOpen={addressModal.open} onClose={() => setAddressModal({ open: false, editing: null })} title={addressModal.editing ? '編輯地址' : '新增地址'}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>標籤</label>
              <input value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} placeholder="例：住家" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>收件人</label>
              <input value={addrForm.name} onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>電話</label>
            <input value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} type="tel" className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>郵遞區號</label>
              <input value={addrForm.zip_code} onChange={(e) => setAddrForm({ ...addrForm, zip_code: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>縣市</label>
              <input value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>區域</label>
              <input value={addrForm.district} onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>詳細地址</label>
            <input value={addrForm.address} onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
            <input type="checkbox" checked={addrForm.is_default} onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })} className="w-4 h-4" />
            設為預設地址
          </label>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setAddressModal({ open: false, editing: null })} className="flex-1 py-3 rounded-lg border border-white/10 bg-transparent text-white/60 cursor-pointer">取消</button>
            <button onClick={saveAddress} className="flex-1 py-3 rounded-lg border-none text-[#0A0A0A] font-semibold cursor-pointer" style={{ background: GOLD }}>儲存</button>
          </div>
        </div>
      </Modal>


      {/* LINE Binding */}
      {session.line_user_id && (
        <div className="rounded-xl px-5 py-4 mb-6 flex items-center justify-between" style={{ background: 'rgba(6,199,85,0.06)', border: '1px solid rgba(6,199,85,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl text-white font-bold" style={{ background: LINE_GREEN }}>L</div>
            <div>
              <div className="text-white/80 text-sm font-medium">{session.display_name}</div>
              <div className="text-white/35 text-xs">LINE 帳號已綁定</div>
            </div>
          </div>
          <span className="text-xs font-medium" style={{ color: LINE_GREEN }}>✓ 已連結</span>
        </div>
      )}

      {/* Basic Info */}
      <SectionTitle>基本資料</SectionTitle>
      <div className="flex flex-col gap-5 mb-8">
        <div>
          <label className={labelClass} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>姓名</label>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className={`flex-1 ${inputClass}`} />
            {name.trim() !== originalName && (
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-4 py-2 rounded-lg border-none text-sm font-semibold cursor-pointer whitespace-nowrap transition-opacity"
                style={{ background: GOLD, color: '#0A0A0A', opacity: savingName ? 0.6 : 1 }}
              >
                {savingName ? '...' : '儲存'}
              </button>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>電子信箱</label>
          {userEmail ? (
            <div className="px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/40 text-[15px] flex justify-between">
              {userEmail}
              <span className="text-[11px] text-white/25">不可修改</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/30 text-[15px]">
                尚未綁定
              </div>
              <button
                onClick={() => setEmailBindModal(true)}
                className="px-4 py-3 rounded-lg border-none text-sm font-semibold cursor-pointer whitespace-nowrap"
                style={{ background: GOLD, color: '#0A0A0A' }}
              >
                綁定 Email
              </button>
            </div>
          )}
        </div>
        <div>
          <label className={labelClass} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>手機號碼</label>
          <div className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={`flex-1 ${inputClass}`} />
            {phone.trim() !== originalPhone && (
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                className="px-4 py-2 rounded-lg border-none text-sm font-semibold cursor-pointer whitespace-nowrap transition-opacity"
                style={{ background: GOLD, color: '#0A0A0A', opacity: savingPhone ? 0.6 : 1 }}
              >
                {savingPhone ? '...' : '儲存'}
              </button>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>生日</label>
          <div className="flex gap-2 items-center">
            <input
              value={birthday}
              onChange={(e) => {
                const newValue = e.target.value;
                setBirthday(newValue);
                if (newValue && !birthdayLocked) {
                  handleSaveBirthday(newValue);
                }
              }}
              type="date"
              className={`flex-1 ${inputClass}`}
              style={{ colorScheme: 'dark', opacity: birthdayLocked ? 0.5 : 1 }}
              disabled={birthdayLocked || savingBirthday}
            />
            {savingBirthday && (
              <span className="text-sm" style={{ color: GOLD }}>儲存中...</span>
            )}
          </div>
          <p className="text-white/25 text-[11px] mt-1.5">
            {birthdayLocked ? '生日已設定，無法修改' : '生日設定後無法修改，用於發放生日禮金'}
          </p>
        </div>
      </div>

      {/* Preferred Shipping */}
      <SectionTitle>偏好配送方式</SectionTitle>
      <p className="text-white/35 text-xs -mt-2 mb-3.5">結帳時將自動預選您偏好的配送方式</p>
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        {[
          { key: 'cvs' as const, label: '超商取貨', icon: '🏪', desc: '7-ELEVEN / 全家' },
          { key: 'home' as const, label: '宅配到府', icon: '🚚', desc: '送到指定地址' },
        ].map((m) => {
          const isActive = preferredShipping === m.key;
          return (
            <button key={m.key} onClick={() => handlePreferenceChange(m.key)} className="p-4 rounded-xl border-none cursor-pointer text-left transition-all" style={{ background: isActive ? `${GOLD}10` : 'rgba(255,255,255,0.02)', outline: `2px solid ${isActive ? `${GOLD}50` : 'rgba(255,255,255,0.06)'}` }}>
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: isActive ? GOLD : 'rgba(255,255,255,0.7)' }}>{m.label}</div>
              <div className="text-white/30 text-[11px]">{m.desc}</div>
              {isActive && <div className="mt-2 text-[10px] font-semibold inline-block px-2 py-0.5 rounded" style={{ color: GOLD, background: `${GOLD}15` }}>已選擇</div>}
            </button>
          );
        })}
      </div>

      {/* Saved Addresses */}
      <div className="flex justify-between items-center mb-3.5">
        <SectionTitle>常用宅配地址</SectionTitle>
        <SmallButton onClick={() => openAddressModal()}>+ 新增地址</SmallButton>
      </div>
      {addresses.length === 0 ? (
        <div className="py-8 px-5 text-center rounded-xl border border-dashed border-white/10 mb-8">
          <p className="text-white/30 text-sm">尚無儲存的地址</p>
          <p className="text-white/20 text-xs">新增地址後，結帳時可一鍵帶入</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-8">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-xl px-4 py-4" style={{ background: BG_CARD2, border: `1px solid ${addr.is_default ? `${GOLD}25` : 'rgba(255,255,255,0.06)'}` }}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: addr.is_default ? `${GOLD}15` : 'rgba(255,255,255,0.04)', color: addr.is_default ? GOLD : 'rgba(255,255,255,0.4)' }}>{addr.label}</span>
                  {addr.is_default && <span className="text-[10px] font-medium" style={{ color: GOLD }}>預設</span>}
                </div>
                <div className="flex gap-1.5">
                  <SmallButton variant="ghost" onClick={() => openAddressModal(addr)}>編輯</SmallButton>
                  <SmallButton variant="red" onClick={() => deleteAddress(addr.id)}>刪除</SmallButton>
                </div>
              </div>
              <div className="text-white/70 text-sm mb-1">{addr.name}　{addr.phone}</div>
              <div className="text-white/40 text-[13px]">{addr.zip_code} {addr.city}{addr.district}{addr.address}</div>
            </div>
          ))}
        </div>
      )}

      {/* Saved CVS Stores */}
      <div className="flex justify-between items-center mb-3.5">
        <SectionTitle>常用超商門市</SectionTitle>
        <span className="text-[11px] text-white/30">結帳時自動儲存</span>
      </div>
      {cvsStores.length === 0 ? (
        <div className="py-8 px-5 text-center rounded-xl border border-dashed border-white/10 mb-8">
          <p className="text-white/30 text-sm">尚無儲存的門市</p>
          <p className="text-white/20 text-xs">結帳時選擇超商門市後，會自動儲存到這裡</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-8">
          {cvsStores.map((store) => {
            const typeColors: Record<string, { bg: string; color: string }> = {
              UNIMARTC2C: { bg: 'rgba(230,0,18,0.1)', color: '#E60012' },
              FAMIC2C: { bg: 'rgba(0,125,0,0.1)', color: '#007D00' },
              HILIFEC2C: { bg: 'rgba(255,165,0,0.1)', color: '#FF8C00' },
            };
            const tc = typeColors[store.cvs_type] || typeColors.UNIMARTC2C;
            return (
              <div key={store.id} className="rounded-xl px-4 py-4" style={{ background: BG_CARD2, border: `1px solid ${store.is_default ? `${GOLD}25` : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: tc.bg, color: tc.color }}>{cvsTypeNames[store.cvs_type]}</span>
                    {store.is_default && <span className="text-[10px] font-medium" style={{ color: GOLD }}>預設</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {!store.is_default && <SmallButton variant="gold" onClick={() => setDefaultCvs(store.id)}>設為預設</SmallButton>}
                    <SmallButton variant="red" onClick={() => deleteCvsStore(store.id)}>刪除</SmallButton>
                  </div>
                </div>
                <div className="text-white/70 text-sm mb-1">{store.store_name}</div>
                <div className="text-white/40 text-xs">門市代號 {store.store_id}{store.address && `　·　${store.address}`}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Email Bind Modal */}
      <Modal isOpen={emailBindModal} onClose={closeEmailBindModal} title="綁定 Email">
        {bindStep === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                value={bindEmail}
                onChange={(e) => setBindEmail(e.target.value)}
                type="email"
                placeholder="請輸入您的 Email"
                className={inputClass}
              />
            </div>
            <button
              onClick={handleSendBindCode}
              disabled={bindLoading}
              className="w-full py-3 rounded-lg border-none text-[15px] font-semibold cursor-pointer"
              style={{ background: GOLD, color: '#0A0A0A', opacity: bindLoading ? 0.6 : 1 }}
            >
              {bindLoading ? '發送中...' : '發送驗證碼'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-white/60 text-sm">驗證碼已發送至 {bindEmail}</p>
            {devCode && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(212,175,55,0.1)', color: GOLD }}>
                開發模式驗證碼: {devCode}
              </div>
            )}
            <div className="flex justify-center gap-2">
              {bindOtp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-14 text-center text-xl font-bold rounded-lg outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `2px solid ${digit ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    color: 'white',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setBindStep(1); setBindOtp(['', '', '', '', '', '']); setDevCode(null); }}
                className="flex-1 py-3 rounded-lg border border-white/10 bg-transparent text-white/60 cursor-pointer"
              >
                返回
              </button>
              <button
                onClick={handleVerifyBind}
                disabled={bindLoading}
                className="flex-1 py-3 rounded-lg border-none font-semibold cursor-pointer"
                style={{ background: GOLD, color: '#0A0A0A', opacity: bindLoading ? 0.6 : 1 }}
              >
                {bindLoading ? '驗證中...' : '確認綁定'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Passkey Manager */}
      <PasskeyManager />

      {/* Delete Account */}
      <div className="mt-10 pt-6 border-t border-white/[0.06]">
        <button className="bg-transparent border-none text-white/25 text-[13px] cursor-pointer hover:text-red-500 transition-colors">刪除帳號</button>
      </div>
    </div>
  );
}

// ─── Main Component ───

const TABS = [
  { key: 'orders', label: '訂單紀錄', icon: '📦' },
  { key: 'tier', label: '會員等級', icon: '👑' },
  { key: 'wallet', label: '購物金', icon: '💰' },
  { key: 'profile', label: '個人資料', icon: '👤' },
];

// Default tier configs (used when API doesn't return any) - 六級制
const DEFAULT_TIER_CONFIGS: TierConfigItem[] = [
  { level: 'silver', name: '白銀會員', minSpent: 0, pointsMultiplier: 1.0, birthdayPoints: 100, monthlyCredits: 0 },
  { level: 'gold', name: '黃金會員', minSpent: 6888, pointsMultiplier: 1.5, birthdayPoints: 200, monthlyCredits: 100 },
  { level: 'platinum', name: '鉑金會員', minSpent: 16888, pointsMultiplier: 2.0, birthdayPoints: 400, monthlyCredits: 150 },
  { level: 'diamond', name: '鑽石會員', minSpent: 38888, pointsMultiplier: 2.5, birthdayPoints: 800, monthlyCredits: 220 },
  { level: 'elite', name: '頂級會員', minSpent: 68888, pointsMultiplier: 3.0, birthdayPoints: 1500, monthlyCredits: 380 },
  { level: 'throne', name: '王座會員', minSpent: 128888, pointsMultiplier: 4.0, birthdayPoints: 2000, monthlyCredits: 450 },
];

export default function AccountClient({ session }: AccountClientProps) {
  const [activeTab, setActiveTab] = useState('orders');
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 購物車
  const { addItem, refreshCart } = useCart();
  const [reordering, setReordering] = useState(false);

  // API Data States
  const [tierData, setTierData] = useState<TierData>(FALLBACK_TIER);
  const [currentTierConfig, setCurrentTierConfig] = useState<TierConfigItem | null>(null);
  const [nextTierConfig, setNextTierConfig] = useState<TierConfigItem | null>(null);
  const [tierProgress, setTierProgress] = useState(0);
  const [amountToNextTier, setAmountToNextTier] = useState(0);
  const [allTierConfigs, setAllTierConfigs] = useState<TierConfigItem[]>(DEFAULT_TIER_CONFIGS);

  const [walletData, setWalletData] = useState<WalletData>(FALLBACK_WALLET);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Profile states
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cvsStores, setCvsStores] = useState<CvsStore[]>([]);
  const [preferredShipping, setPreferredShipping] = useState<'cvs' | 'home' | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Fetch member data on mount
  useEffect(() => {
    setMounted(true);

    // Fetch tier data
    fetch('/api/member/tier')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTierData(data.tier);
          setCurrentTierConfig(data.currentConfig);
          setNextTierConfig(data.nextTier);
          setTierProgress(data.progress?.percentage || 0);
          setAmountToNextTier(data.progress?.amountToNextTier || 0);
          if (data.currentConfig) {
            setAllTierConfigs(DEFAULT_TIER_CONFIGS);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tier data:', err);
      });

    // Fetch wallet data
    fetch('/api/member/wallet')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWalletData(data.wallet);
          setTransactions(data.transactions || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch wallet data:', err);
      });

    // Fetch orders data
    fetch('/api/member/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders || []);
        }
        setOrdersLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch orders:', err);
        setOrdersLoading(false);
      });

    // Fetch addresses
    fetch('/api/member/addresses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAddresses(data.addresses || []);
      })
      .catch((err) => console.error('Failed to fetch addresses:', err));

    // Fetch CVS stores
    fetch('/api/member/cvs-stores')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCvsStores(data.stores || []);
      })
      .catch((err) => console.error('Failed to fetch CVS stores:', err));

    // Fetch preferences
    fetch('/api/member/preferences')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.preferences) {
          setPreferredShipping(data.preferences.preferred_shipping);
        }
      })
      .catch((err) => console.error('Failed to fetch preferences:', err));

    // Fetch profile data
    fetchProfile();
  }, []);

  // Profile fetch function
  const fetchProfile = () => {
    fetch('/api/member/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfileData(data.profile);
        }
      })
      .catch((err) => console.error('Failed to fetch profile:', err));
  };

  // 再買一次 - 加入購物車
  const handleReorder = async (order: Order) => {
    const itemsWithVariant = order.items.filter((item) => item.variant_id);
    if (itemsWithVariant.length === 0) {
      showToast('此訂單商品無法再次購買');
      return;
    }

    setReordering(true);
    try {
      let addedCount = 0;
      for (const item of itemsWithVariant) {
        if (item.variant_id) {
          try {
            await addItem(item.variant_id, item.quantity || 1);
            addedCount++;
          } catch (err) {
            console.error('Failed to add item:', item.title, err);
          }
        }
      }

      if (addedCount > 0) {
        showToast(`已將 ${addedCount} 件商品加入購物車`);
        await refreshCart();
      } else {
        showToast('加入購物車失敗，商品可能已下架');
      }
    } catch (err) {
      console.error('Reorder failed:', err);
      showToast('加入購物車失敗，請稍後再試');
    } finally {
      setReordering(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const tierVisual = TIER_VISUALS[tierData.level] || TIER_VISUALS.normal;
  const displayName = session.display_name;

  return (
    <div className="min-h-screen relative" style={{ background: '#0A0A0A' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        @keyframes floatP {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-18px) translateX(6px); }
          50% { transform: translateY(-6px) translateX(-4px); }
          75% { transform: translateY(-22px) translateX(3px); }
        }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 2px; }
      `}</style>

      <GoldParticles />

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-[10px] text-sm font-medium backdrop-blur-xl"
          style={{
            background: 'rgba(212,175,55,0.9)',
            color: '#000',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {toast}
        </div>
      )}

      {/* Main Content */}
      <div
        className="relative z-10 max-w-[600px] mx-auto px-6 pt-7 pb-10"
        style={{ animation: mounted ? 'fadeInUp 0.5s ease' : 'none' }}
      >
        {/* User Greeting */}
        <div className="flex items-center gap-3.5 mb-6">
          <div
            className="w-13 h-13 rounded-full flex items-center justify-center text-[22px] font-bold"
            style={{
              background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
              color: '#0A0A0A',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              boxShadow: `0 0 0 2px #0A0A0A, 0 0 0 3px ${GOLD}40`,
              width: 52,
              height: 52,
            }}
          >
            {displayName?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="m-0 text-xl text-white/90 font-semibold">{displayName || '會員'}</h1>
            <p className="m-0 mt-0.5 text-white/35 text-[13px]">
              {tierVisual.icon} {tierData.name}　·　購物金{' '}
              <span style={{ color: GOLD }}>NT${walletData.balance.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-xl p-1 mb-6 border border-white/[0.06]"
          style={{ background: BG_CARD }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 px-1 border-none rounded-[10px] cursor-pointer transition-all flex flex-col items-center gap-0.5"
                style={{
                  background: isActive ? `${GOLD}15` : 'transparent',
                  color: isActive ? GOLD : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div key={activeTab} style={{ animation: 'fadeInUp 0.3s ease' }}>
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={ordersLoading}
              showToast={showToast}
              onReorder={handleReorder}
              reordering={reordering}
            />
          )}
          {activeTab === 'tier' && (
            <TierTab
              tier={tierData}
              currentConfig={currentTierConfig}
              nextTier={nextTierConfig}
              progress={tierProgress}
              amountToNextTier={amountToNextTier}
              allConfigs={allTierConfigs}
            />
          )}
          {activeTab === 'wallet' && <WalletTab wallet={walletData} transactions={transactions} />}
          {activeTab === 'profile' && (
            <ProfileTab
              showToast={showToast}
              session={session}
              addresses={addresses}
              setAddresses={setAddresses}
              cvsStores={cvsStores}
              setCvsStores={setCvsStores}
              preferredShipping={preferredShipping}
              setPreferredShipping={setPreferredShipping}
              profileData={profileData}
              onProfileUpdate={fetchProfile}
            />
          )}
        </div>
      </div>
    </div>
  );
}
