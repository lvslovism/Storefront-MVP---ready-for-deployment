// ═══════════════════════════════════════════════════════════════
// lib/analytics.ts
// GA4 (gtag) + Meta Pixel (fbq) 追蹤事件工具
// 只在 client-side 呼叫；script 由 <Analytics /> 元件注入
// ═══════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

// ── helpers ──────────────────────────────────────────────────

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

function fbq(...args: any[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

// ── 商品項目介面 ─────────────────────────────────────────────

export interface AnalyticsItem {
  item_id: string;       // variant_id 或 product handle
  item_name: string;
  price: number;         // 單價（TWD，整數）
  quantity: number;
}

// ── GA4 標準電商事件 ─────────────────────────────────────────

/** view_item — 商品詳情頁瀏覽 */
export function trackViewItem(item: AnalyticsItem) {
  gtag('event', 'view_item', {
    currency: 'TWD',
    value: item.price,
    items: [{ item_id: item.item_id, item_name: item.item_name, price: item.price, quantity: 1 }],
  });
  fbq('track', 'ViewContent', {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: 'product',
    value: item.price,
    currency: 'TWD',
  });
}

/** add_to_cart — 加入購物車 */
export function trackAddToCart(item: AnalyticsItem) {
  gtag('event', 'add_to_cart', {
    currency: 'TWD',
    value: item.price * item.quantity,
    items: [{ item_id: item.item_id, item_name: item.item_name, price: item.price, quantity: item.quantity }],
  });
  fbq('track', 'AddToCart', {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: 'product',
    value: item.price * item.quantity,
    currency: 'TWD',
  });
}

/** begin_checkout — 進入結帳頁 */
export function trackBeginCheckout(items: AnalyticsItem[], value: number) {
  gtag('event', 'begin_checkout', {
    currency: 'TWD',
    value,
    items: items.map((i) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
    })),
  });
  fbq('track', 'InitiateCheckout', {
    content_ids: items.map((i) => i.item_id),
    num_items: items.reduce((s, i) => s + i.quantity, 0),
    value,
    currency: 'TWD',
  });
}

/** purchase — 訂單完成 */
export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  value: number,
  shipping: number = 0,
) {
  gtag('event', 'purchase', {
    transaction_id: transactionId,
    currency: 'TWD',
    value,
    shipping,
    items: items.map((i) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
    })),
  });
  fbq('track', 'Purchase', {
    content_ids: items.map((i) => i.item_id),
    content_type: 'product',
    num_items: items.reduce((s, i) => s + i.quantity, 0),
    value,
    currency: 'TWD',
  });
}
