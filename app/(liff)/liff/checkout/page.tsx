'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

// ===== 型別定義 =====
interface CartItem {
  id: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  quantity: number;
  unit_price: number;
  thumbnail: string;
}

interface ShippingInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
}

// ===== 主元件 =====
export default function LiffCheckout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [displayName, setDisplayName] = useState('');

  // 購物車
  const [cart, setCart] = useState<any>(null);
  const [localCartId, setLocalCartId] = useState('');

  // 收件資訊
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: '', phone: '', email: '', address: '',
  });

  // 配送方式
  const [shippingMethod, setShippingMethod] = useState('home_delivery');

  // 結帳狀態
  const [submitting, setSubmitting] = useState(false);

  // ===== 初始化 LIFF（優化版：省掉 verify API call） =====
  useEffect(() => {
    initLiff();
  }, []);

  async function initLiff() {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setError('LIFF ID 未設定');
        setLoading(false);
        return;
      }

      await liff.init({ liffId });

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      // 直接從 LIFF SDK 取用戶資料（不需要額外 API call）
      const profile = await liff.getProfile();
      setLineUserId(profile.userId);
      setDisplayName(profile.displayName);

      // 直接載入購物車（省掉 verify API call）
      await loadCart(profile.userId);

    } catch (e) {
      console.error('LIFF init error:', e);
      setError('頁面載入失敗，請重新開啟');
    }
    setLoading(false);
  }

  // ===== 載入購物車 =====
  async function loadCart(userId: string) {
    const res = await fetch(`/api/liff/cart?line_user_id=${userId}`);
    const data = await res.json();

    if (data.error === 'No active cart' || !data.cart?.items?.length) {
      setError('購物車是空的');
      return;
    }

    setCart(data.cart);
    setLocalCartId(data.localCartId);

    // 自動帶入收件資訊
    if (data.shipping) {
      setShipping({
        name: data.shipping.name || '',
        phone: data.shipping.phone || '',
        email: data.shipping.email || '',
        address: data.shipping.address || '',
      });
    }
  }

  // ===== 計算金額 =====
  const subtotal = cart?.item_subtotal || 0;
  const discountTotal = cart?.discount_total || 0;
  const FREE_SHIPPING_THRESHOLD = 800;
  const shippingFee = shippingMethod === 'home_delivery'
    ? (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 100)
    : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 60);
  const total = subtotal - discountTotal + shippingFee;

  // ===== 提交結帳 =====
  async function handleCheckout() {
    // 驗證必填欄位
    if (!shipping.name.trim()) { alert('請填寫收件人姓名'); return; }
    if (!shipping.phone.trim()) { alert('請填寫手機號碼'); return; }
    if (!shipping.address.trim()) { alert('請填寫收件地址'); return; }

    setSubmitting(true);

    try {
      const res = await fetch('/api/liff/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          medusaCartId: cart.id,
          shipping,
          shippingMethod,
          localCartId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkout_url) {
        alert('結帳失敗：' + (data.error || '請稍後再試'));
        setSubmitting(false);
        return;
      }

      // 跳轉到 ECPay 付款頁
      window.location.href = data.checkout_url;

    } catch (e) {
      alert('結帳失敗，請稍後再試');
      setSubmitting(false);
    }
  }

  // ===== Loading 骨架屏 =====
  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[rgba(212,175,55,0.2)] px-4 py-3">
          <h1 className="text-lg font-medium tracking-wider text-[#D4AF37]">MINJIE STUDIO</h1>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="h-6 w-32 bg-[#111111] rounded animate-pulse" />
          <div className="h-24 bg-[#111111] rounded-xl animate-pulse" />
          <div className="h-24 bg-[#111111] rounded-xl animate-pulse" />
          <div className="h-2 bg-[#111111]" />
          <div className="h-6 w-24 bg-[#111111] rounded animate-pulse" />
          <div className="h-12 bg-[#111111] rounded-xl animate-pulse" />
          <div className="h-12 bg-[#111111] rounded-xl animate-pulse" />
          <div className="h-12 bg-[#111111] rounded-xl animate-pulse" />
          <div className="h-12 bg-[#111111] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ===== Error 畫面 =====
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={() => {
              try { liff.closeWindow(); } catch { window.close(); }
            }}
            className="px-6 py-3 bg-[#D4AF37] text-black rounded-full font-medium"
          >
            返回聊天
          </button>
        </div>
      </div>
    );
  }

  // ===== 主頁面 =====
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[rgba(212,175,55,0.2)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium tracking-wider text-[#D4AF37]">MINJIE STUDIO</h1>
          <button
            onClick={() => {
              try { liff.closeWindow(); } catch { window.close(); }
            }}
            className="text-sm text-gray-400"
          >
            ✕ 關閉
          </button>
        </div>
      </div>

      {/* 購物車明細 */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          🛒 購物車（{cart?.items?.reduce((s: number, i: CartItem) => s + i.quantity, 0) || 0} 件）
        </h2>
        <div className="space-y-3">
          {cart?.items?.map((item: CartItem) => (
            <div key={item.id} className="flex gap-3 bg-[#111111] rounded-xl p-3">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.product_title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_title}</p>
                {item.variant_title && (
                  <p className="text-xs text-gray-400">{item.variant_title}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[#D4AF37] font-medium">
                    NT${item.unit_price}
                  </p>
                  <p className="text-sm text-gray-300">x{item.quantity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 折扣顯示 */}
        {discountTotal > 0 && (
          <div className="mt-3 px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[rgba(255,68,68,0.3)]">
            <p className="text-sm text-red-400">🎉 已折扣 -NT${discountTotal}</p>
          </div>
        )}
      </section>

      <div className="h-2 bg-[#111111]" />

      {/* 收件資訊 */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">📋 收件資訊</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">收件人姓名 *</label>
            <input
              type="text"
              value={shipping.name}
              onChange={e => setShipping(prev => ({ ...prev, name: e.target.value }))}
              placeholder="請輸入姓名"
              className="w-full px-4 py-3 bg-[#111111] border border-[rgba(212,175,55,0.2)] rounded-xl text-white placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">手機號碼 *</label>
            <input
              type="tel"
              value={shipping.phone}
              onChange={e => setShipping(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="09xxxxxxxx"
              className="w-full px-4 py-3 bg-[#111111] border border-[rgba(212,175,55,0.2)] rounded-xl text-white placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email（選填）</label>
            <input
              type="email"
              value={shipping.email}
              onChange={e => setShipping(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-[#111111] border border-[rgba(212,175,55,0.2)] rounded-xl text-white placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">收件地址 *</label>
            <input
              type="text"
              value={shipping.address}
              onChange={e => setShipping(prev => ({ ...prev, address: e.target.value }))}
              placeholder="縣市 + 區 + 路名 + 號碼"
              className="w-full px-4 py-3 bg-[#111111] border border-[rgba(212,175,55,0.2)] rounded-xl text-white placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>
      </section>

      <div className="h-2 bg-[#111111]" />

      {/* 配送方式 */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">🚚 配送方式</h2>
        <div className="space-y-2">
          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${
            shippingMethod === 'home_delivery'
              ? 'bg-[#1a1a1a] border-[#D4AF37]'
              : 'bg-[#111111] border-[rgba(212,175,55,0.2)]'
          }`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shipping"
                value="home_delivery"
                checked={shippingMethod === 'home_delivery'}
                onChange={e => setShippingMethod(e.target.value)}
                className="accent-[#D4AF37]"
              />
              <span>宅配到府</span>
            </div>
            <span className="text-[#D4AF37]">
              {subtotal >= FREE_SHIPPING_THRESHOLD ? '免運' : 'NT$100'}
            </span>
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer opacity-50 ${
            shippingMethod === 'cvs_pickup'
              ? 'bg-[#1a1a1a] border-[#D4AF37]'
              : 'bg-[#111111] border-[rgba(212,175,55,0.2)]'
          }`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shipping"
                value="cvs_pickup"
                disabled
                className="accent-[#D4AF37]"
              />
              <span>超商取貨（即將上線）</span>
            </div>
            <span className="text-gray-500">NT$60</span>
          </label>
        </div>
      </section>

      <div className="h-2 bg-[#111111]" />

      {/* 訂單摘要 */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">💰 訂單摘要</h2>
        <div className="bg-[#111111] rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">商品小計</span>
            <span>NT${subtotal}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-400">折扣</span>
              <span className="text-red-400">-NT${discountTotal}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">運費</span>
            <span>{shippingFee === 0 ? '免運' : `NT$${shippingFee}`}</span>
          </div>
          <div className="border-t border-gray-700 my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>應付金額</span>
            <span className="text-[#D4AF37]">NT${total}</span>
          </div>
        </div>
      </section>

      {/* 固定底部：確認付款按鈕 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[rgba(212,175,55,0.2)] px-4 py-4">
        <button
          onClick={handleCheckout}
          disabled={submitting}
          className={`w-full py-4 rounded-full text-lg font-medium tracking-wider transition-all ${
            submitting
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-black active:scale-[0.98]'
          }`}
        >
          {submitting ? '處理中...' : `💳 確認付款 NT$${total}`}
        </button>
      </div>
    </div>
  );
}
