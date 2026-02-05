'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ImageGallery from '@/components/website/ImageGallery';
import VariantSelector from '@/components/website/VariantSelector';
import QuantitySelector from '@/components/website/QuantitySelector';
import { useCart } from '@/components/CartProvider';
import { formatPrice, config } from '@/lib/config';

interface ProductDetailClientProps {
  product: any;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // 整理圖片
  const images = useMemo(() => {
    const imgs: Array<{ id: string; url: string }> = [];
    if (product.thumbnail) {
      imgs.push({ id: 'thumb', url: product.thumbnail });
    }
    if (product.images) {
      product.images.forEach((img: any) => {
        if (img.url && img.url !== product.thumbnail) {
          imgs.push({ id: img.id, url: img.url });
        }
      });
    }
    return imgs;
  }, [product]);

  // 整理選項
  const options = useMemo(() => {
    return product.options?.map((opt: any) => ({
      id: opt.id,
      title: opt.title,
      values: opt.values || [],
    })) || [];
  }, [product]);

  // 根據選擇找到對應 variant
  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    if (product.variants.length === 1) return product.variants[0];

    // 多變體：根據選項匹配
    return product.variants.find((v: any) => {
      if (!v.options) return false;
      return v.options.every((opt: any) =>
        selectedOptions[opt.option_id] === opt.value
      );
    }) || null;
  }, [product.variants, selectedOptions]);

  // 價格
  const price = selectedVariant?.calculated_price?.calculated_amount;
  const originalPrice = selectedVariant?.calculated_price?.original_amount;
  const hasDiscount = originalPrice && originalPrice > price;

  // 是否可加入購物車
  const canAdd = product.variants?.length === 1 || selectedVariant !== null;

  // 處理選項變更
  const handleOptionSelect = (optionId: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionId]: value }));
  };

  // 加入購物車 - 使用 CartProvider 的 addItem(variantId, quantity) 簽名
  const handleAddToCart = async () => {
    if (!canAdd || isAdding) return;

    const variant = selectedVariant || product.variants?.[0];
    if (!variant) return;

    try {
      setIsAdding(true);
      await addItem(variant.id, quantity);

      // 回饋動畫
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    } catch (error) {
      console.error('加入購物車失敗:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* 麵包屑 */}
      <nav className="mb-8 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
        <Link href="/" className="hover:text-white transition-colors">首頁</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-white transition-colors">商品</Link>
        <span className="mx-2">/</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* 左：圖片 */}
        <ImageGallery images={images} title={product.title} />

        {/* 右：商品資訊 */}
        <div>
          {/* 標題 */}
          <h1 className="text-2xl md:text-3xl font-light tracking-wide mb-4"
            style={{ color: 'rgba(255,255,255,0.95)' }}>
            {product.title}
          </h1>

          {/* 副標 */}
          {product.subtitle && (
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {product.subtitle}
            </p>
          )}

          {/* 價格 */}
          <div className="flex items-center gap-3 mb-8">
            {hasDiscount && (
              <span className="text-lg line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-2xl md:text-3xl font-bold gold-text">
              {price ? formatPrice(price) : '請選擇規格'}
            </span>
            {hasDiscount && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                優惠價
              </span>
            )}
          </div>

          {/* 分隔線 */}
          <div className="mb-6" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }} />

          {/* 變體選擇器 */}
          {options.length > 0 && (
            <div className="mb-6">
              <VariantSelector
                options={options}
                selectedOptions={selectedOptions}
                onSelect={handleOptionSelect}
              />
            </div>
          )}

          {/* 數量 */}
          <div className="mb-8">
            <label className="block text-sm mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
              數量
            </label>
            <QuantitySelector quantity={quantity} onChange={setQuantity} />
          </div>

          {/* 加入購物車 */}
          <button
            onClick={handleAddToCart}
            disabled={!canAdd || isAdding}
            className="w-full py-4 rounded-full text-base font-semibold tracking-wider transition-all duration-300"
            style={{
              background: !canAdd
                ? 'rgba(255,255,255,0.1)'
                : addedFeedback
                  ? '#06C755'
                  : 'linear-gradient(135deg, #D4AF37, #B8962E)',
              color: !canAdd ? 'rgba(255,255,255,0.3)' : addedFeedback ? '#fff' : '#000',
              cursor: canAdd && !isAdding ? 'pointer' : 'not-allowed',
              boxShadow: canAdd && !addedFeedback ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
            }}
          >
            {isAdding ? '加入中...' : addedFeedback ? '✓ 已加入購物車' : !canAdd ? '請選擇規格' : '加入購物車'}
          </button>

          {/* 免運提示 */}
          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            🚛 滿 {formatPrice(config.shipping.freeShippingThreshold)} 免運費
          </p>

          {/* 分隔線 */}
          <div className="my-8" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }} />

          {/* 商品說明 */}
          {product.description && (
            <div>
              <h3 className="text-sm font-medium tracking-wider mb-4"
                style={{ color: 'rgba(212,175,55,0.7)' }}>
                商品說明
              </h3>
              <div
                className="text-sm leading-loose prose-invert"
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
