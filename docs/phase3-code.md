# Phase 3：商品列表篩選 + 商品詳情頁升級

## 修改範圍

| 檔案 | 動作 | 說明 |
|------|------|------|
| `app/(website)/products/page.tsx` | **替換** | 加入分類篩選標籤 + 排序 |
| `app/(website)/products/[handle]/page.tsx` | **替換** | 圖片輪播 + 變體選擇器 + 黑金風格 |
| `components/website/ProductFilter.tsx` | **新增** | 分類篩選 + 排序元件 |
| `components/website/ImageGallery.tsx` | **新增** | 圖片輪播元件 |
| `components/website/VariantSelector.tsx` | **新增** | 變體選擇器元件 |
| `components/website/QuantitySelector.tsx` | **新增** | 數量選擇器元件 |
| `lib/medusa.ts` | **追加** | 加 getProductByHandle、getCollectionProducts 函數 |

---

## 檔案 1：`components/website/ProductFilter.tsx`（新增）

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Collection {
  id: string;
  title: string;
  handle: string;
}

interface ProductFilterProps {
  collections: Collection[];
}

export default function ProductFilter({ collections }: ProductFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCollection = searchParams.get('collection') || '';
  const currentSort = searchParams.get('sort') || '';

  const handleCollectionChange = (handle: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (handle) {
      params.set('collection', handle);
    } else {
      params.delete('collection');
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort) {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }
    router.push(`/products?${params.toString()}`);
  };

  // 排除「全系列商品」
  const displayCollections = collections.filter(c => c.handle !== 'all-product');

  return (
    <div className="mb-10">
      {/* 分類標籤 */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button
          onClick={() => handleCollectionChange('')}
          className="px-5 py-2 rounded-full text-sm transition-all duration-300"
          style={{
            background: !currentCollection ? '#D4AF37' : 'transparent',
            color: !currentCollection ? '#000' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${!currentCollection ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
            fontWeight: !currentCollection ? 600 : 400,
          }}
        >
          全部商品
        </button>
        {displayCollections.map((col) => (
          <button
            key={col.id}
            onClick={() => handleCollectionChange(col.handle)}
            className="px-5 py-2 rounded-full text-sm transition-all duration-300"
            style={{
              background: currentCollection === col.handle ? '#D4AF37' : 'transparent',
              color: currentCollection === col.handle ? '#000' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${currentCollection === col.handle ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
              fontWeight: currentCollection === col.handle ? 600 : 400,
            }}
          >
            {col.title}
          </button>
        ))}
      </div>

      {/* 排序 */}
      <div className="flex justify-end">
        <select
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="text-sm px-4 py-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: '#111',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(212,175,55,0.2)',
            outline: 'none',
          }}
        >
          <option value="">預設排序</option>
          <option value="price_asc">價格：低 → 高</option>
          <option value="price_desc">價格：高 → 低</option>
          <option value="newest">最新上架</option>
        </select>
      </div>
    </div>
  );
}
```

---

## 檔案 2：`components/website/ImageGallery.tsx`（新增）

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
  images: Array<{ id: string; url: string }>;
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl flex items-center justify-center"
        style={{ background: '#111', border: '1px solid rgba(212,175,55,0.1)' }}>
        <div className="text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-sm">無圖片</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 主圖 */}
      <div className="aspect-square relative rounded-2xl overflow-hidden mb-4"
        style={{ background: '#111', border: '1px solid rgba(212,175,55,0.1)' }}>
        <Image
          src={images[selectedIndex].url}
          alt={`${title} - ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={selectedIndex === 0}
        />
      </div>

      {/* 縮圖列表 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(i)}
              className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden relative transition-all duration-200"
              style={{
                border: `2px solid ${i === selectedIndex ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.15)'}`,
                opacity: i === selectedIndex ? 1 : 0.6,
              }}
            >
              <Image
                src={img.url}
                alt={`${title} 縮圖 ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 檔案 3：`components/website/VariantSelector.tsx`（新增）

```tsx
'use client';

interface Option {
  id: string;
  title: string;
  values: Array<{ id: string; value: string }>;
}

interface VariantSelectorProps {
  options: Option[];
  selectedOptions: Record<string, string>;
  onSelect: (optionId: string, value: string) => void;
}

export default function VariantSelector({ options, selectedOptions, onSelect }: VariantSelectorProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="space-y-5">
      {options.map((option) => (
        <div key={option.id}>
          <label className="block text-sm mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {option.title}
          </label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((val) => {
              const isSelected = selectedOptions[option.id] === val.value;
              return (
                <button
                  key={val.id}
                  onClick={() => onSelect(option.id, val.value)}
                  className="px-5 py-2.5 rounded-lg text-sm transition-all duration-200"
                  style={{
                    background: isSelected ? '#D4AF37' : 'transparent',
                    color: isSelected ? '#000' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isSelected ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {val.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 檔案 4：`components/website/QuantitySelector.tsx`（新增）

```tsx
'use client';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({ quantity, onChange, min = 1, max = 99 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-200"
        style={{
          border: '1px solid rgba(212,175,55,0.3)',
          color: quantity <= min ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
          cursor: quantity <= min ? 'not-allowed' : 'pointer',
        }}
      >
        −
      </button>
      <span className="w-12 text-center text-base font-medium"
        style={{ color: 'rgba(255,255,255,0.9)' }}>
        {quantity}
      </span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-200"
        style={{
          border: '1px solid rgba(212,175,55,0.3)',
          color: quantity >= max ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
          cursor: quantity >= max ? 'not-allowed' : 'pointer',
        }}
      >
        +
      </button>
    </div>
  );
}
```

---

## 檔案 5：`app/(website)/products/page.tsx`（替換）

```tsx
import { Suspense } from 'react';
import { getProducts, getCollections } from '@/lib/medusa';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';
import ProductFilter from '@/components/website/ProductFilter';
import AnimatedSection from '@/components/website/AnimatedSection';

export const revalidate = 3600;

export const metadata = {
  title: '全部商品',
  description: 'MINJIE STUDIO 全系列健康食品，益生菌、膠原蛋白、酵素、葉黃素等嚴選商品。',
};

// 根據價格取得最低價
function getLowestPrice(product: any): number {
  const prices = product.variants
    ?.map((v: any) => v.calculated_price?.calculated_amount)
    .filter((p: any) => p != null) || [];
  return prices.length > 0 ? Math.min(...prices) : 0;
}

// 排序商品
function sortProducts(products: any[], sort: string) {
  switch (sort) {
    case 'price_asc':
      return [...products].sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
    case 'price_desc':
      return [...products].sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
    case 'newest':
      return [...products].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    default:
      return products;
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { collection?: string; sort?: string };
}) {
  const [{ products }, { collections }] = await Promise.all([
    getProducts({ limit: 100 }),
    getCollections(),
  ]);

  // 篩選：根據 collection handle 篩選
  let filtered = products;
  if (searchParams.collection) {
    const targetCollection = collections.find(
      (c: any) => c.handle === searchParams.collection
    );
    if (targetCollection) {
      filtered = products.filter(
        (p: any) => p.collection_id === targetCollection.id
      );
    }
  }

  // 排序
  const sorted = sortProducts(filtered, searchParams.sort || '');

  // 目前分類名稱
  const currentCollectionTitle = searchParams.collection
    ? collections.find((c: any) => c.handle === searchParams.collection)?.title
    : null;

  return (
    <section className="max-w-7xl mx-auto px-5 py-16">
      <AnimatedSection>
        <SectionTitle
          subtitle={currentCollectionTitle ? currentCollectionTitle.toUpperCase() : 'ALL PRODUCTS'}
          title={currentCollectionTitle || '全部商品'}
        />
      </AnimatedSection>

      <Suspense fallback={null}>
        <ProductFilter collections={collections} />
      </Suspense>

      {/* 商品數量 */}
      <div className="text-right mb-4">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          共 {sorted.length} 個商品
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4 opacity-30">🔍</div>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>
            此分類目前沒有商品
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {sorted.map((product: any, i: number) => (
            <AnimatedSection key={product.id} delay={i * 60}>
              <ProductCard product={product} />
            </AnimatedSection>
          ))}
        </div>
      )}
    </section>
  );
}
```

---

## 檔案 6：`app/(website)/products/[handle]/page.tsx`（替換）

```tsx
import { getProducts } from '@/lib/medusa';
import ProductDetailClient from './ProductDetailClient';
import type { Metadata } from 'next';

