'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { formatPrice, config, shipping } from '@/lib/config';
import { createCheckout, getCvsMap, getCvsSelection, CVS_NAMES, CvsSelection } from '@/lib/gateway';
import { initPaymentForCart } from '@/lib/medusa';
import CreditsSelectorV2 from '@/components/checkout/CreditsSelectorV2';
import { trackBeginCheckout } from '@/lib/analytics';

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

// Shipping options 和免運門檻設定
const SHIPPING_CONFIG = {
  home: {
    paid: 'so_01KGYTF42QQBBP9PNBPBZAZF73',     // 宅配 $100
    free: 'so_01KGZ4K103XXQC45EX2HTHXKHW',     // 宅配免運 $0
    fee: 100,
    freeThreshold: 3000,
  },
  cvs: {
    paid: 'so_01KGT10N7MH9ACTVKJE5G223G8',     // 超商 $60
    free: 'so_01KGZ4K364F7BAYAR7Q53XAB10',     // 超商免運 $0
    fee: 60,
    freeThreshold: 1000,
  },
};

// 滿額自動折扣設定（FULL2000：滿 $2000 折 $200）
const AUTO_DISCOUNT_CONFIG = {
  code: 'FULL2000',
  threshold: 2000,
  amount: 200,
};

// 從 cart.items 的 adjustments 計算每個 promotion 的實際折扣金額
function calculateDiscountsByCode(cart: any): Record<string, number> {
  const discounts: Record<string, number> = {};

  if (!cart?.items) return discounts;

  cart.items.forEach((item: any) => {
    if (!item.adjustments) return;

    item.adjustments.forEach((adj: any) => {
      if (adj.code) {
        discounts[adj.code] = (discounts[adj.code] || 0) + (adj.amount || 0);
      }
    });
  });

  return discounts;
}

