'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { config } from '@/lib/config';
import { useCart } from '@/components/CartProvider';
import CartDrawer from '@/components/CartDrawer';
import UserMenu from '@/components/website/UserMenu';

export default function WebsiteHeader() {
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lineOAUrl = config.contact.lineOA || 'https://lin.ee/Ro3Fd4p';

  return (
    <>
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-gold/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              {config.store.logo ? (
                <Image
                  src={config.store.logo}
                  alt={config.store.name}
                  width={120}
                  height={40}
                  className="h-8 w-auto"
                />
              ) : (
                <span className="text-lg font-light tracking-[3px] uppercase" style={{ color: '#D4AF37' }}>
                  {config.store.name || 'MINJIE STUDIO'}
                </span>
              )}
            </Link>

            {/* 桌面版導航 */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-300 hover:text-gold transition-colors"
              >
                首頁
              </Link>
              <Link
                href="/products"
                className="text-gray-300 hover:text-gold transition-colors"
              >
                全部商品
              </Link>
              <Link
                href="/blog"
                className="text-gray-300 hover:text-gold transition-colors"
              >
                保健知識
              </Link>
              <Link
                href="/about"
                className="text-gray-300 hover:text-gold transition-colors"
              >
                關於我們
              </Link>
              <a
                href={lineOAUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-line-green transition-colors"
              >
                LINE 客服
              </a>
            </nav>

            {/* 右側：LINE 登入 + 購物車 + 漢堡選單 */}
            <div className="flex items-center gap-3">
              {/* LINE 登入 */}
              <UserMenu />

              {/* 購物車按鈕 */}
              {config.features.cart && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 border border-gold/30 rounded-full hover:border-gold/60 hover:bg-gold/10 transition-all"
                  aria-label="購物車"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-gold"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                    />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gold text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </button>
              )}

              {/* 漢堡選單按鈕 - 只在手機版顯示 */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 border border-gold/30 rounded-lg hover:border-gold/60 hover:bg-gold/10 transition-all"
                aria-label="開啟選單"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gold"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 手機版側邊選單 */}
      {/* 背景遮罩 */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* 側邊選單 */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-black border-l border-gold/20 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 選單頭部 */}
        <div className="flex items-center justify-between p-4 border-b border-gold/20">
          <span className="text-lg font-medium gold-text">選單</span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-gold/10 rounded-lg transition-colors"
            aria-label="關閉選單"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-gold"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 選單項目 */}
        <nav className="p-4 space-y-2">
          <Link
            href="/products"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            全部商品
          </Link>
          <Link
            href="/blog"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            保健知識
          </Link>
          <Link
            href="/about"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            關於我們
          </Link>
          <Link
            href="/faq"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            常見問題
          </Link>

          <div className="border-t border-gold/10 my-4" />

          <a
            href={lineOAUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-line-green hover:bg-line-green/5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-line-green">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.55 1.26 4.84 3.23 6.38-.14.53-.51 1.94-.59 2.24-.1.37.13.73.52.73.14 0 .28-.05.4-.13.67-.49 2.43-1.67 3.45-2.38.97.15 1.97.23 2.99.23 5.52 0 10-3.82 10-8.5S17.52 2 12 2z"/>
            </svg>
            LINE 客服
          </a>
        </nav>
      </div>

      {/* 購物車側邊欄 */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