export const revalidate = 3600;

// 預生成所有商品頁
export async function generateStaticParams() {
  const { products } = await getProducts({ limit: 100 });
  return products.map((p: any) => ({ handle: p.handle }));
}

// 動態 meta
export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const { products } = await getProducts({ limit: 100 });
  const product = products.find((p: any) => p.handle === params.handle);

  if (!product) {
    return { title: '商品不存在' };
  }

  return {
    title: product.title,
    description: product.subtitle || product.description?.slice(0, 160),
    openGraph: {
      title: `${product.title} | MINJIE STUDIO`,
      description: product.subtitle || '',
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const { products } = await getProducts({ limit: 100 });
  const product = products.find((p: any) => p.handle === params.handle);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">😕</div>
          <h1 className="text-xl mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            找不到此商品
          </h1>
          <a href="/products" className="btn-gold-outline text-sm mt-4 inline-block">
            ← 回商品列表
          </a>
        </div>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}
```

---

## 檔案 7：`app/(website)/products/[handle]/ProductDetailClient.tsx`（新增）

```tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ImageGallery from '@/components/website/ImageGallery';
import VariantSelector from '@/components/website/VariantSelector';
import QuantitySelector from '@/components/website/QuantitySelector';
import { useCart } from '@/components/CartProvider';
import { formatPrice } from '@/lib/config';

interface ProductDetailClientProps {
  product: any;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [addedFeedback, setAddedFeedback] = useState(false);

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

  // 加入購物車
  const handleAddToCart = () => {
    if (!canAdd) return;

    const variant = selectedVariant || product.variants?.[0];
    if (!variant) return;

    addItem({
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantTitle: variant.title || '',
      thumbnail: product.thumbnail || '',
      price: price || 0,
      quantity,
      handle: product.handle,
    });

    // 回饋動畫
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
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
            disabled={!canAdd}
            className="w-full py-4 rounded-full text-base font-semibold tracking-wider transition-all duration-300"
            style={{
              background: !canAdd
                ? 'rgba(255,255,255,0.1)'
                : addedFeedback
                  ? '#06C755'
                  : 'linear-gradient(135deg, #D4AF37, #B8962E)',
              color: !canAdd ? 'rgba(255,255,255,0.3)' : addedFeedback ? '#fff' : '#000',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              boxShadow: canAdd && !addedFeedback ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
            }}
          >
            {addedFeedback ? '✓ 已加入購物車' : !canAdd ? '請選擇規格' : '加入購物車'}
          </button>

          {/* 免運提示 */}
          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            🚛 滿 $1,000 免運費
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
```

---

## 檔案 8：`lib/medusa.ts` 追加函數

在現有的 `lib/medusa.ts` 底部追加（如果還沒有的話）：

```typescript
// 根據 handle 取得單一商品
export async function getProductByHandle(handle: string) {
  const url = `${MEDUSA_BACKEND_URL}/store/products?handle=${handle}&fields=*variants.calculated_price,+variants.inventory_quantity`;
  const res = await fetch(url, {
    headers: {
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.products?.[0] || null;
}

// 取得 collection 的商品
export async function getCollectionProducts(collectionId: string) {
  const url = `${MEDUSA_BACKEND_URL}/store/products?collection_id[]=${collectionId}&limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return { products: [] };
  return res.json();
}
```

---

## 完成後檢查清單

- [ ] `npm run dev` 無報錯
- [ ] `/products` 顯示分類篩選標籤（全部 + 6 個分類）
- [ ] 點分類標籤 → URL 變成 `?collection=xxx` → 商品篩選正確
- [ ] 排序下拉選單可用（價格排序、最新）
- [ ] 顯示「共 X 個商品」數量
- [ ] 空分類顯示「此分類目前沒有商品」
- [ ] 商品詳情頁圖片輪播正常（主圖 + 縮圖切換）
- [ ] 變體按鈕金色選中效果
- [ ] 數量 +/- 正常
- [ ] 加入購物車按鈕 → 變綠色「✓ 已加入購物車」2 秒回復
- [ ] 未選規格時按鈕灰色顯示「請選擇規格」
- [ ] 麵包屑導航正常
- [ ] 商品說明 HTML 正確渲染
- [ ] 手機版排版正常
- [ ] 推到 GitHub → Vercel 部署

## ⚠️ 注意事項

1. `ProductDetailClient.tsx` 裡的 `addItem` 函數參數格式需要和你現有的 `CartProvider` 一致。如果 CartProvider 的 addItem 簽名不同，Claude Code 需要調整。

2. `formatPrice` 從 `@/lib/config` 引入。如果你的 formatPrice 在別的位置，需要調整 import。

3. 商品列表的 `collection_id` 篩選是在前端做的（因為已經取了全部商品）。如果商品超過 100 個，需要改成 API 端篩選。
