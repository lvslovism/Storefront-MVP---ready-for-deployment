'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/auth';
import { useCart } from '@/components/CartProvider';

// ─── Constants ───
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F5E6A3';
const GOLD_DARK = '#B8962E';
const BG_CARD = '#111111';
const BG_CARD2 = '#161616';

// ─── Types ───
interface OrderItem {
  id: string;
  title: string;
  subtitle: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  thumbnail: string | null;
  variant_id: string | null;
  product_id: string | null;
  product_handle: string | null;
}

interface CvsInfo {
  type: string;
  storeName: string;
  storeId: string;
  address: string;
}

interface ShippingAddress {
  name: string | null;
  phone: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  address_1: string | null;
  address_2: string | null;
  full_address: string | null;
}

interface OrderDetail {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  created_at_full: string;
  email: string | null;
  currency_code: string;
  items: OrderItem[];
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  total: number;
  shipping: {
    method: string;
    method_type: 'cvs' | 'home';
    cvs_info: CvsInfo | null;
    tracking_number: string | null;
    address: ShippingAddress | null;
  };
  payment: {
    method: string;
    status: string;
  };
}

interface OrderDetailClientProps {
  orderId: string;
  session: Session;
}

// ─── Animated gold particles ───
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

// ─── Section Title ───
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

