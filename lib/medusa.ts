import { medusa } from './config';

const BACKEND_URL = medusa.backendUrl;
const PUBLISHABLE_KEY = medusa.publishableKey;
const REGION_ID = medusa.regionId;

// 通用 fetch 函式
async function medusaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_KEY,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============ 商品 API ============

export interface Product {
  id: string;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  images: Array<{ id: string; url: string }>;
  options: Array<{
    id: string;
    title: string;
    values: Array<{ id: string; value: string }>;
  }>;
  variants: Array<{
    id: string;
    title: string;
    sku: string | null;
    prices: Array<{
      amount: number;
      currency_code: string;
    }>;
    options: Array<{
      id: string;
      value: string;
      option_id: string;
    }>;
    inventory_quantity?: number;
    calculated_price?: {
      calculated_amount: number;
      original_amount: number;
      currency_code: string;
    };
  }>;
  created_at: string;
  updated_at: string;
}

export interface ProductsResponse {
  products: Product[];
  count: number;
  offset: number;
  limit: number;
}

export async function getProducts(params?: {
  limit?: number;
  offset?: number;
  collection_id?: string[];
  category_id?: string[];
  tag_id?: string[];
}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('region_id', REGION_ID);

  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.collection_id) {
    params.collection_id.forEach(id => searchParams.append('collection_id[]', id));
  }
  if (params?.category_id) {
    params.category_id.forEach(id => searchParams.append('category_id[]', id));
  }
  if (params?.tag_id) {
    params.tag_id.forEach(id => searchParams.append('tag_id[]', id));
  }

  return medusaFetch<ProductsResponse>(`/store/products?${searchParams}`);
}

export async function getProduct(handle: string): Promise<{ product: Product }> {
  const searchParams = new URLSearchParams();
  searchParams.set('region_id', REGION_ID);
  
  return medusaFetch<{ product: Product }>(`/store/products/${handle}?${searchParams}`);
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const searchParams = new URLSearchParams();
  searchParams.set('region_id', REGION_ID);
  searchParams.set('handle', handle);

  const response = await medusaFetch<ProductsResponse>(`/store/products?${searchParams}`);
  return response.products[0] || null;
}

// ============ 商品分類 API ============

export interface Collection {
  id: string;
  title: string;
  handle: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionsResponse {
  collections: Collection[];
  count: number;
}

export async function getCollections(): Promise<CollectionsResponse> {
  const url = `${BACKEND_URL}/store/collections?limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return { collections: [], count: 0 };
  }

  return res.json();
}

// ============ 購物車 API ============

export interface CartItemAdjustment {
  id: string;
  code: string;
  amount: number;
  promotion_id?: string;
}

export interface CartItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  variant: {
    id: string;
    title: string;
    sku: string | null;
    product: {
      id: string;
      title: string;
      handle: string;
      thumbnail: string | null;
    };
  };
  adjustments?: CartItemAdjustment[];
}

export interface CartPromotion {
  code: string;
  is_automatic?: boolean;
}

export interface Cart {
  id: string;
  email: string | null;
  items: CartItem[];
  region: {
    id: string;
    name: string;
    currency_code: string;
  };
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  total: number;
  shipping_address: Address | null;
  billing_address: Address | null;
  shipping_methods: ShippingMethod[];
  promotions?: CartPromotion[];
}

export interface Address {
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  address_2: string | null;
  city: string;
  province: string | null;
  postal_code: string;
  country_code: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
}

export async function createCart(): Promise<{ cart: Cart }> {
  return medusaFetch<{ cart: Cart }>('/store/carts', {
    method: 'POST',
    body: JSON.stringify({
      region_id: REGION_ID,
    }),
  });
}

export async function getCart(cartId: string): Promise<{ cart: Cart }> {
  return medusaFetch<{ cart: Cart }>(`/store/carts/${cartId}`);
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity: number = 1
): Promise<{ cart: Cart }> {
  return medusaFetch<{ cart: Cart }>(`/store/carts/${cartId}/line-items`, {
    method: 'POST',
    body: JSON.stringify({
      variant_id: variantId,
      quantity,
    }),
  });
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number
): Promise<{ cart: Cart }> {
  return medusaFetch<{ cart: Cart }>(`/store/carts/${cartId}/line-items/${itemId}`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(
  cartId: string,
  itemId: string
): Promise<{ cart: Cart }> {
  return medusaFetch<{ cart: Cart }>(`/store/carts/${cartId}/line-items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function updateCart(
  cartId: string,
  data: {
    email?: string;
    shipping_address?: Partial<Address>;
    billing_address?: Partial<Address>;
  }
): Promise<{ cart: Cart }> {
  return medusaFetch<{ cart: Cart }>(`/store/carts/${cartId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ Payment Collection API ============

export interface PaymentInitResult {
  success: boolean;
  collectionId?: string;
  sessionId?: string;
  provider?: string;
  error?: string;
}

export interface CustomerInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

/**
 * 初始化 Payment（透過 Next.js API Route 避免 CORS）
 * POST /api/payment/init → Medusa payment collection + session
 * @param cartId - Medusa cart ID
 * @param customerInfo - Optional customer info to update cart
 * @param metadata - Optional metadata
 * @param shippingMethod - 'cvs' or 'home'
 */
export async function initPaymentForCart(
  cartId: string,
  customerInfo?: CustomerInfo,
  metadata?: Record<string, any>,
  shippingMethod?: 'cvs' | 'home',
  shippingOptionId?: string
): Promise<PaymentInitResult> {
  const res = await fetch('/api/payment/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, customerInfo, metadata, shippingMethod, shippingOptionId }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Payment initialization failed');
  }

  return data;
}

// ============ 工具函式 ============

// 取得變體價格（TWD）
export function getVariantPrice(variant: Product['variants'][0]): number {
  // 優先使用計算後的價格（含折扣）
  if (variant.calculated_price) {
    return variant.calculated_price.calculated_amount;
  }
  
  // 從 prices 陣列找 TWD
  const twdPrice = variant.prices?.find(p => p.currency_code === 'twd');
  return twdPrice?.amount || 0;
}

// 取得商品最低價格
export function getProductLowestPrice(product: Product): number {
  if (!product.variants?.length) return 0;
  
  const prices = product.variants.map(v => getVariantPrice(v));
  return Math.min(...prices);
}

// 檢查是否有折扣
export function hasDiscount(variant: Product['variants'][0]): boolean {
  if (!variant.calculated_price) return false;
  return variant.calculated_price.calculated_amount < variant.calculated_price.original_amount;
}
