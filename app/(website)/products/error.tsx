'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Products Error]', error);
  }, [error]);

  return (
    <section className="max-w-7xl mx-auto px-5 py-16">
      <div className="text-center py-20">
        <div className="text-6xl mb-6 opacity-50">⚠️</div>
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: '#D4AF37' }}
        >
          商品載入失敗
        </h1>
        <p
          className="mb-8"
          style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        >
          很抱歉，商品資料暫時無法載入，請稍後再試。
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              background: '#D4AF37',
              color: '#000',
              border: '1px solid #D4AF37',
            }}
          >
            重新載入
          </button>
          <Link
            href="/products"
            className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              background: 'transparent',
              color: '#D4AF37',
              border: '1px solid #D4AF37',
            }}
          >
            返回全部商品
          </Link>
        </div>
      </div>
    </section>
  );
}
