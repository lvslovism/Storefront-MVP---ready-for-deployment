import Link from 'next/link';
import Image from 'next/image';
import { Product, getProductLowestPrice, hasDiscount } from '@/lib/medusa';
import { formatPrice } from '@/lib/config';
import type { PriceDisplayInfo } from '@/lib/price-display';

interface ProductCardProps {
  product: Product;
  priceDisplay?: PriceDisplayInfo;  // CMS 促銷展示價格（optional，不傳時行為不變）
}

export default function ProductCard({ product, priceDisplay }: ProductCardProps) {
  const lowestPrice = getProductLowestPrice(product);
  const firstVariant = product.variants?.[0];

  // Medusa Price List 折扣
  const medusaDiscount = firstVariant && hasDiscount(firstVariant);
  const medusaOriginalPrice = firstVariant?.calculated_price?.original_amount;

  // CMS Promotion 折扣
  const cmsDiscount = priceDisplay && priceDisplay.display_price < priceDisplay.original_price;

  // 合併判斷：任一來源有折扣就顯示
  const showDiscount = medusaDiscount || cmsDiscount;

  // 決定 badge 文字 + 原價
  let discountBadge = '特價';
  let displayOriginalPrice = medusaOriginalPrice;

  if (cmsDiscount && priceDisplay) {
    discountBadge = priceDisplay.discount_label || '特價';
    // CMS 折扣時，如果 Medusa 沒有自己的折扣，用 CMS 的原價
    if (!medusaDiscount) {
      displayOriginalPrice = priceDisplay.original_price;
    }
  }

  // 顯示價格：CMS 有折扣且 Medusa 沒有自己的 Price List 折扣時，用 CMS display_price
  const displayPrice = (cmsDiscount && !medusaDiscount && priceDisplay)
    ? priceDisplay.display_price
    : lowestPrice;

  return (
    <Link href={`/products/${product.handle}`} className="group">
      <div className="gold-card overflow-hidden">
        {/* 商品圖片 */}
        <div className="aspect-square relative bg-black overflow-hidden">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
          )}

          {/* 折扣標籤 */}
          {showDiscount && (
            <div
              className="absolute top-2 left-2 text-black text-sm px-3 py-1 rounded-full font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8962E)' }}
            >
              {discountBadge}
            </div>
          )}
        </div>

        {/* 商品資訊 */}
        <div className="p-4">
          <h3 className="font-medium text-gray-100 truncate group-hover:text-gold transition-colors">
            {product.title}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            {showDiscount && displayOriginalPrice && (
              <span className="text-gray-500 line-through text-sm">
                {formatPrice(displayOriginalPrice)}
              </span>
            )}
            <span className={`text-lg font-bold ${showDiscount ? 'text-gold' : 'text-gold'}`}>
              {formatPrice(displayPrice)}
            </span>
          </div>

          {/* 多變體提示 */}
          {product.variants?.length > 1 && (
            <p className="text-xs text-gray-500 mt-1">
              {product.variants.length} 種規格
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
