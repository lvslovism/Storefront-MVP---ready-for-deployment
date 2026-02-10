// ═══════════════════════════════════════════════════════════════
// app/(website)/not-found.tsx
// 自訂 404 頁面
// 施工說明書 v2.1 Phase 1 Step 6
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6" style={{ color: 'rgba(212,175,55,0.3)' }}>
          404
        </div>
        <h1 className="text-2xl font-light tracking-wider gold-text mb-4">
          找不到此頁面
        </h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          您要找的頁面可能已移除、更名，或暫時無法使用。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-gold text-sm px-8 py-3 rounded-full text-center">
            回首頁
          </Link>
          <Link href="/products" className="btn-gold-outline text-sm px-8 py-3 rounded-full text-center">
            瀏覽商品
          </Link>
        </div>
      </div>
    </div>
  );
}