// 根據配送方式和商品小計，取得運費和 shipping option ID
function getShippingInfo(method: ShippingMethod, subtotal: number) {
  const config = SHIPPING_CONFIG[method];
  const isFree = subtotal >= config.freeThreshold;
  return {
    fee: isFree ? 0 : config.fee,
    optionId: isFree ? config.free : config.paid,
    isFree,
    threshold: config.freeThreshold,
    remaining: Math.max(0, config.freeThreshold - subtotal),
  };
}

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
  const { cart, isLoading: cartLoading, refreshCart } = useCart();

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
  const [lineCustomerId, setLineCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'cod' | 'chailease'>('credit_card');

  // 零卡分期
  const [chaileasePlans, setChaileasePlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [chaileaseLoading, setChaileaseLoading] = useState(false);

  // 會員偏好資料（用於自動帶入和避免重複儲存）
  const [memberDataLoaded, setMemberDataLoaded] = useState(false);
  const [existingCvsStoreIds, setExistingCvsStoreIds] = useState<Set<string>>(new Set());
  const [existingAddressKeys, setExistingAddressKeys] = useState<Set<string>>(new Set());
  const [memberCvsStores, setMemberCvsStores] = useState<any[]>([]);
  const [memberAddresses, setMemberAddresses] = useState<any[]>([]);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [showAllCvsStores, setShowAllCvsStores] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedCvsStoreId, setSelectedCvsStoreId] = useState<string | null>(null);

  // 折扣碼
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);

  // 滿額自動折扣（FULL2000）
  const [autoDiscount, setAutoDiscount] = useState<{ code: string; discount: number } | null>(null);

  // 用於清理 interval
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 計算金額
  const subtotal = cart?.subtotal || 0;
  const shippingInfo = getShippingInfo(shippingMethod, subtotal);
  const shippingFee = shippingInfo.fee;

  // 從 cart.items adjustments 計算各 promotion 的實際折扣
  const discountsByCode = calculateDiscountsByCode(cart);
  // 滿額折扣只有達門檻才計入
  const rawAutoDiscount = discountsByCode[AUTO_DISCOUNT_CONFIG.code] || 0;
  const autoDiscountAmount = subtotal >= AUTO_DISCOUNT_CONFIG.threshold ? rawAutoDiscount : 0;
  const promoDiscountAmount = promoApplied ? (discountsByCode[promoApplied.code] || 0) : 0;
  const totalDiscount = autoDiscountAmount + promoDiscountAmount;
  const total = subtotal - totalDiscount - creditsToUse + shippingFee;

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

  // ── GA4 + Pixel: begin_checkout ──
  useEffect(() => {
    if (!cart?.items?.length) return;
    const items = cart.items.map((item: any) => ({
      item_id: item.variant_id || item.id,
      item_name: item.title || item.product_title || '',
      price: Math.round(item.unit_price || 0),
      quantity: item.quantity,
    }));
    trackBeginCheckout(items, subtotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.id]);

  // 檢查 LINE 登入狀態
  useEffect(() => {
    fetch('/api/auth/line/session')
      .then(res => res.json())
      .then(data => {
        if (data.logged_in) {
          setIsLineLoggedIn(true);
          if (data.customer_id) setLineCustomerId(data.customer_id);
        }
      })
      .catch(() => {});
  }, []);

  // 會員登入後：載入偏好設定並自動帶入
  useEffect(() => {
    if (!isLineLoggedIn || memberDataLoaded) return;
    setMemberDataLoaded(true);

    // 同時 fetch 所有會員資料
    Promise.all([
      fetch('/api/member/preferences').then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/member/addresses').then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/member/cvs-stores').then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/member/profile').then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([prefsRes, addrsRes, storesRes, profileRes]) => {
      // 檢查是否有 sessionStorage 還原的資料（代表使用者從超商地圖返回）
      const hasRestoredData = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA) !== null;

      // 1. 自動選擇偏好配送方式（只在沒有 sessionStorage 資料時）
      if (!hasRestoredData && prefsRes.success && prefsRes.preferences?.preferred_shipping) {
        setShippingMethod(prefsRes.preferences.preferred_shipping);
      }

      // 2. 儲存已有的超商門市 ID（用於避免重複儲存）
      // 如果有預設門市，自動切換到該超商類型
      if (storesRes.success && storesRes.stores) {
        setMemberCvsStores(storesRes.stores);
        setExistingCvsStoreIds(new Set(storesRes.stores.map((s: any) => s.store_id)));

        // 找到預設門市，自動切到對應的超商類型
        const defaultStore = storesRes.stores.find((s: any) => s.is_default);
        if (defaultStore && !hasRestoredData) {
          // 設定超商類型為預設門市的類型
          setFormData(prev => ({ ...prev, cvsType: defaultStore.cvs_type as CvsType }));
          // 自動選中該門市
          setSelectedCvsStoreId(defaultStore.id);
          setCvsSelection({
            temp_trade_no: 'member_saved',
            store_id: defaultStore.store_id,
            store_name: defaultStore.store_name,
            address: defaultStore.address,
          });
        }
      }

      // 3. 儲存已有的地址（用於避免重複儲存和顯示選擇列表）
      if (addrsRes.success && addrsRes.addresses) {
        setMemberAddresses(addrsRes.addresses);
        // 用 name + phone + address 組合作為 key
        const keys = new Set<string>(
          addrsRes.addresses.map((a: any) => `${a.name}|${a.phone}|${a.address}`)
        );
        setExistingAddressKeys(keys);
      }

      // 4. 自動帶入預設地址（只填空欄位）並標記為選中
      if (addrsRes.success && addrsRes.addresses?.length > 0) {
        const defaultAddr = addrsRes.addresses.find((a: any) => a.is_default) || addrsRes.addresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setFormData(prev => ({
            ...prev,
            name: prev.name || defaultAddr.name || '',
            phone: prev.phone || defaultAddr.phone || '',
            zipCode: prev.zipCode || defaultAddr.zip_code || '',
            city: prev.city || defaultAddr.city || '',
            address: prev.address || `${defaultAddr.district || ''}${defaultAddr.address || ''}`,
          }));
        }
      }

      // 5. 自動帶入會員 profile（只填空欄位）
      if (profileRes.success && profileRes.profile) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || profileRes.profile.name || '',
          phone: prev.phone || profileRes.profile.phone || '',
          email: prev.email || profileRes.profile.email || '',
        }));
      }
    });
  }, [isLineLoggedIn, memberDataLoaded]);

  // 切換超商類型時，自動帶入該類型的預設門市（只有當沒有選中門市時才執行）
  useEffect(() => {
    // 如果已經有選中的門市，且該門市類型與當前選擇一致，就不需要重新選
    if (cvsSelection && memberCvsStores.some(s => s.store_id === cvsSelection.store_id && s.cvs_type === formData.cvsType)) {
      return;
    }
    // 如果已經有選中的門市但類型不同，清除選擇
    if (cvsSelection && !memberCvsStores.some(s => s.store_id === cvsSelection.store_id && s.cvs_type === formData.cvsType)) {
      // 使用者切換了超商類型，嘗試找該類型的預設門市
      const defaultStoreForType = memberCvsStores.find(
        (s: any) => s.is_default && s.cvs_type === formData.cvsType
      );
      if (defaultStoreForType) {
        setSelectedCvsStoreId(defaultStoreForType.id);
        setCvsSelection({
          temp_trade_no: 'member_saved',
          store_id: defaultStoreForType.store_id,
          store_name: defaultStoreForType.store_name,
          address: defaultStoreForType.address,
        });
      } else {
        // 該類型沒有預設門市，清除選擇
        setSelectedCvsStoreId(null);
        setCvsSelection(null);
      }
      return;
    }

    if (!isLineLoggedIn || !memberCvsStores.length) return;

    // 沒有選中門市時，找該類型的預設門市
    const defaultStore = memberCvsStores.find(
      (s: any) => s.is_default && s.cvs_type === formData.cvsType
    );
    if (defaultStore) {
      setSelectedCvsStoreId(defaultStore.id);
      setCvsSelection({
        temp_trade_no: 'member_saved',
        store_id: defaultStore.store_id,
        store_name: defaultStore.store_name,
        address: defaultStore.address,
      });
    }
  }, [isLineLoggedIn, memberCvsStores, formData.cvsType]);

  // 載入零卡分期方案（當選擇零卡分期時）
  useEffect(() => {
    if (paymentMethod === 'chailease' && total > 0) {
      setChaileaseLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/functions/v1/chailease-plans?merchant_code=default&amount=${Math.round(total)}`)
        .then(res => res.json())
        .then(data => {
          if (data.plans && data.plans.length > 0) {
            setChaileasePlans(data.plans);
            setSelectedPlanId(data.plans[0].id); // 預設選第一個
          } else {
            setChaileasePlans([]);
          }
        })
        .catch(() => setChaileasePlans([]))
        .finally(() => setChaileaseLoading(false));
    }
  }, [paymentMethod, total]);

  // 管理 FULL2000 滿額自動折扣
  const lastSubtotalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cart?.id || cartLoading) return;

    const subtotal = cart.subtotal || 0;
    const hasFull2000 = cart.promotions?.some(p => p.code === AUTO_DISCOUNT_CONFIG.code);

    // 從 adjustments 計算 FULL2000 的實際折扣金額
    const currentDiscounts = calculateDiscountsByCode(cart);
    const full2000Discount = currentDiscounts[AUTO_DISCOUNT_CONFIG.code] || 0;

    // 避免重複處理相同的 subtotal
    if (lastSubtotalRef.current === subtotal) {
      // subtotal 沒變，只更新 UI 狀態
      if (subtotal >= AUTO_DISCOUNT_CONFIG.threshold && hasFull2000 && full2000Discount > 0) {
        setAutoDiscount({
          code: AUTO_DISCOUNT_CONFIG.code,
          discount: full2000Discount,
        });
      } else {
        setAutoDiscount(null);
      }
      return;
    }

    lastSubtotalRef.current = subtotal;

    const manageFull2000 = async () => {
      if (subtotal >= AUTO_DISCOUNT_CONFIG.threshold) {
        // 達門檻：保留折扣並更新 UI
        if (hasFull2000 && full2000Discount > 0) {
          setAutoDiscount({
            code: AUTO_DISCOUNT_CONFIG.code,
            discount: full2000Discount,
          });
        } else {
          // Medusa 自動折扣應該會自動套用，只需刷新 cart
          await refreshCart();
        }
      } else {
        // 未達門檻：如果有 FULL2000 就移除
        if (hasFull2000) {
          try {
            console.log('[Checkout] Removing FULL2000 - subtotal below threshold:', subtotal);
            await fetch(
              `${config.medusa.backendUrl}/store/carts/${cart.id}/promotions`,
              {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'x-publishable-api-key': config.medusa.publishableKey,
                },
                body: JSON.stringify({ promo_codes: [AUTO_DISCOUNT_CONFIG.code] }),
              }
            );
            await refreshCart();
          } catch (err) {
            console.error('[Checkout] Failed to remove FULL2000:', err);
          }
        }
        setAutoDiscount(null);
      }
    };

    manageFull2000();
  }, [cart?.id, cart?.subtotal, cart?.items, cart?.promotions, cartLoading, refreshCart]);

  // 更新表單
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 清除選中的地址（因為使用者手動修改了）
    if (['name', 'phone', 'zipCode', 'city', 'address'].includes(name)) {
      setSelectedAddressId(null);
    }
  };

  // 選擇常用地址
  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setFormData(prev => ({
      ...prev,
      name: addr.name || '',
      phone: addr.phone || '',
      zipCode: addr.zip_code || '',
      city: addr.city || '',
      address: `${addr.district || ''}${addr.address || ''}`,
    }));
  };

  // 選擇常用超商門市
  const handleSelectCvsStore = (store: any) => {
    setSelectedCvsStoreId(store.id);
    setCvsSelection({
      temp_trade_no: 'member_saved',
      store_id: store.store_id,
      store_name: store.store_name,
      address: store.address,
    });
  };

  // 套用折扣碼
  const applyPromoCode = async () => {
    if (!promoCode.trim() || !cart?.id) return;
    setPromoLoading(true);
    setPromoError('');

    const codeToApply = promoCode.trim().toUpperCase();
    console.log('[Checkout] Applying promo code:', codeToApply);

    try {
      const res = await fetch(
        `${config.medusa.backendUrl}/store/carts/${cart.id}/promotions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': config.medusa.publishableKey,
          },
          body: JSON.stringify({ promo_codes: [codeToApply] }),
        }
      );

      const data = await res.json();
      console.log('[Checkout] Promo API response:', { status: res.status, data });

      if (!res.ok) {
        const errorMsg = data.message || data.error || '折扣碼無效或已過期';
        console.error('[Checkout] Promo code error:', errorMsg);
        setPromoError(errorMsg);
        return;
      }

      if (data.type === 'not_found' || data.type === 'invalid_data') {
        setPromoError('折扣碼無效或已過期');
        return;
      }

      // 從回傳的 cart.items.adjustments 計算這個 promo code 的實際折扣
      const returnedDiscounts = calculateDiscountsByCode(data.cart);
      const promoCodeDiscount = returnedDiscounts[codeToApply] || 0;
      console.log('[Checkout] Promo applied, code discount:', codeToApply, promoCodeDiscount);

      if (promoCodeDiscount === 0) {
        setPromoError('折扣碼不適用於目前的購物車');
        return;
      }

      setPromoApplied({
        code: codeToApply,
        discount: promoCodeDiscount,
      });
      setPromoCode('');

      // 刷新 cart 以確保 UI 同步
      await refreshCart();
    } catch (err) {
      setPromoError('套用失敗，請稍後再試');
    } finally {
      setPromoLoading(false);
    }
  };

  // 移除折扣碼
  const removePromoCode = async () => {
    if (!promoApplied || !cart?.id) return;

    try {
      await fetch(
        `${config.medusa.backendUrl}/store/carts/${cart.id}/promotions`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': config.medusa.publishableKey,
          },
          body: JSON.stringify({ promo_codes: [promoApplied.code] }),
        }
      );

      setPromoApplied(null);
      setPromoCode('');
    } catch (err) {
      console.error('移除折扣碼失敗', err);
    }
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

  // 背景儲存超商門市（不阻擋結帳流程）
  const saveCvsStoreInBackground = () => {
    if (!isLineLoggedIn || shippingMethod !== 'cvs' || !cvsSelection) return;
    // 檢查是否已存在
    if (existingCvsStoreIds.has(cvsSelection.store_id)) {
      console.log('[Checkout] CVS store already saved, skipping');
      return;
    }
    // 背景儲存
    fetch('/api/member/cvs-stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvs_type: formData.cvsType,
        store_id: cvsSelection.store_id,
        store_name: cvsSelection.store_name,
        address: cvsSelection.address || '',
        is_default: existingCvsStoreIds.size === 0, // 第一筆設為預設
      }),
    })
      .then(() => console.log('[Checkout] CVS store saved'))
      .catch(err => console.warn('[Checkout] CVS store save failed:', err));
  };

  // 背景儲存宅配地址（不阻擋結帳流程）
  const saveAddressInBackground = () => {
    if (!isLineLoggedIn || shippingMethod !== 'home') return;
    // 組合 key 檢查是否已存在
    const fullAddress = formData.address;
    const key = `${formData.name}|${formData.phone}|${fullAddress}`;
    if (existingAddressKeys.has(key)) {
      console.log('[Checkout] Address already saved, skipping');
      return;
    }
    // 判斷 label：如果沒有任何「住家」就用住家，否則用「其他」
    let label = '住家';
    // existingAddressKeys 只存了 key，無法判斷 label，所以用 size 判斷
    if (existingAddressKeys.size > 0) {
      label = '其他';
    }
    // 背景儲存
    fetch('/api/member/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        name: formData.name,
        phone: formData.phone,
        zip_code: formData.zipCode || '',
        city: formData.city || '',
        district: '', // 結帳頁沒有分開 district 欄位
        address: fullAddress,
        is_default: existingAddressKeys.size === 0, // 第一筆設為預設
      }),
    })
      .then(() => console.log('[Checkout] Address saved'))
      .catch(err => console.warn('[Checkout] Address save failed:', err));
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

      // [Fix] 主動管理 FULL2000：結帳前確保折扣狀態正確
      // 這可防止 Medusa complete cart 時自動套用 automatic promotion
      if (subtotal >= AUTO_DISCOUNT_CONFIG.threshold) {
        // 滿 $2000，主動套用 FULL2000
        const hasPromo = cart.promotions?.some(p => p.code === AUTO_DISCOUNT_CONFIG.code);
        if (!hasPromo) {
          await fetch(config.medusa.backendUrl + '/store/carts/' + cart.id + '/promotions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-publishable-api-key': config.medusa.publishableKey,
            },
            body: JSON.stringify({ promo_codes: [AUTO_DISCOUNT_CONFIG.code] }),
          });
        }
      } else {
        // 未滿 $2000，確保移除 FULL2000
        const hasPromo = cart.promotions?.some(p => p.code === AUTO_DISCOUNT_CONFIG.code);
        if (hasPromo) {
          await fetch(config.medusa.backendUrl + '/store/carts/' + cart.id + '/promotions', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-publishable-api-key': config.medusa.publishableKey,
            },
            body: JSON.stringify({ promo_codes: [AUTO_DISCOUNT_CONFIG.code] }),
          });
        }
      }

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
      const paymentResult = await initPaymentForCart(
        cart.id,
        customerInfo,
        { ...(creditsToUse > 0 && { credits_used: creditsToUse }), payment_method: paymentMethod },
        shippingMethod,
        shippingInfo.optionId
      );
      console.log('[Checkout] Payment initialized:', paymentResult);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment initialization failed');
      }

      // 貨到付款：不走 ECPay，直接 complete cart
