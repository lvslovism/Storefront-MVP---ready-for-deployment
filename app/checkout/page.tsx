'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { formatPrice, config, shipping, isFreeShipping, getShippingFee } from '@/lib/config';
import { createCheckout, getCvsMap, getCvsSelection, CVS_NAMES, CvsSelection } from '@/lib/gateway';
import { initPaymentForCart } from '@/lib/medusa';
import CreditsSelector from '@/components/checkout/CreditsSelector';

type ShippingMethod = 'cvs' | 'home';
type CvsType = 'UNIMARTC2C' | 'FAMIC2C' | 'HILIFEC2C';

interface FormData {
  name: string;
  phone: string;
  email: string;
  // 宅配
  address: string;
  city: string;
  zipCode: string;
  // 超取
  cvsType: CvsType;
}

// SessionStorage keys
const STORAGE_KEYS = {
  TEMP_TRADE_NO: 'cvs_temp_trade_no',
  FORM_DATA: 'checkout_form_data',
  SHIPPING_METHOD: 'checkout_shipping_method',
};

// 偵測是否為手機裝置
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 檢查螢幕寬度
  if (window.innerWidth < 768) return true;

  // 檢查 userAgent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'webos', 'blackberry', 'opera mini', 'iemobile'];
  return mobileKeywords.some(keyword => userAgent.includes(keyword));
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: cartLoading } = useCart();

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('cvs');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    cvsType: 'UNIMARTC2C',
  });
  const [cvsSelection, setCvsSelection] = useState<CvsSelection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectingStore, setIsSelectingStore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsToUse, setCreditsToUse] = useState(0);
  const [isLineLoggedIn, setIsLineLoggedIn] = useState(false);

  // 用於清理 interval
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 計算金額
  const subtotal = cart?.subtotal || 0;
  const shippingFee = getShippingFee(shippingMethod, subtotal);
  const total = subtotal - creditsToUse + shippingFee;

  // Polling 取得門市選擇結果
  const pollCvsSelection = useCallback(async (tempTradeNo: string, maxAttempts = 30) => {
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsSelectingStore(false);
        sessionStorage.removeItem(STORAGE_KEYS.TEMP_TRADE_NO);
        return;
      }

      attempts++;

      try {
        const selection = await getCvsSelection(tempTradeNo);
        console.log('Polling result:', selection);

        if (selection.success && selection.selection?.store_id) {
          // 選完了！
          setCvsSelection(selection.selection);
          setIsSelectingStore(false);
          sessionStorage.removeItem(STORAGE_KEYS.TEMP_TRADE_NO);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          return;
        }
      } catch (e) {
        // 還沒選完，繼續等
      }
    };

    // 立即執行一次
    await poll();

    // 如果還沒選完，設定 interval
    if (!cvsSelection) {
      pollingRef.current = setInterval(poll, 2000);
    }
  }, [cvsSelection]);

  // 頁面載入時：檢查是否從手機版地圖選擇返回
  useEffect(() => {
    // 還原表單資料
    const savedFormData = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA);
    const savedShippingMethod = sessionStorage.getItem(STORAGE_KEYS.SHIPPING_METHOD);

    if (savedFormData) {
      try {
        setFormData(JSON.parse(savedFormData));
      } catch (e) {
        console.error('Failed to parse saved form data');
      }
    }

    if (savedShippingMethod) {
      setShippingMethod(savedShippingMethod as ShippingMethod);
    }

    // 檢查是否有待處理的門市選擇
    const tempTradeNo = sessionStorage.getItem(STORAGE_KEYS.TEMP_TRADE_NO);
    if (tempTradeNo) {
      setIsSelectingStore(true);
      pollCvsSelection(tempTradeNo);
    }

    // 清理表單暫存（但保留 tempTradeNo 直到選完）
    sessionStorage.removeItem(STORAGE_KEYS.FORM_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.SHIPPING_METHOD);
  }, [pollCvsSelection]);

  // 清理 polling
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 檢查 LINE 登入狀態
  useEffect(() => {
    fetch('/api/auth/line/session')
      .then(res => res.json())
      .then(data => { if (data.logged_in) setIsLineLoggedIn(true); })
      .catch(() => {});
  }, []);

  // 更新表單
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 開啟超商地圖（根據裝置類型選擇方式）
  const handleOpenCvsMap = async () => {
    try {
      setError(null);
      setIsSelectingStore(true);

      const isMobile = isMobileDevice();
      let mapWindow: Window | null = null;

      // ===== 桌面版：先開空白視窗（避免被 popup blocker 攔截）=====
      if (!isMobile) {
        mapWindow = window.open('about:blank', 'cvsMap', 'width=900,height=700,scrollbars=yes,resizable=yes');

        // 顯示載入提示
        if (mapWindow) {
          mapWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>超商地圖</title></head>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;background:#f5f5f5;">
              <div style="text-align:center;">
                <div style="font-size:48px;margin-bottom:16px;">🗺️</div>
                <div style="font-size:18px;color:#333;">正在開啟地圖...</div>
                <div style="font-size:14px;color:#666;margin-top:8px;">請稍候</div>
              </div>
            </body>
            </html>
          `);
        }
      }

      // 呼叫 API 取得地圖 URL
      const res = await getCvsMap({
        cvs_type: formData.cvsType,
        return_url: `${window.location.origin}/checkout`,
      });

      if (res.success && res.map_url) {
        const tempTradeNo = res.temp_trade_no;

        // ===== 手機版 或 桌面版被攔截：直接跳轉 =====
        if (isMobile || !mapWindow) {
          // 儲存表單資料和 tempTradeNo
          sessionStorage.setItem(STORAGE_KEYS.TEMP_TRADE_NO, tempTradeNo);
          sessionStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
          sessionStorage.setItem(STORAGE_KEYS.SHIPPING_METHOD, shippingMethod);

          // 直接跳轉到綠界地圖
          window.location.href = res.map_url;
          return;
        }

        // ===== 桌面版：導向地圖 URL =====
        mapWindow.location.href = res.map_url;

        // 清除之前的 polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }

        // 每 2 秒檢查是否選完門市
        pollingRef.current = setInterval(async () => {
          try {
            // 檢查視窗是否被關閉
            if (mapWindow?.closed) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              setIsSelectingStore(false);
              return;
            }

            const selection = await getCvsSelection(tempTradeNo);
            console.log('Polling result:', selection);

            if (selection.success && selection.selection?.store_id) {
              // 選完了！
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              mapWindow?.close();

              setCvsSelection(selection.selection);
              setIsSelectingStore(false);
            }
          } catch (e) {
            // 還沒選完，繼續等
          }
        }, 2000);

        // 60 秒後停止檢查（timeout）
        setTimeout(() => {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setIsSelectingStore(false);
          }
        }, 60000);

      } else {
        // API 失敗，關閉空白視窗
        mapWindow?.close();
        setError('開啟超商地圖失敗，請稍後再試');
        setIsSelectingStore(false);
      }
    } catch (err) {
      setError('開啟超商地圖失敗，請稍後再試');
      setIsSelectingStore(false);
      console.error(err);
    }
  };

  // 驗證表單
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('請輸入收件人姓名');
      return false;
    }
    if (!formData.phone.trim() || !/^09\d{8}$/.test(formData.phone)) {
      setError('請輸入正確的手機號碼（09開頭，10碼）');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('請輸入正確的 Email 格式');
      return false;
    }

    if (shippingMethod === 'cvs') {
      if (!cvsSelection) {
        setError('請選擇取貨門市');
        return false;
      }
    } else {
      if (!formData.address.trim()) {
        setError('請輸入收件地址');
        return false;
      }
    }

    return true;
  };

  // 提交結帳
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart?.items?.length) {
      setError('購物車是空的');
      return;
    }

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. 初始化 Medusa Payment Collection（讓 cart 可以被 complete）
      // 同時更新 cart 的顧客資料
      console.log('[Checkout] Initializing payment for cart:', cart.id);
      const customerInfo = {
        firstName: formData.name,
        lastName: ' ',  // 台灣不分 first/last name，用空格避免顯示 "."
        email: formData.email || undefined,
        phone: formData.phone,
        address: shippingMethod === 'cvs'
          ? (cvsSelection?.address || '超商取貨')
          : (formData.address || ''),
        city: shippingMethod === 'cvs' ? 'Taiwan' : (formData.city || 'Taiwan'),
        postalCode: shippingMethod === 'home' ? formData.zipCode : '000',
      };
      const paymentResult = await initPaymentForCart(cart.id, customerInfo, creditsToUse > 0 ? { credits_used: creditsToUse } : undefined);
      console.log('[Checkout] Payment initialized:', paymentResult);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment initialization failed');
      }

      // 2. 組合商品名稱
      const itemName = cart.items
        .map((item) => `${item.title} x${item.quantity}`)
        .join(', ')
        .slice(0, 200); // ECPay 限制 200 字元

      // 3. 建立 ECPay 付款
      const res = await createCheckout({
        amount: total,
        item_name: itemName,
        order_id: cart.id, // Medusa v2 cart.id 已經是 cart_xxx 格式
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: formData.email || undefined,
        return_url: `${window.location.origin}/checkout/complete`,
        metadata: {
          cart_id: cart.id,
          shipping_method: shippingMethod,
          shipping_fee: shippingFee,
          credits_used: creditsToUse,
          // 超取資訊
          ...(shippingMethod === 'cvs' && cvsSelection && {
            cvs_type: formData.cvsType,
            cvs_store_id: cvsSelection.store_id,
            cvs_store_name: cvsSelection.store_name,
            cvs_address: cvsSelection.address,
          }),
          // 宅配資訊
          ...(shippingMethod === 'home' && {
            address: formData.address,
            city: formData.city,
            zip_code: formData.zipCode,
          }),
        },
      });

      if (res.success && res.checkout_url) {
        // 跳轉到綠界付款
        window.location.href = res.checkout_url;
      } else {
        setError('建立訂單失敗，請稍後再試');
      }
    } catch (err: any) {
      setError(err.message || '結帳失敗，請稍後再試');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 購物車為空
  if (!cartLoading && (!cart?.items?.length)) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">購物車是空的</h1>
        <p className="text-gray-500 mb-8">先去逛逛吧！</p>
        <Link href="/" className="btn-primary">
          返回商店
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">結帳</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左側：表單 */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 收件人資訊 */}
            <section className="card p-6">
              <h2 className="text-lg font-bold mb-4">收件人資訊</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input"
                    placeholder="請輸入真實姓名"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    手機 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input"
                    placeholder="0912345678"
                    pattern="09\d{8}"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input"
                    placeholder="選填，用於寄送訂單通知"
                  />
                </div>
              </div>
            </section>

            {/* 物流方式 */}
            <section className="card p-6">
              <h2 className="text-lg font-bold mb-4">物流方式</h2>

              {/* 物流選項 */}
              <div className="flex gap-4 mb-6">
                {config.features.cvsLogistics && (
                  <button
                    type="button"
                    onClick={() => setShippingMethod('cvs')}
                    className={`flex-1 p-4 border rounded-lg text-center transition-colors ${
                      shippingMethod === 'cvs'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-2xl mb-1">🏪</span>
                    <span className="font-medium">超商取貨</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      {isFreeShipping(subtotal) ? '免運' : `${formatPrice(shipping.cvsFee)}`}
                    </span>
                  </button>
                )}
                {config.features.homeDelivery && (
                  <button
                    type="button"
                    onClick={() => setShippingMethod('home')}
                    className={`flex-1 p-4 border rounded-lg text-center transition-colors ${
                      shippingMethod === 'home'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-2xl mb-1">🚚</span>
                    <span className="font-medium">宅配到府</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      {isFreeShipping(subtotal) ? '免運' : `${formatPrice(shipping.homeDeliveryFee)}`}
                    </span>
                  </button>
                )}
              </div>

              {/* 超商取貨 */}
              {shippingMethod === 'cvs' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">選擇超商</label>
                    <div className="flex gap-2">
                      {shipping.cvsOptions.map((cvs) => (
                        <button
                          key={cvs}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, cvsType: cvs as CvsType }));
                            setCvsSelection(null); // 清除之前的選擇
                          }}
                          className={`px-4 py-2 border rounded-lg transition-colors ${
                            formData.cvsType === cvs
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {CVS_NAMES[cvs]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 選擇門市按鈕 */}
                  <div>
                    {cvsSelection ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-green-800">
                              ✅ {cvsSelection.store_name}
                            </p>
                            <p className="text-sm text-green-600 mt-1">
                              {cvsSelection.address}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenCvsMap}
                            disabled={isSelectingStore}
                            className="text-sm text-green-700 underline disabled:opacity-50"
                          >
                            重新選擇
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenCvsMap}
                        disabled={isSelectingStore}
                        className="btn-outline w-full disabled:opacity-50"
                      >
                        {isSelectingStore ? (
                          <>
                            <span className="inline-block animate-spin mr-2">⏳</span>
                            正在取得門市資訊...
                          </>
                        ) : (
                          '🗺️ 選擇取貨門市'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 宅配 */}
              {shippingMethod === 'home' && (
                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">郵遞區號</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className="input"
                        placeholder="100"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">縣市</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="input"
                        placeholder="台北市"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      地址 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="input"
                      placeholder="請輸入完整地址"
                      required={shippingMethod === 'home'}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* 錯誤訊息 */}
            {error && (
              <div className="error-box p-4">
                {error}
              </div>
            )}

            </form>
        </div>

        {/* 右側：訂單摘要 */}
        <div className="lg:col-span-1">
          <div className="card order-summary p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-4">訂單摘要</h2>

            {/* 商品列表 */}
            <ul className="divide-y mb-4">
              {cart?.items?.map((item) => (
                <li key={item.id} className="py-3 flex gap-3">
                  <div className="product-thumb w-16 h-16 rounded overflow-hidden flex-shrink-0">
                    {item.thumbnail && (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">x{item.quantity}</p>
                    <p className="text-sm font-bold">{formatPrice(item.unit_price * item.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* 金額明細 */}
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                <span>商品小計</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>運費</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-green-600">免運</span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>
              {/* 登入提醒 */}
              {!isLineLoggedIn && (
                <div className="my-3 p-3 rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                  <p className="text-sm" style={{ color: '#D4AF37' }}>
                    💡 <a href="/api/auth/line" className="underline font-medium">登入 LINE 帳號</a> 即可使用購物金折抵，並自動累積消費紀錄
                  </p>
                </div>
              )}
              <CreditsSelector
                customerId={null}
                subtotal={subtotal}
                onCreditsChange={setCreditsToUse}
              />
              {creditsToUse > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#D4AF37' }}>💰 購物金折抵</span>
                  <span style={{ color: '#D4AF37' }}>-{formatPrice(creditsToUse)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>總計</span>
                <span className="text-accent">{formatPrice(total)}</span>
              </div>
            </div>

            {/* 免運提示 */}
            {!isFreeShipping(subtotal) && (
              <p className="text-xs text-gray-500 mt-4">
                再買 {formatPrice(shipping.freeShippingThreshold - subtotal)} 即可免運
              </p>
            )}

            {/* 提交按鈕（桌面版） */}
            <button
              type="submit"
              form="checkout-form"
              onClick={handleSubmit}
              disabled={isSubmitting || cartLoading}
              className="btn-primary w-full py-3 mt-6 hidden lg:block disabled:opacity-50"
            >
              {isSubmitting ? '處理中...' : '前往付款'}
            </button>

            {/* 返回購物 */}
            <Link
              href="/"
              className="continue-shopping block text-center text-sm text-gray-500 mt-4 hover:text-primary"
            >
              ← 繼續購物
            </Link>
            <div className="h-20 lg:hidden"></div>
          </div>
        </div>
      </div>

      {/* 手機版 fixed 底部按鈕 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:hidden" style={{ background: 'linear-gradient(180deg, transparent, #0a0a0a 30%)' }}>
        <button
          type="submit"
          form="checkout-form"
          onClick={handleSubmit}
          disabled={isSubmitting || cartLoading}
          className="btn-primary w-full py-4 text-lg disabled:opacity-50"
        >
          {isSubmitting ? '處理中...' : `前往付款 ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
