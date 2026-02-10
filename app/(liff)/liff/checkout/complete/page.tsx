'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import liff from '@line/liff';

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const rtnCode = searchParams.get('RtnCode');
  const tradeNo = searchParams.get('MerchantTradeNo');
  const [sent, setSent] = useState(false);

  const isSuccess = rtnCode === '1';

  useEffect(() => {
    if (isSuccess && !sent) {
      sendConfirmMessage();
    }
  }, [isSuccess, sent]);

  async function sendConfirmMessage() {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (liffId) {
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          // 發送訂單確認訊息到聊天
          await liff.sendMessages([{
            type: 'text',
            text: `✅ 我已完成付款！訂單編號：${tradeNo}`,
          }]);
          setSent(true);
        }
      }
    } catch (e) {
      console.error('Send message error:', e);
    }
  }

  const handleClose = () => {
    try {
      liff.closeWindow();
    } catch {
      window.close();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-sm">
        {isSuccess ? (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-[#D4AF37] mb-2">付款成功！</h1>
            <p className="text-gray-400 mb-2">訂單編號：{tradeNo}</p>
            <p className="text-gray-500 text-sm mb-8">
              我們會盡快為您出貨，您可以在聊天中查詢訂單狀態
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">付款失敗</h1>
            <p className="text-gray-400 mb-8">請重新結帳或聯繫客服</p>
          </>
        )}

        <button
          onClick={handleClose}
          className="px-8 py-3 bg-[#D4AF37] text-black rounded-full font-medium"
        >
          返回聊天
        </button>
      </div>
    </div>
  );
}

export default function CheckoutComplete() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    }>
      <CheckoutCompleteContent />
    </Suspense>
  );
}
