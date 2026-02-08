'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatPrice } from '@/lib/config';

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  thumbnail?: string;
}

interface ShippingAddress {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  postal_code?: string;
}

interface Order {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  shipping_address?: ShippingAddress;
  shipping_methods?: Array<{
    name?: string;
    amount?: number;
  }>;
  summary?: {
    current_order_total?: number;
    raw_current_order_total?: { value: number | string };
    subtotal?: number;
    shipping_total?: number;
  };
  metadata?: {
    cvs_store_name?: string;
    cvs_address?: string;
    shipping_method?: string;
    credits_used?: number;
  };
}

function getOrderTotal(order: Order): number {
  // deno-lint-ignore no-explicit-any
  const o = order as any;
  let rawTotal: number | string = o.summary?.current_order_total
    ?? o.summary?.raw_current_order_total?.value
    ?? o.total
    ?? 0;

  if (typeof rawTotal === 'string') {
    rawTotal = parseFloat(rawTotal) || 0;
  }

  // Medusa v2: amounts might be in cents
  if (typeof rawTotal === 'number' && rawTotal > 100000) {
    return rawTotal / 100;
  }
  return rawTotal;
}

function getShippingFee(order: Order): number {
  // deno-lint-ignore no-explicit-any
  const o = order as any;
  let shipping = o.summary?.shipping_total ?? o.shipping_methods?.[0]?.amount ?? 0;
  if (shipping > 10000) shipping = shipping / 100;
  return shipping;
}

