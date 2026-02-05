'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { config } from '@/lib/config';

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  
  // 從 URL 取得參數
  const tradeNo = searchParams.get('MerchantTradeNo') || searchParams.get('trade_no');
  const rtnCode = searchParams.get('RtnCode');
  const rtnMsg = searchParams.get('RtnMsg');

  useEffect(() => {
    // 判斷付款結果
    if (rtnCode === '1') {
      setStatus('success');
      // 清除購物車 localStorage
      localStorage.removeItem('medusa_cart_id');
    } else if (rtnCode) {
      setStatus('failed');
    } else {
      // 沒有回傳參數，可能是直接訪問
      setStatus('success');
    }
  }, [rtnCode]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-500">處理中...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-10 h-10 text-red-500"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">付款失敗</h1>
        <p className="text-gray-600 mb-2">
          {rtnMsg || '付款過程中發生錯誤，請稍後再試'}
        </p>
        {tradeNo && (
          <p className="text-sm text-gray-500 mb-8">
            訂單編號：{tradeNo}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/checkout" className="btn-primary">
            重新結帳
          </Link>
          <Link href="/" className="btn-outline">
            返回商店
          </Link>
        </div>
      </div>
    );
  }

  // 付款成功
  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-lg">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-10 h-10 text-green-500"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      
      <h1 className="text-2xl font-bold mb-4">感謝您的訂購！</h1>
      <p className="text-gray-600 mb-2">
        訂單已成功建立，我們會盡快為您處理。
      </p>
      
      {tradeNo && (
        <div className="bg-gray-50 rounded-lg p-4 my-6">
          <p className="text-sm text-gray-500">訂單編號</p>
          <p className="text-lg font-mono font-bold">{tradeNo}</p>
        </div>
      )}

      <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4 my-6">
        <h3 className="font-bold">接下來會發生什麼？</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span>1️⃣</span>
            <span>我們會在 1-2 個工作天內處理您的訂單</span>
          </li>
          <li className="flex items-start gap-2">
            <span>2️⃣</span>
            <span>出貨後會透過簡訊/Email 通知您</span>
          </li>
          <li className="flex items-start gap-2">
            <span>3️⃣</span>
            <span>超商取貨預計 2-3 天到貨，宅配預計 1-2 天</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/" className="btn-primary">
          繼續購物
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

// 主元件包 Suspense
export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutCompleteContent />
    </Suspense>
  );
}