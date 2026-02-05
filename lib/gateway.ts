import { gateway } from './config';

const GATEWAY_URL = gateway.url;

// ============ 通用 fetch ============

async function gatewayFetch<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GATEWAY_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Gateway Error: ${response.status}`);
  }

  return data;
}

// 金流 API
function paymentFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return gatewayFetch<T>(endpoint, gateway.paymentApiKey, options);
}

// 物流 API
function logisticsFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return gatewayFetch<T>(endpoint, gateway.logisticsApiKey, options);
}

// ============ 金流 API ============

export interface CheckoutRequest {
  amount: number;
  item_name: string;
  order_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  return_url?: string;
  metadata?: Record<string, any>;
}

export interface CheckoutResponse {
  success: boolean;
  transaction_id: string;
  merchant_trade_no: string;
  checkout_url: string;
  expires_at: string;
}

export async function createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
  return paymentFetch<CheckoutResponse>('/api/v1/payment/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ 物流 API ============

export interface CvsMapRequest {
  cvs_type: 'UNIMARTC2C' | 'FAMIC2C' | 'HILIFEC2C';
  return_url?: string;
}

export interface CvsMapResponse {
  success: boolean;
  temp_trade_no: string;
  map_url: string;
}

export async function getCvsMap(data: CvsMapRequest): Promise<CvsMapResponse> {
  return logisticsFetch<CvsMapResponse>('/api/v1/logistics/cvs-map', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface CvsSelection {
  temp_trade_no: string;
  store_id: string;
  store_name: string;
  address: string;
  telephone?: string;
  cvs_type?: string;
}

export async function getCvsSelection(tempTradeNo: string): Promise<{ success: boolean; selection: CvsSelection | null }> {
  return logisticsFetch(`/api/v1/logistics/cvs-selection/${tempTradeNo}`);
}

export interface CreateShipmentRequest {
  receiver_name: string;
  receiver_phone: string;
  receiver_email?: string;
  // 超取
  receiver_store_id?: string;
  cvs_sub_type?: string;
  // 宅配
  receiver_address?: string;
  receiver_zip_code?: string;
  // 商品
  goods_name: string;
  goods_amount?: number;
  // 代收
  is_collection?: boolean;
  collection_amount?: number;
  // 關聯
  order_id?: string;
  transaction_id?: string;
}

export interface ShipmentResponse {
  success: boolean;
  shipment: {
    id: string;
    merchant_trade_no: string;
    status: string;
    cvs_payment_no?: string;
    cvs_validation_no?: string;
  };
}

export async function createShipment(data: CreateShipmentRequest): Promise<ShipmentResponse> {
  return logisticsFetch<ShipmentResponse>('/api/v1/logistics/shipment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ 工具函式 ============

// 超商名稱對應
export const CVS_NAMES: Record<string, string> = {
  UNIMARTC2C: '7-ELEVEN',
  FAMIC2C: '全家',
  HILIFEC2C: '萊爾富',
};

// 取得超商顯示名稱
export function getCvsDisplayName(cvsType: string): string {
  return CVS_NAMES[cvsType] || cvsType;
}
