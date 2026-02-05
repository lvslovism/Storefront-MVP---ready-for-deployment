'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Product, getVariantPrice, hasDiscount } from '@/lib/medusa';
import { formatPrice, config } from '@/lib/config';
import { useCart } from './CartProvider';

interface ProductDetailProps {
  product: Product;
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const { addItem, isLoading } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 找到符合選擇的 variant
  const selectedVariant = useMemo(() => {
    if (!product.variants?.length) return null;

    // 如果只有一個 variant，直接返回
    if (product.variants.length === 1) {
      return product.variants[0];
    }

    // 根據選擇的 options 找到對應的 variant
    return product.variants.find((variant) => {
      return variant.options?.every((option) => {
        return selectedOptions[option.option_id] === option.value;
      });
    });
  }, [product.variants, selectedOptions]);

  // 計算價格
  const price = selectedVariant ? getVariantPrice(selectedVariant) : getVariantPrice(product.variants[0]);
  const showDiscount = selectedVariant && hasDiscount(selectedVariant);
  const originalPrice = selectedVariant?.calculated_price?.original_amount;

  // 圖片列表
  const images = product.images?.length ? product.images : product.thumbnail ? [{ id: 'thumb', url: product.thumbnail }] : [];

  // 處理選項變更
  const handleOptionChange = (optionId: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }));
  };

  // 檢查是否可以加入購物車
  const canAddToCart = useMemo(() => {
    if (!product.options?.length) return true; // 無選項
    if (product.variants?.length === 1) return true; // 只有一個變體
    return !!selectedVariant; // 有選擇變體
  }, [product.options, product.variants, selectedVariant]);

  // 加入購物車
  const handleAddToCart = async () => {
    if (!canAddToCart || !selectedVariant) {
      setMessage({ type: 'error', text: '請選擇商品規格' });
      return;
    }

    try {
      setIsAdding(true);
      setMessage(null);
      await addItem(selectedVariant.id, quantity);
      setMessage({ type: 'success', text: '已加入購物車！' });

      // 3 秒後清除訊息
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: '加入失敗，請稍後再試' });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* 圖片區 */}
        <div className="space-y-4">
          {/* 主圖 */}
          <div className="aspect-square relative bg-black rounded-lg overflow-hidden border border-gold/20">
            {images[activeImageIndex] ? (
              <Image
                src={images[activeImageIndex].url}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-20 h-20"
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

          {/* 縮圖 */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImageIndex(index)}
                  className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-colors"
                  style={{
                    border: index === activeImageIndex
                      ? '2px solid rgba(212,175,55,0.6)'
                      : '2px solid rgba(212,175,55,0.2)',
                  }}
                >
                  <Image
                    src={image.url}
                    alt={`${product.title} ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 商品資訊區 */}
        <div className="space-y-6">
          {/* 標題 */}
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              {product.title}
            </h1>
            {selectedVariant?.sku && (
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                SKU: {selectedVariant.sku}
              </p>
            )}
          </div>

          {/* 價格 */}
          <div className="flex items-center gap-3">
            {showDiscount && originalPrice && (
              <span className="text-xl line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-2xl font-bold gold-text">
              {formatPrice(price)}
            </span>
            {showDiscount && (
              <span
                className="text-sm px-2 py-1 rounded font-medium"
                style={{ background: '#D4AF37', color: '#000' }}
              >
                特價
              </span>
            )}
          </div>

          {/* 選項 */}
          {product.options?.map((option) => (
            <div key={option.id}>
              <label
                className="block font-medium mb-2"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {option.title}
              </label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const isSelected = selectedOptions[option.id] === value.value;
                  return (
                    <button
                      key={value.id}
                      onClick={() => handleOptionChange(option.id, value.value)}
                      className="px-4 py-2 rounded-lg transition-all"
                      style={
                        isSelected
                          ? { background: '#D4AF37', color: '#000', fontWeight: 500 }
                          : { border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(255,255,255,0.8)' }
                      }
                    >
                      {value.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 數量 */}
          <div>
            <label
              className="block font-medium mb-2"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              數量
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-gold/10"
                style={{ border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(255,255,255,0.8)' }}
              >
                -
              </button>
              <span
                className="w-12 text-center text-lg font-medium"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-gold/10"
                style={{ border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(255,255,255,0.8)' }}
              >
                +
              </button>
            </div>
          </div>

          {/* 訊息 */}
          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-red-900/50 text-red-300 border border-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 加入購物車 */}
          <button
            onClick={handleAddToCart}
            disabled={isAdding || isLoading || !config.features.cart}
            className="btn-gold w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? '加入中...' : '加入購物車'}
          </button>

          {/* 免運提示 */}
          {config.shipping.freeShippingThreshold > 0 && (
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              🚚 滿 {formatPrice(config.shipping.freeShippingThreshold)} 免運費
            </p>
          )}

          {/* 商品描述 */}
          {product.description && (
            <div className="border-t border-gold/20 pt-6">
              <h2
                className="font-bold mb-3"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                商品說明
              </h2>
              <div
                className="prose prose-sm max-w-none prose-invert"
                style={{ color: 'rgba(255,255,255,0.55)' }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