// ─── Main Component ───
export default function OrderDetailClient({ orderId, session }: OrderDetailClientProps) {
  const router = useRouter();
  const { addItem, refreshCart } = useCart();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/orders/${orderId}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '無法載入訂單');
        return;
      }
      setOrder(data.order);
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('無法載入訂單，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 再買一次
  const handleReorder = async () => {
    if (!order) return;
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

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '處理中', color: '#F59E0B' },
    shipped: { label: '已出貨', color: '#3B82F6' },
    delivered: { label: '已完成', color: '#10B981' },
    cancelled: { label: '已取消', color: '#EF4444' },
  };

  const paymentMethodMap: Record<string, string> = {
    credit_card: '信用卡',
    cod: '貨到付款',
    installment: '零卡分期',
    pending: '待付款',
  };

  const paymentStatusMap: Record<string, { label: string; color: string }> = {
    paid: { label: '已付款', color: '#10B981' },
    pending: { label: '待付款', color: '#F59E0B' },
    refunded: { label: '已退款', color: '#EF4444' },
  };

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
        {/* Back Button */}
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-white/40 text-sm mb-6 hover:text-white/60 transition-colors no-underline"
        >
          ← 返回訂單列表
        </Link>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 opacity-50 animate-pulse">📦</div>
            <p className="text-white/40 text-[15px]">載入訂單中...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 opacity-50">⚠️</div>
            <p className="text-white/60 text-[15px] mb-4">{error}</p>
            <button
              onClick={() => router.push('/account')}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-[#0A0A0A] border-none cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})` }}
            >
              返回訂單列表
            </button>
          </div>
        )}

        {/* Order Content */}
        {order && !loading && !error && (
          <>
            {/* Order Header */}
            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h1
                    className="text-xl font-bold text-white/90 m-0 mb-1"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    訂單 #{order.display_id}
                  </h1>
                  <p className="text-white/35 text-xs m-0">{order.created_at}</p>
                </div>
                <span
                  className="text-[12px] px-3 py-1 rounded-full font-medium"
                  style={{
                    background: `${statusMap[order.status]?.color || '#F59E0B'}18`,
                    color: statusMap[order.status]?.color || '#F59E0B',
                  }}
                >
                  {statusMap[order.status]?.label || '處理中'}
                </span>
              </div>
            </div>

            {/* Items */}
            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: BG_CARD2, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <SectionTitle>商品明細</SectionTitle>
              <div className="flex flex-col gap-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    {/* Thumbnail */}
                    <div
                      className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
                          📦
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {item.product_handle ? (
                        <Link
                          href={`/products/${item.product_handle}`}
                          className="text-white/80 text-sm font-medium no-underline hover:text-white/100 transition-colors block truncate"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="text-white/80 text-sm font-medium block truncate">
                          {item.title}
                        </span>
                      )}
                      {item.subtitle && (
                        <span className="text-white/40 text-xs block">{item.subtitle}</span>
                      )}
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-white/35 text-xs">
                          NT${item.unit_price.toLocaleString()} × {item.quantity}
                        </span>
                        <span className="text-white/70 text-sm font-medium">
                          NT${item.subtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount Summary */}
            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: BG_CARD2, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <SectionTitle>金額明細</SectionTitle>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">商品小計</span>
                  <span className="text-white/70 text-sm">NT${order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">運費</span>
                  <span className="text-white/70 text-sm">
                    {order.shipping_total > 0 ? `NT$${order.shipping_total.toLocaleString()}` : '免運'}
                  </span>
                </div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">折扣</span>
                    <span className="text-emerald-500 text-sm">-NT${order.discount_total.toLocaleString()}</span>
                  </div>
                )}
                <div
                  className="flex justify-between pt-3 mt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="text-white/70 text-sm font-medium">訂單總計</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: GOLD, fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    NT${order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: BG_CARD2, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <SectionTitle>配送資訊</SectionTitle>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">
                  {order.shipping.method_type === 'cvs' ? '🏪' : '🚚'}
                </span>
                <div>
                  <span className="text-white/80 text-sm font-medium block">
                    {order.shipping.method}
                  </span>
                  {order.shipping.tracking_number && (
                    <span className="text-white/40 text-xs block mt-1">
                      追蹤號碼：{order.shipping.tracking_number}
                    </span>
                  )}
                </div>
              </div>

              {/* CVS Info */}
              {order.shipping.method_type === 'cvs' && order.shipping.cvs_info && (
                <div
                  className="rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background:
                          order.shipping.cvs_info.type === '7-ELEVEN'
                            ? 'rgba(230,0,18,0.1)'
                            : order.shipping.cvs_info.type === '全家'
                            ? 'rgba(0,125,0,0.1)'
                            : 'rgba(255,165,0,0.1)',
                        color:
                          order.shipping.cvs_info.type === '7-ELEVEN'
                            ? '#E60012'
                            : order.shipping.cvs_info.type === '全家'
                            ? '#007D00'
                            : '#FF8C00',
                      }}
                    >
                      {order.shipping.cvs_info.type}
                    </span>
                    <span className="text-white/70 text-sm">{order.shipping.cvs_info.storeName}</span>
                  </div>
                  {order.shipping.cvs_info.storeId && (
                    <p className="text-white/40 text-xs m-0">門市代號：{order.shipping.cvs_info.storeId}</p>
                  )}
                  {order.shipping.cvs_info.address && (
                    <p className="text-white/40 text-xs m-0 mt-1">{order.shipping.cvs_info.address}</p>
                  )}
                </div>
              )}

              {/* Home Delivery Address */}
              {order.shipping.method_type === 'home' && order.shipping.address && (
                <div
                  className="rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {order.shipping.address.name && (
                    <p className="text-white/70 text-sm m-0 mb-1">
                      {order.shipping.address.name}
                      {order.shipping.address.phone && (
                        <span className="text-white/40 ml-3">{order.shipping.address.phone}</span>
                      )}
                    </p>
                  )}
                  {order.shipping.address.full_address && (
                    <p className="text-white/40 text-xs m-0">{order.shipping.address.full_address}</p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: BG_CARD2, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <SectionTitle>付款資訊</SectionTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {order.payment.method === 'credit_card' ? '💳' : order.payment.method === 'installment' ? '📊' : '💵'}
                  </span>
                  <span className="text-white/70 text-sm">
                    {paymentMethodMap[order.payment.method] || order.payment.method}
                  </span>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: `${paymentStatusMap[order.payment.status]?.color || '#F59E0B'}18`,
                    color: paymentStatusMap[order.payment.status]?.color || '#F59E0B',
                  }}
                >
                  {paymentStatusMap[order.payment.status]?.label || '待付款'}
                </span>
              </div>
            </div>

            {/* Reorder Button */}
            <button
              onClick={handleReorder}
              disabled={reordering}
              className="w-full py-4 border-none rounded-[10px] text-[15px] font-bold cursor-pointer tracking-wide transition-all hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                color: '#0A0A0A',
                opacity: reordering ? 0.6 : 1,
              }}
            >
              {reordering ? '加入中...' : '🔄 再買一次'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
