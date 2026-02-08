'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// === 工具函數 ===

function formatPrice(amount: number): string {
  if (!amount || isNaN(amount)) return 'NT$ 0';
  return `NT$ ${Math.round(amount).toLocaleString()}`;
}

interface Order {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  items: any[];
  total: number;
  subtotal: number;
  discount_total: number;
  discount_subtotal: number;
  item_total: number;
  item_subtotal: number;
  shipping_total: number;
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    postal_code?: string;
  };
  shipping_methods?: Array<{
    name?: string;
    amount?: number;
    shipping_option_id?: string;
  }>;
  summary?: {
    current_order_total?: number;
    paid_total?: number;
  };
  metadata?: {
    cvs_store_name?: string;
    cvs_address?: string;
    shipping_method?: string;
    credits_used?: number;
  };
}

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  const cartId = searchParams.get('cart_id');
  const tradeNo = searchParams.get('MerchantTradeNo') || searchParams.get('trade_no');
  const rtnCode = searchParams.get('RtnCode');
  const rtnMsg = searchParams.get('RtnMsg');
  const tradeAmt = searchParams.get('TradeAmt');
  const paymentType = searchParams.get('PaymentType');
  const paymentMethodParam = searchParams.get('payment_method');

  useEffect(() => {
    if (rtnCode === '1') {
      setStatus('success');
      localStorage.removeItem('medusa_cart_id');
      if (cartId) startOrderFlow(cartId);
    } else if (rtnCode) {
      setStatus('failed');
    } else {
      // COD 或其他無 rtnCode 的情況
      setStatus('success');
      if (cartId) startOrderFlow(cartId);
    }

    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [rtnCode, cartId]);

  /**
   * 主流程：先嘗試備用 complete cart，再查 order，查不到就 polling
   */
  async function startOrderFlow(cartId: string) {
    // 步驟 1：備用 complete cart（冪等，已 complete 不會重複）
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      try {
        await fetch('/api/cart/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart_id: cartId }),
        });
      } catch (err) {
        // 不阻塞，Gateway webhook 可能已經處理了
        console.log('[Complete] Backup complete attempt done');
      }
    }

    // 步驟 2：查 order
    await fetchOrderWithRetry(cartId, 0);
  }

  /**
   * 查 order，找不到就每 2 秒重試，最多 5 次
   */
  async function fetchOrderWithRetry(cartId: string, attempt: number) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 2000;

    try {
      const res = await fetch(`/api/order/${encodeURIComponent(cartId)}`);

      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          console.log('[Order] Loaded on attempt', attempt + 1, ':', data.matched_by);
          setOrder(data.order);
          setRetryCount(0);
          return;
        }
      }

      // 404 或無 order — 可能 Gateway webhook 還沒處理完
      if (attempt < MAX_RETRIES) {
        console.log(`[Order] Not found, retry ${attempt + 1}/${MAX_RETRIES} in ${RETRY_DELAY}ms...`);
        setRetryCount(attempt + 1);
        pollingRef.current = setTimeout(() => {
          fetchOrderWithRetry(cartId, attempt + 1);
        }, RETRY_DELAY);
      } else {
        console.warn('[Order] Max retries reached');
        setOrderError('訂單資料載入中，請稍後重新整理頁面');
      }
    } catch (err) {
      console.error('[Order] Fetch error:', err);
      if (attempt < MAX_RETRIES) {
        pollingRef.current = setTimeout(() => {
          fetchOrderWithRetry(cartId, attempt + 1);
        }, RETRY_DELAY);
      } else {
        setOrderError('無法載入訂單詳情');
      }
    }
  }

  // === 顯示輔助函數 ===

  function formatPaymentType(type: string | null): string {
    if (paymentMethodParam === 'cod') return '貨到付款';
    if (!type) return '線上付款';
    const types: Record<string, string> = {
      'Credit_CreditCard': '信用卡',
      'ATM_BOT': 'ATM 轉帳',
      'ATM_CHINATRUST': 'ATM 轉帳',
      'CVS_CVS': '超商代碼',
      'BARCODE_BARCODE': '超商條碼',
    };
    return types[type] || type;
  }

  function formatShippingMethod(order: Order): string {
    const name = order.shipping_methods?.[0]?.name || '';
    if (name.includes('宅') || name.includes('home') || name.includes('Home')) return '宅配到府';
    if (name.includes('超') || name.includes('CVS') || name.includes('cvs')) return '超商取貨';

    const optionId = order.shipping_methods?.[0]?.shipping_option_id;
    if (optionId === 'so_01KGYTF42QQBBP9PNBPBZAZF73') return '宅配到府';
    if (optionId === 'so_01KGT10N7MH9ACTVKJE5G223G8') return '超商取貨';

    const method = order.metadata?.shipping_method;
    if (method === 'home') return '宅配到府';
    if (method === 'cvs') return '超商取貨';

    return '標準配送';
  }

  // === 渲染 ===

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          <p className="mt-4 text-gray-500">處理中...</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-white py-16">
        <div className="container mx-auto px-4 text-center max-w-lg">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">付款未成功</h1>
          <p className="text-gray-600 mb-2">
            {rtnMsg || '付款過程中發生問題，請重新嘗試'}
          </p>
          {tradeNo && (
            <p className="text-sm text-gray-500 mb-8">交易編號：{tradeNo}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/checkout" className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
              重新結帳
            </Link>
            <Link href="/" className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
              返回首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // === Success 頁面 ===
  // 使用 order 頂層的正確金額欄位（來自單筆 endpoint）
  const subtotal = order?.item_subtotal ?? order?.subtotal ?? 0;
  const discountTotal = order?.discount_total ?? 0;
  const shippingFee = order?.shipping_total ?? 0;
  const creditsUsed = order?.metadata?.credits_used ?? 0;
  const total = order?.total ?? (tradeAmt ? parseInt(tradeAmt) : 0);

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#059669" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">感謝您的訂購！</h1>
          <p className="text-gray-600">我們已收到您的訂單，將盡快為您處理</p>
        </div>

        {/* Order Number */}
        <div className="rounded-lg p-6 mb-6 text-center" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <p className="text-sm text-gray-500 mb-1">訂單編號</p>
          {order ? (
            <p className="text-3xl font-bold" style={{ color: '#D4AF37' }}>#{order.display_id}</p>
          ) : tradeNo ? (
            <p className="text-lg font-mono font-bold text-gray-900">{tradeNo}</p>
          ) : (
            <p className="text-gray-400">載入中...</p>
          )}
        </div>

        {/* Order Details */}
        {order && (
          <>
            {/* Items - 直接使用 Medusa 回傳的 quantity 和 total */}
            <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <h2 className="font-bold text-gray-900 mb-4">商品明細</h2>
              <ul className="divide-y divide-gray-200">
                {order.items?.map((item: any, idx: number) => (
                  <li key={item.id || idx} className="py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-gray-700 truncate">{item.title || item.product_title || '商品'}</span>
                      <span className="text-sm text-gray-500 flex-shrink-0">x{item.quantity ?? 1}</span>
                    </div>
                    <span className="font-medium text-gray-900 flex-shrink-0 ml-4">
                      {formatPrice(item.subtotal ?? item.unit_price ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Totals */}
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">小計</span>
                  <span className="text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#DC2626' }}>折扣</span>
                    <span style={{ color: '#DC2626' }}>-{formatPrice(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">運費</span>
                  <span className="text-gray-900">{shippingFee === 0 ? '免運' : formatPrice(shippingFee)}</span>
                </div>
                {creditsUsed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#D4AF37' }}>購物金折抵</span>
                    <span style={{ color: '#D4AF37' }}>-{formatPrice(creditsUsed)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span className="text-gray-900">合計</span>
                  <span style={{ color: '#D4AF37' }}>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <h2 className="font-bold text-gray-900 mb-4">配送資訊</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">配送方式</span>
                  <span className="text-gray-900">{formatShippingMethod(order)}</span>
                </div>
                {order.metadata?.cvs_store_name && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">取貨門市</span>
                      <span className="text-gray-900">{order.metadata.cvs_store_name}</span>
                    </div>
                    {order.metadata.cvs_address && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">門市地址</span>
                        <span className="text-gray-900 text-right max-w-[200px]">{order.metadata.cvs_address}</span>
                      </div>
                    )}
                  </>
                )}
                {order.shipping_address && !order.metadata?.cvs_store_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">配送地址</span>
                    <span className="text-gray-900 text-right max-w-[200px]">
                      {order.shipping_address.postal_code} {order.shipping_address.city} {order.shipping_address.address_1}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">收件人</span>
                  <span className="text-gray-900">
                    {order.shipping_address?.last_name?.trim()}{order.shipping_address?.first_name}
                  </span>
                </div>
                {order.shipping_address?.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">聯絡電話</span>
                    <span className="text-gray-900">{order.shipping_address.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <h2 className="font-bold text-gray-900 mb-4">付款資訊</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">付款方式</span>
                  <span className="text-gray-900">{formatPaymentType(paymentType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">付款金額</span>
                  <span className="font-bold" style={{ color: '#DC2626' }}>
                    {formatPrice(total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">付款狀態</span>
                  {paymentMethodParam === 'cod' ? (
                    <span className="font-medium" style={{ color: '#D97706' }}>待付款 - 貨到付款</span>
                  ) : (
                    <span className="font-medium" style={{ color: '#059669' }}>已付款</span>
                  )}
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <h3 className="font-bold text-amber-800 mb-2">接下來...</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>1. 我們將於 1-2 個工作天內為您出貨</li>
                <li>2. 出貨後將透過 LINE 通知您出貨資訊</li>
                <li>3. {formatShippingMethod(order).includes('超商') ? '超商取貨約 2-3 個工作天' : '宅配約 1-2 天送達'}</li>
              </ul>
            </div>
          </>
        )}

        {/* Loading order with retry indicator */}
        {!order && !orderError && cartId && (
          <div className="rounded-lg p-6 mb-6 text-center" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {retryCount > 0 ? `正在載入訂單詳情（第 ${retryCount} 次嘗試）...` : '正在載入訂單詳情...'}
            </p>
          </div>
        )}

        {/* Error state */}
        {orderError && (
          <div className="rounded-lg p-6 mb-6 text-center" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-sm text-red-600 mb-2">{orderError}</p>
            <button
              onClick={() => {
                setOrderError(null);
                if (cartId) fetchOrderWithRetry(cartId, 0);
              }}
              className="text-sm text-red-700 underline hover:no-underline"
            >
              重新載入
            </button>
          </div>
        )}

        {/* Fallback for old redirects without cart_id */}
        {!order && !cartId && (
          <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <h3 className="font-bold text-amber-800 mb-3">接下來您將會收到通知</h3>
            <ul className="text-sm text-amber-700 space-y-2">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>我們將於 1-2 個工作天內為您出貨</span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>出貨後將透過簡訊/Email 通知</span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>超商取貨約 2-3 個工作天，宅配約 1-2 天</span>
              </li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="inline-block text-center py-3 px-8 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#D4AF37' }}
          >
            繼續購物
          </Link>
          <Link
            href="https://lin.ee/Ro3Fd4p"
            target="_blank"
            className="inline-block text-center py-3 px-8 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#06C755' }}
          >
            加 LINE 追蹤訂單
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300 mx-auto"></div>
        <p className="mt-4 text-gray-500">載入中...</p>
      </div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutCompleteContent />
    </Suspense>
  );
}
