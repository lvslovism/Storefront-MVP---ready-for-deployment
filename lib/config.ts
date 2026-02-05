import storeConfig from '@/config/store.json';

// 類型定義
export interface StoreConfig {
  store: {
    name: string;
    shortName: string;
    description: string;
    domain: string;
    logo: string;
    favicon: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  medusa: {
    backendUrl: string;
    publishableKey: string;
    regionId: string;
    salesChannelId: string;
  };
  gateway: {
    url: string;
    paymentApiKey: string;
    logisticsApiKey: string;
  };
  features: {
    cart: boolean;
    checkout: boolean;
    cvsLogistics: boolean;
    homeDelivery: boolean;
    linePay: boolean;
    memberSystem: boolean;
  };
  shipping: {
    freeShippingThreshold: number;
    cvsOptions: string[];
    homeDeliveryFee: number;
    cvsFee: number;
  };
  contact: {
    email: string;
    phone: string;
    lineOA: string;
    instagram: string;
    facebook: string;
  };
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };
}

// 匯出設定
export const config: StoreConfig = storeConfig as StoreConfig;

// 便捷存取
export const store = config.store;
export const theme = config.theme;
export const medusa = config.medusa;
export const gateway = config.gateway;
export const features = config.features;
export const shipping = config.shipping;
export const contact = config.contact;
export const seo = config.seo;

// 工具函式
export function formatPrice(amount: number, currency: string = 'TWD'): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isFreeShipping(total: number): boolean {
  return total >= shipping.freeShippingThreshold;
}

export function getShippingFee(type: 'cvs' | 'home', total: number): number {
  if (isFreeShipping(total)) return 0;
  return type === 'cvs' ? shipping.cvsFee : shipping.homeDeliveryFee;
}