if (paymentMethod === 'cod') {
        try {
          const completeRes = await fetch(
            `${config.medusa.backendUrl}/store/carts/${cart.id}/complete`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': config.medusa.publishableKey,
              },
            }
          );
          if (completeRes.ok) {
            localStorage.removeItem('medusa_cart_id');

            // [v2.0] 寫入 order_extensions（fire-and-forget + 重試）
            const extBody = {
              cart_id: cart.id,
              shipping_method: shippingMethod,
              shipping_fee: shippingFee,
              payment_method: 'cod',
              credits_used: creditsToUse,
              ...(promoApplied && {
                promo_code: promoApplied.code,
                promo_discount: promoApplied.discount,
              }),
              receiver_name: formData.name,
              receiver_phone: formData.phone,
              receiver_email: formData.email || undefined,
              ...(shippingMethod === 'cvs' && cvsSelection && {
                cvs_type: formData.cvsType,
                cvs_store_id: cvsSelection.store_id,
                cvs_store_name: cvsSelection.store_name,
                cvs_address: cvsSelection.address,
              }),
              ...(shippingMethod === 'home' && {
                receiver_address: formData.address,
                receiver_city: formData.city,
                receiver_zip_code: formData.zipCode,
              }),
            };

            const writeExtension = async (retries = 2) => {
              for (let i = 0; i <= retries; i++) {
                try {
                  const res = await fetch('/api/order-extension', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(extBody),
                  });
                  if (res.ok) {
                    console.log('[COD] order_extensions written');
                    return;
                  }
                } catch (e) {
                  console.warn(`[COD] order_extensions write attempt ${i + 1} failed`);
                }
                if (i < retries) await new Promise(r => setTimeout(r, 1500));
              }
            };
            writeExtension(); // 不 await，不阻擋跳轉

            // 背景儲存常用地址/門市（不阻擋跳轉）
            saveCvsStoreInBackground();
            saveAddressInBackground();

            window.location.href = `/checkout/complete?cart_id=${cart.id}&payment_method=cod`;
            return;
          } else {
            const errData = await completeRes.json().catch(() => ({}));
            throw new Error(errData.message || '訂單建立失敗');
          }
        } catch (err: any) {
          setError(err.message || '訂單建立失敗');
          setIsSubmitting(false);
          return;
        }
      }

      // 零卡分期：POST 到 chailease-checkout
      if (paymentMethod === 'chailease') {
        if (!selectedPlanId) {
          setError('請選擇分期期數');
          setIsSubmitting(false);
          return;
        }

        try {
          const chaileaseRes = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/functions/v1/chailease-checkout`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cart_id: cart.id,
                plan_id: selectedPlanId,
                customer_name: formData.name,
                customer_phone: formData.phone,
                customer_email: formData.email || undefined,
                source: 'storefront',
              }),
            }
          );

          const chaileaseData = await chaileaseRes.json();

          if (chaileaseRes.ok && chaileaseData.payment_url) {
            // 儲存資料供完成頁背景儲存常用地址/門市
            if (isLineLoggedIn) {
              sessionStorage.setItem('checkout_save_data', JSON.stringify({
                shippingMethod,
                cvsType: formData.cvsType,
                cvsSelection,
                formData: {
                  name: formData.name,
                  phone: formData.phone,
                  zipCode: formData.zipCode,
                  city: formData.city,
                  address: formData.address,
                },
                existingCvsStoreIds: Array.from(existingCvsStoreIds),
                existingAddressKeys: Array.from(existingAddressKeys),
              }));
            }

            // 跳轉到中租付款頁
            window.location.href = chaileaseData.payment_url;
            return;
          } else {
            throw new Error(chaileaseData.error || '建立分期交易失敗');
          }
        } catch (err: any) {
          setError(err.message || '零卡分期申請失敗，請稍後再試');
          setIsSubmitting(false);
          return;
        }
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
          ...(lineCustomerId && { customer_id: lineCustomerId }),
          // 折扣碼
          ...(promoApplied && {
            promo_code: promoApplied.code,
            promo_discount: promoApplied.discount,
          }),
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
        // 儲存資料供完成頁背景儲存常用地址/門市
        if (isLineLoggedIn) {
          sessionStorage.setItem('checkout_save_data', JSON.stringify({
            shippingMethod,
            cvsType: formData.cvsType,
            cvsSelection,
            formData: {
              name: formData.name,
              phone: formData.phone,
              zipCode: formData.zipCode,
              city: formData.city,
              address: formData.address,
            },
            existingCvsStoreIds: Array.from(existingCvsStoreIds),
            existingAddressKeys: Array.from(existingAddressKeys),
          }));
        }

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
    <div className="checkout-page w-full max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">結帳</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左側：表單 */}
        <div className="lg:col-span-2 min-w-0">
          <form onSubmit={handleSubmit} className="space-y-8 min-w-0">
            {/* 收件人資訊 */}
            <section className="card p-4 sm:p-6 overflow-hidden">
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
            <section className="card p-4 sm:p-6 overflow-hidden">
              <h2 className="text-lg font-bold mb-4">物流方式</h2>

              {/* 物流選項 */}
              <div className="flex gap-4 mb-6">
                {config.features.cvsLogistics && (
                  <button
                    type="button"
                    onClick={() => setShippingMethod('cvs')}
                    className={`flex-1 p-4 border-2 rounded-lg text-center transition-colors ${
                      shippingMethod === 'cvs'
                        ? 'border-white bg-white/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <span className="block text-2xl mb-1">🏪</span>
                    <span className="font-medium">超商取貨</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      {subtotal >= SHIPPING_CONFIG.cvs.freeThreshold ? '免運' : formatPrice(SHIPPING_CONFIG.cvs.fee)}
                    </span>
                  </button>
                )}
                {config.features.homeDelivery && (
                  <button
                    type="button"
                    onClick={() => { setShippingMethod('home'); setPaymentMethod('credit_card'); }}
                    className={`flex-1 p-4 border-2 rounded-lg text-center transition-colors ${
                      shippingMethod === 'home'
                        ? 'border-white bg-white/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <span className="block text-2xl mb-1">🚚</span>
                    <span className="font-medium">宅配到府</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      {subtotal >= SHIPPING_CONFIG.home.freeThreshold ? '免運' : formatPrice(SHIPPING_CONFIG.home.fee)}
                    </span>
                  </button>
                )}
              </div>

              {/* 付款方式 */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-3">付款方式</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${paymentMethod === 'credit_card' ? 'border-[#D4AF37] bg-[rgba(212,175,55,0.1)]' : 'border-gray-600'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={() => setPaymentMethod('credit_card')}
                      className="sr-only"
                    />
                    <span className="block text-sm font-medium">💳 信用卡</span>
                    <span className="block text-xs text-gray-500 mt-1">線上刷卡付款</span>
                  </label>
                  {shippingMethod === 'cvs' && (
                    <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${paymentMethod === 'cod' ? 'border-[#D4AF37] bg-[rgba(212,175,55,0.1)]' : 'border-gray-600'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="sr-only"
                      />
                      <span className="block text-sm font-medium">🏪 取貨付款</span>
                      <span className="block text-xs text-gray-500 mt-1">超商取貨時付款</span>
                    </label>
                  )}
                  <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${paymentMethod === 'chailease' ? 'border-[#D4AF37] bg-[rgba(212,175,55,0.1)]' : 'border-gray-600'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="chailease"
                      checked={paymentMethod === 'chailease'}
                      onChange={() => setPaymentMethod('chailease')}
                      className="sr-only"
                    />
                    <span className="block text-sm font-medium">📱 零卡分期</span>
                    <span className="block text-xs text-gray-500 mt-1">免信用卡分期付款</span>
                  </label>
                </div>

                {/* 零卡分期方案選擇 */}
                {paymentMethod === 'chailease' && (
                  <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#D4AF37' }}>選擇分期期數</label>
                    {chaileaseLoading ? (
                      <p className="text-sm text-gray-400">載入方案中...</p>
                    ) : chaileasePlans.length > 0 ? (
                      <select
                        value={selectedPlanId || ''}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                      >
                        {chaileasePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.display_name} - {formatPrice(plan.estimated_monthly)}/期
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-400">目前無可用分期方案</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">由中租零卡提供分期服務，免信用卡即可申請</p>
                  </div>
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
                            setSelectedCvsStoreId(null); // 清除選中的門市
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

                  {/* 常用門市選擇 */}
                  {isLineLoggedIn && memberCvsStores.filter(s => s.cvs_type === formData.cvsType).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#D4AF37' }}>
                        🏪 選擇常用門市
                      </label>
                      <div className="space-y-2">
                        {(() => {
                          const filteredStores = memberCvsStores.filter(s => s.cvs_type === formData.cvsType);
                          const displayStores = showAllCvsStores ? filteredStores : filteredStores.slice(0, 3);
                          return (
                            <>
                              {displayStores.map((store) => (
                                <button
                                  key={store.id}
                                  type="button"
                                  onClick={() => handleSelectCvsStore(store)}
                                  className="w-full text-left p-3 rounded-lg transition-all"
                                  style={{
                                    background: selectedCvsStoreId === store.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                                    border: selectedCvsStoreId === store.id ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-white/80">{store.store_name}</span>
                                    {store.is_default && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>預設</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-white/50 truncate">{store.address}</div>
                                </button>
                              ))}
                              {filteredStores.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllCvsStores(!showAllCvsStores)}
                                  className="w-full text-center py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                                >
                                  {showAllCvsStores ? '收起' : `顯示更多 (${filteredStores.length - 3} 筆)`}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

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
                  {/* 常用地址選擇 */}
                  {isLineLoggedIn && memberAddresses.length > 0 && (
                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-2" style={{ color: '#D4AF37' }}>
                        📍 選擇常用地址
                      </label>
                      <div className="space-y-2">
                        {(showAllAddresses ? memberAddresses : memberAddresses.slice(0, 3)).map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => handleSelectAddress(addr)}
                            className="w-full text-left p-3 rounded-lg transition-all"
                            style={{
                              background: selectedAddressId === addr.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                              border: selectedAddressId === addr.id ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                background: addr.is_default ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                                color: addr.is_default ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                              }}>
                                {addr.label}
                              </span>
                              {addr.is_default && (
                                <span className="text-[10px]" style={{ color: '#D4AF37' }}>預設</span>
                              )}
                            </div>
                            <div className="text-sm text-white/80">{addr.name}　{addr.phone}</div>
                            <div className="text-xs text-white/50 truncate">
                              {addr.zip_code} {addr.city}{addr.district}{addr.address}
                            </div>
                          </button>
                        ))}
                        {memberAddresses.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllAddresses(!showAllAddresses)}
                            className="w-full text-center py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                          >
                            {showAllAddresses ? '收起' : `顯示更多 (${memberAddresses.length - 3} 筆)`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
        <div className="lg:col-span-1 min-w-0">
          <div className="card order-summary p-4 sm:p-6 sticky top-24 overflow-hidden w-full min-w-0">
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
              <div className="flex justify-between min-w-0">
                <span className="min-w-0 truncate">商品小計</span>
                <span className="shrink-0 whitespace-nowrap ml-2">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between min-w-0">
                <span className="min-w-0 truncate">運費</span>
                <span className="shrink-0 whitespace-nowrap ml-2">
                  {shippingFee === 0 ? (
                    <span className="text-green-600">免運</span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>

              {/* 折扣碼輸入 */}
              <div className="my-4 pt-2 border-t border-gray-700">
                <label className="block text-sm text-gray-400 mb-2">折扣碼</label>
                {promoApplied ? (
                  <div
                    className="flex items-center justify-between p-3 rounded-lg min-w-0"
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                    }}
                  >
                    <div className="min-w-0 truncate">
                      <span style={{ color: '#D4AF37', fontWeight: 600 }}>✓ {promoApplied.code}</span>
                      <span className="text-gray-400 text-sm ml-2">
                        已折抵 {formatPrice(promoDiscountAmount)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="text-red-400 text-sm hover:text-red-300 shrink-0 ml-2"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="輸入折扣碼"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyPromoCode())}
                    />
                    <button
                      type="button"
                      onClick={applyPromoCode}
                      disabled={promoLoading || !promoCode.trim()}
                      className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: promoCode.trim() ? '#D4AF37' : '#333',
                        color: promoCode.trim() ? '#000' : '#666',
                      }}
                    >
                      {promoLoading ? '...' : '套用'}
                    </button>
                  </div>
                )}
                {promoError && <p className="text-red-400 text-xs mt-2">{promoError}</p>}
              </div>

              {/* 滿額自動折扣顯示（只有達門檻才顯示）*/}
              {autoDiscountAmount > 0 && subtotal >= AUTO_DISCOUNT_CONFIG.threshold && (
                <div className="flex justify-between text-sm min-w-0">
                  <span className="min-w-0 truncate" style={{ color: '#D4AF37' }}>🎉 滿額折扣</span>
                  <span className="shrink-0 whitespace-nowrap ml-2" style={{ color: '#D4AF37' }}>-{formatPrice(autoDiscountAmount)}</span>
                </div>
              )}

              {/* 折扣碼金額顯示 */}
              {promoApplied && promoDiscountAmount > 0 && (
                <div className="flex justify-between text-sm min-w-0">
                  <span className="min-w-0 truncate" style={{ color: '#D4AF37' }}>🏷️ 折扣碼 {promoApplied.code}</span>
                  <span className="shrink-0 whitespace-nowrap ml-2" style={{ color: '#D4AF37' }}>-{formatPrice(promoDiscountAmount)}</span>
                </div>
              )}

              {/* 登入提醒 */}
              {!isLineLoggedIn && (
                <div className="my-3 p-3 rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                  <p className="text-sm" style={{ color: '#D4AF37' }}>
                    💡 <a href="/api/auth/line" className="underline font-medium">登入 LINE 帳號</a> 即可使用購物金折抵，並自動累積消費紀錄
                  </p>
                </div>
              )}
              <CreditsSelectorV2
                customerId={lineCustomerId}
                orderSubtotal={subtotal}
                onCreditsChange={setCreditsToUse}
              />
              {creditsToUse > 0 && (
                <div className="flex justify-between text-sm min-w-0">
                  <span className="min-w-0 truncate" style={{ color: '#D4AF37' }}>🎁 折抵優惠</span>
                  <span className="shrink-0 whitespace-nowrap ml-2" style={{ color: '#D4AF37' }}>-{formatPrice(creditsToUse)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2 min-w-0">
                <span>總計</span>
                <span className="text-accent shrink-0 whitespace-nowrap ml-2">{formatPrice(total)}</span>
              </div>
            </div>

            {/* 免運提示 */}
            {shippingInfo.remaining > 0 && (
              <p className="text-xs text-gray-500 mt-4">
                再買 {formatPrice(shippingInfo.remaining)} 即可{shippingMethod === 'cvs' ? '超商' : '宅配'}免運
              </p>
            )}

            {/* 滿額折扣提示 */}
            {!autoDiscount && subtotal < AUTO_DISCOUNT_CONFIG.threshold && (
              <p className="text-xs text-gray-500 mt-2">
                再買 {formatPrice(AUTO_DISCOUNT_CONFIG.threshold - subtotal)} 即可享滿額折 {formatPrice(AUTO_DISCOUNT_CONFIG.amount)}
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
              {isSubmitting ? '處理中...' : paymentMethod === 'cod' ? '確認下單' : '前往付款'}
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
          {isSubmitting ? '處理中...' : paymentMethod === 'cod' ? `確認下單 ${formatPrice(total)}` : `前往付款 ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
