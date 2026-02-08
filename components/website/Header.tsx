'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { config } from '@/lib/config';
import { useCart } from '@/components/CartProvider';
import CartDrawer from '@/components/CartDrawer';
import LineLoginButton from '@/components/LineLoginButton';

export default function WebsiteHeader() {
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

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
                <span className="text-xl font-bold gold-text">{config.store.name}</span>
              )}
            </Link>

            {/* 導航 */}
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
              {config.contact.lineOA && (
                <a
                  href={config.contact.lineOA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-line-green transition-colors"
                >
                  LINE 客服
                </a>
              )}
            </nav>

            {/* 右側：LINE 登入 + 購物車 */}
            <div className="flex items-center gap-4">
              {/* LINE 登入 */}
              <LineLoginButton />

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
            </div>
          </div>
        </div>
      </header>

      {/* 購物車側邊欄 */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
