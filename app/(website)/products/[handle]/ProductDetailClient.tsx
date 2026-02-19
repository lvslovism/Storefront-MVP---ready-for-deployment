'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageGallery from '@/components/website/ImageGallery';
import VariantSelector from '@/components/website/VariantSelector';
import QuantitySelector from '@/components/website/QuantitySelector';
import { useCart } from '@/components/CartProvider';
import { formatPrice, config } from '@/lib/config';
import { trackViewItem, trackAddToCart } from '@/lib/analytics';

interface ProductDetailClientProps {
  product: any;
}

// 處理描述文字：換行 + 關鍵字高亮
function formatDescription(text: string): string {
  if (!text) return '';

  // 關鍵字列表（會加粗 + 金色）
  const keywords = [
    '主要成分', '成分', '沖泡方式', '使用方式', '食用方式',
    '規格', '容量', '保存方式', '注意事項', '適用對象',
    '產地', '有效期限', '建議', '特色', '功效'
  ];

  // 將 \n 轉換為 <br/>，並處理關鍵字
  let formatted = text
    .split('\n')
    .map(line => {
      // 檢查是否有關鍵字開頭
      for (const keyword of keywords) {
        if (line.includes(keyword + '：') || line.includes(keyword + ':')) {
          // 將關鍵字包在 span 中
          return line.replace(
            new RegExp(`(${keyword}[：:])`, 'g'),
            '<span class="keyword-highlight">$1</span>'
          );
        }
      }
      return line;
    })
    .join('<br/>');

  return formatted;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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

  // 庫存判斷
  const currentVariant = selectedVariant || (product.variants?.length === 1 ? product.variants[0] : null);
  const inventoryQty = currentVariant?.inventory_quantity;
  const isOutOfStock = inventoryQty !== undefined && inventoryQty !== null && inventoryQty <= 0;
  const isLowStock = inventoryQty !== undefined && inventoryQty !== null && inventoryQty > 0 && inventoryQty <= 5;

  // 是否可加入購物車（需選擇規格 + 有庫存）
  const canAdd = (product.variants?.length === 1 || selectedVariant !== null) && !isOutOfStock;

  // ── GA4 + Pixel: view_item ──
  useEffect(() => {
    const variant = product.variants?.[0];
    const p = variant?.calculated_price?.calculated_amount;
    if (p) {
      trackViewItem({
        item_id: product.handle || product.id,
        item_name: product.title || '',
        price: Math.round(p),
        quantity: 1,
      });
    }
  }, [product]);

  // 處理選項變更
  const handleOptionSelect = (optionId: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionId]: value }));
  };

  // 加入購物車
  const handleAddToCart = async () => {
    if (!canAdd || isAdding) return;

    const variant = selectedVariant || product.variants?.[0];
    if (!variant) return;

    try {
      setIsAdding(true);
      await addItem(variant.id, quantity);

      // ── GA4 + Pixel: add_to_cart ──
      const unitPrice = variant.calculated_price?.calculated_amount;
      if (unitPrice) {
        trackAddToCart({
          item_id: variant.id,
          item_name: product.title || '',
          price: Math.round(unitPrice),
          quantity,
        });
      }

      // 回饋動畫
      setAddedFeedback(true);
      setShowToast(true);

      setTimeout(() => setAddedFeedback(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('加入購物車失敗:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // 立即購買
  const handleBuyNow = async () => {
    if (!canAdd || isAdding) return;

    const variant = selectedVariant || product.variants?.[0];
    if (!variant) return;

    try {
      setIsAdding(true);
      await addItem(variant.id, quantity);
      router.push('/checkout');
    } catch (error) {
      console.error('加入購物車失敗:', error);
      setIsAdding(false);
    }
  };

  // 處理描述
  const formattedDescription = useMemo(() => {
    return formatDescription(product.description || '');
  }, [product.description]);

  // 判斷描述是否過長（超過 150 字）
  const descriptionIsLong = (product.description?.length || 0) > 150;

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 pb-32 md:pb-8">
      {/* Toast 提示 */}
      {showToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl flex items-center gap-4 animate-fade-in"
          style={{
            background: 'rgba(0,0,0,0.95)',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ color: '#06C755' }}>✓ 已加入購物車</span>
          <Link
            href="/checkout"
            className="font-medium transition-colors"
            style={{ color: '#D4AF37' }}
          >
            前往結帳 →
          </Link>
        </div>
      )}

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

          {/* 庫存狀態提示 */}
          {isOutOfStock && (
            <p className="text-sm mb-4 text-red-400">此商品目前缺貨</p>
          )}
          {isLowStock && (
            <p className="text-sm mb-4" style={{ color: '#D4AF37' }}>僅剩 {inventoryQty} 件</p>
          )}

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

          {/* 桌面版按鈕區 - 手機版隱藏 */}
          <div className="hidden md:block space-y-3">
            {/* 加入購物車 */}
            <button
              onClick={handleAddToCart}
              disabled={!canAdd || isAdding}
              className={`w-full py-4 rounded-full text-base font-semibold tracking-wider transition-all duration-300 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                background: isOutOfStock
                  ? 'rgba(255,255,255,0.1)'
                  : !canAdd
                    ? 'rgba(255,255,255,0.1)'
                    : addedFeedback
                      ? '#06C755'
                      : 'linear-gradient(135deg, #D4AF37, #B8962E)',
                color: isOutOfStock || !canAdd ? 'rgba(255,255,255,0.3)' : addedFeedback ? '#fff' : '#000',
                cursor: canAdd && !isAdding ? 'pointer' : 'not-allowed',
                boxShadow: canAdd && !addedFeedback ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
              }}
            >
              {isOutOfStock ? '暫時缺貨' : isAdding ? '加入中...' : addedFeedback ? '✓ 已加入購物車' : !canAdd ? '請選擇規格' : '加入購物車'}
            </button>

            {/* 立即購買 */}
            <button
              onClick={handleBuyNow}
              disabled={!canAdd || isAdding}
              className={`w-full py-4 rounded-full text-base font-semibold tracking-wider transition-all duration-300 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,175,55,0.5)',
                color: !canAdd ? 'rgba(255,255,255,0.3)' : '#D4AF37',
                cursor: canAdd && !isAdding ? 'pointer' : 'not-allowed',
              }}
            >
              {isOutOfStock ? '暫時缺貨' : isAdding ? '處理中...' : '立即購買'}
            </button>
          </div>

          {/* 免運提示 */}
          <p className="text-center text-xs mt-4 hidden md:block" style={{ color: 'rgba(255,255,255,0.4)' }}>
            🚛 滿 {formatPrice(config.shipping.freeShippingThreshold)} 免運費
          </p>

          {/* 分隔線 */}
          <div className="my-8" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }} />

          {/* 商品說明 - 可折疊 */}
          {product.description && (
            <div>
              <h3 className="text-sm font-medium tracking-wider mb-4"
                style={{ color: 'rgba(212,175,55,0.7)' }}>
                商品說明
              </h3>
              <div className="relative">
                <div
                  className={`text-sm leading-loose overflow-hidden transition-all duration-300 ${
                    !descriptionExpanded && descriptionIsLong ? 'max-h-36' : 'max-h-[2000px]'
                  }`}
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: formattedDescription }}
                    className="description-content"
                  />
                </div>

                {/* 漸層遮罩 + 查看更多按鈕 */}
                {descriptionIsLong && !descriptionExpanded && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-20 flex items-end justify-center pb-2"
                    style={{
                      background: 'linear-gradient(to bottom, transparent, rgba(10,10,10,0.9) 50%, rgba(10,10,10,1))',
                    }}
                  >
                    <button
                      onClick={() => setDescriptionExpanded(true)}
                      className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
                      style={{
                        color: '#D4AF37',
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid rgba(212,175,55,0.2)',
                      }}
                    >
                      查看更多 ↓
                    </button>
                  </div>
                )}

                {/* 收起按鈕 */}
                {descriptionIsLong && descriptionExpanded && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setDescriptionExpanded(false)}
                      className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
                      style={{
                        color: '#D4AF37',
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid rgba(212,175,55,0.2)',
                      }}
                    >
                      收起 ↑
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 手機版底部 sticky 購物欄 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        <div className="px-4 py-3">
          {/* 價格 + 免運提示 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gold-text">
                {price ? formatPrice(price) : '請選擇規格'}
              </span>
              {hasDiscount && (
                <span className="text-sm line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              🚛 滿 {formatPrice(config.shipping.freeShippingThreshold)} 免運
            </span>
          </div>

          {/* 按鈕組 */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!canAdd || isAdding}
              className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all ${isOutOfStock ? 'opacity-50' : ''}`}
              style={{
                background: isOutOfStock
                  ? 'rgba(255,255,255,0.1)'
                  : !canAdd
                    ? 'rgba(255,255,255,0.1)'
                    : addedFeedback
                      ? '#06C755'
                      : 'linear-gradient(135deg, #D4AF37, #B8962E)',
                color: isOutOfStock || !canAdd ? 'rgba(255,255,255,0.3)' : addedFeedback ? '#fff' : '#000',
              }}
            >
              {isOutOfStock ? '暫時缺貨' : isAdding ? '...' : addedFeedback ? '✓ 已加入' : !canAdd ? '請選規格' : '加入購物車'}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={!canAdd || isAdding}
              className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all ${isOutOfStock ? 'opacity-50' : ''}`}
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,175,55,0.5)',
                color: !canAdd ? 'rgba(255,255,255,0.3)' : '#D4AF37',
              }}
            >
              {isOutOfStock ? '缺貨' : '立即購買'}
            </button>
          </div>
        </div>
      </div>

      {/* 描述關鍵字高亮樣式 */}
      <style jsx global>{`
        .description-content .keyword-highlight {
          color: #D4AF37;
          font-weight: 500;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