function getSubtotal(order: Order): number {
  // deno-lint-ignore no-explicit-any
  const o = order as any;
  let subtotal = o.summary?.subtotal ?? 0;
  if (subtotal > 100000) subtotal = subtotal / 100;
  return subtotal;
}

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // URL params
  const cartId = searchParams.get('cart_id');
  const tradeNo = searchParams.get('MerchantTradeNo') || searchParams.get('trade_no');
  const rtnCode = searchParams.get('RtnCode');
  const rtnMsg = searchParams.get('RtnMsg');
  const tradeAmt = searchParams.get('TradeAmt');
  const paymentType = searchParams.get('PaymentType');

  useEffect(() => {
    // Check payment result
    if (rtnCode === '1') {
      setStatus('success');
      // Clear cart from localStorage
      localStorage.removeItem('medusa_cart_id');

      // Fetch order details if we have cart_id
      if (cartId) {
        fetchOrderDetails(cartId);
      }
    } else if (rtnCode) {
      setStatus('failed');
    } else {
      // No RtnCode - might be direct access, assume success
      setStatus('success');
      if (cartId) {
        fetchOrderDetails(cartId);
      }
    }
  }, [rtnCode, cartId]);

  async function fetchOrderDetails(cartId: string) {
    try {
      const res = await fetch(`/api/order/${encodeURIComponent(cartId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      } else {
        const error = await res.json();
        setOrderError(error.error || 'Failed to load order');
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setOrderError('Failed to load order details');
    }
  }

  // Format payment type
  function formatPaymentType(type: string | null): string {
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

  // Format shipping method
  function formatShippingMethod(order: Order): string {
    const method = order.metadata?.shipping_method;
    if (method === 'cvs') return '超商取貨';
    if (method === 'home') return '宅配到府';
    if (order.shipping_methods?.[0]?.name) return order.shipping_methods[0].name;
    return '標準配送';
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-500">處理中...</p>
      </div>
    );
  }

  // Failed state
  if (status === 'failed') {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-red-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">付款失敗</h1>
        <p className="text-gray-600 mb-2">
          {rtnMsg || '付款過程中發生錯誤，請稍後再試'}
        </p>
        {tradeNo && (
          <p className="text-sm text-gray-500 mb-8">交易編號：{tradeNo}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/checkout" className="btn-primary">重新結帳</Link>
          <Link href="/" className="btn-outline">返回商店</Link>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-green-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">感謝您的訂購！</h1>
        <p className="text-gray-600">訂單已成功建立，我們會盡快為您處理。</p>
      </div>

      {/* Order Number */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
        <p className="text-sm text-gray-500 mb-1">訂單編號</p>
        {order ? (
          <p className="text-3xl font-bold" style={{ color: '#D4AF37' }}>#{order.display_id}</p>
        ) : tradeNo ? (
          <p className="text-lg font-mono font-bold">{tradeNo}</p>
        ) : (
          <p className="text-gray-400">載入中...</p>
        )}
      </div>

      {/* Order Details */}
      {order && (
        <>
          {/* Items */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="font-bold mb-4">商品明細</h2>
            <ul className="divide-y">
              {order.items?.map((item) => (
                <li key={item.id} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">{item.title}</span>
                    <span className="text-sm text-gray-400">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">小計</span>
                <span>{formatPrice(getSubtotal(order))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">運費</span>
                <span>{getShippingFee(order) === 0 ? '免運' : formatPrice(getShippingFee(order))}</span>
              </div>
              {order.metadata?.credits_used && order.metadata.credits_used > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#D4AF37' }}>購物金折抵</span>
                  <span style={{ color: '#D4AF37' }}>-{formatPrice(order.metadata.credits_used)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>總計</span>
                <span style={{ color: '#D4AF37' }}>{formatPrice(getOrderTotal(order))}</span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="font-bold mb-4">配送資訊</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">配送方式</span>
                <span>{formatShippingMethod(order)}</span>
              </div>
              {order.metadata?.cvs_store_name && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">取貨門市</span>
                    <span>{order.metadata.cvs_store_name}</span>
                  </div>
                  {order.metadata.cvs_address && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">門市地址</span>
                      <span className="text-right max-w-[200px]">{order.metadata.cvs_address}</span>
                    </div>
                  )}
                </>
              )}
              {order.shipping_address && !order.metadata?.cvs_store_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">收件地址</span>
                  <span className="text-right max-w-[200px]">
                    {order.shipping_address.postal_code} {order.shipping_address.city} {order.shipping_address.address_1}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">收件人</span>
                <span>
                  {order.shipping_address?.last_name}{order.shipping_address?.first_name}
                </span>
              </div>
              {order.shipping_address?.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">聯絡電話</span>
                  <span>{order.shipping_address.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="font-bold mb-4">付款資訊</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">付款方式</span>
                <span>{formatPaymentType(paymentType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">付款金額</span>
                <span className="font-bold" style={{ color: '#D4AF37' }}>
                  {tradeAmt ? formatPrice(parseInt(tradeAmt)) : formatPrice(getOrderTotal(order))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">付款狀態</span>
                <span className="text-green-600 font-medium">已付款</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fallback: Simple display when no order details */}
      {!order && !orderError && cartId && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">正在載入訂單詳情...</p>
        </div>
      )}

      {/* Simple fallback for old redirects without cart_id */}
      {!order && !cartId && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-bold mb-3">接下來會發生什麼？</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span>1.</span>
              <span>我們會在 1-2 個工作天內處理您的訂單</span>
            </li>
            <li className="flex items-start gap-2">
              <span>2.</span>
              <span>出貨後會透過簡訊/Email 通知您</span>
            </li>
            <li className="flex items-start gap-2">
              <span>3.</span>
              <span>超商取貨預計 2-3 天到貨，宅配預計 1-2 天</span>
            </li>
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {order && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-2">接下來...</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. 我們會在 1-2 個工作天內處理您的訂單</li>
            <li>2. 出貨後會透過 LINE 或簡訊通知您</li>
            <li>3. {order.metadata?.shipping_method === 'cvs' ? '超商取貨預計 2-3 天到貨' : '宅配預計 1-2 天送達'}</li>
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/products" className="btn-primary text-center py-3 px-8">
          繼續購物
        </Link>
        <Link
          href="https://lin.ee/Ro3Fd4p"
          target="_blank"
          className="btn-outline text-center py-3 px-8"
        >
          加入 LINE 查訂單
        </Link>
      </div>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300 mx-auto"></div>
      <p className="mt-4 text-gray-500">載入中...</p>
    </div>
  );
}

// Main component with Suspense
export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutCompleteContent />
    </Suspense>
  );
}
