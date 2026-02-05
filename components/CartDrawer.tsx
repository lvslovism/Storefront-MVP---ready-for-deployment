'use client';

import { useCart } from './CartProvider';
import { formatPrice, config } from '@/lib/config';
import Image from 'next/image';
import Link from 'next/link';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, isLoading, updateItem, removeItem } = useCart();

  if (!isOpen) return null;

  const subtotal = cart?.subtotal || 0;
  const isFreeShipping = subtotal >= config.shipping.freeShippingThreshold;
  const amountToFreeShipping = config.shipping.freeShippingThreshold - subtotal;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">購物車</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="關閉"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 免運提示 */}
        {!isFreeShipping && amountToFreeShipping > 0 && (
          <div className="bg-secondary px-4 py-3 text-sm">
            <p>
              再買 <span className="font-bold text-accent">{formatPrice(amountToFreeShipping)}</span> 即可免運！
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{
                  width: `${Math.min((subtotal / config.shipping.freeShippingThreshold) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {isFreeShipping && (
          <div className="bg-green-50 px-4 py-3 text-sm text-green-700">
            🎉 已達免運門檻！
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-4">
          {isLoading && !cart ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !cart?.items?.length ? (
            <div className="text-center py-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              <p className="text-gray-500">購物車是空的</p>
              <button onClick={onClose} className="btn-primary mt-4">
                繼續購物
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  {/* 商品圖片 */}
                  <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-8 h-8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 商品資訊 */}
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.title}</h4>
                    {item.variant?.title && item.variant.title !== item.title && (
                      <p className="text-xs text-gray-500">{item.variant.title}</p>
                    )}
                    <p className="text-sm font-bold mt-1">
                      {formatPrice(item.unit_price)}
                    </p>

                    {/* 數量控制 */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                        disabled={isLoading}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                        disabled={isLoading}
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-gray-400 hover:text-red-500"
                        aria-label="移除"
                        disabled={isLoading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart?.items?.length ? (
          <div className="border-t p-4 space-y-4">
            {/* 小計 */}
            <div className="flex justify-between text-lg font-bold">
              <span>小計</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {/* 結帳按鈕 */}
            {config.features.checkout ? (
              <Link
                href="/checkout"
                onClick={onClose}
                className="btn-primary w-full text-center"
              >
                前往結帳
              </Link>
            ) : (
              <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">
                結帳功能開發中
              </button>
            )}

            <button
              onClick={onClose}
              className="btn-secondary w-full"
            >
              繼續購物
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
