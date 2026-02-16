# Storefront 首頁「更多商品」區塊 — Claude Code 指令

> 日期：2026-02-16
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`

---

## 需求

在首頁「嚴選商品」區塊下方，新增一個區塊顯示**其餘商品**（排除已在嚴選商品中的），排序按 `cms_product_sort_order` 設定。

---

## Step 1：了解現有首頁結構

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 找首頁
cat app/\(website\)/page.tsx 2>/dev/null | head -80

# 找嚴選商品元件
grep -rn "FeaturedProducts\|featured.*product\|嚴選\|精選" app/\(website\)/page.tsx components/ --include="*.tsx" -l | head -10

# 找 cms_featured_products 查詢
grep -rn "featured_products\|getFeatured" lib/cms.ts | head -10
```

## Step 2：確認 getProductSortOrder 已存在

```bash
grep -n "getProductSortOrder" lib/cms.ts
```

這個函式在前一次修改已加入，確認存在。

## Step 3：修改首頁 page.tsx

在首頁 `app/(website)/page.tsx` 中，找到「嚴選商品」區塊的位置。在它**下面**新增「更多商品」區塊。

### 資料取得

在首頁的 Server Component 資料取得部分，新增：

```typescript
import { getProductSortOrder } from '@/lib/cms';

// 在現有的資料取得中加入（跟其他 Promise.all 一起）
// 需要取得：1) 全部商品  2) 嚴選商品 ID 列表  3) CMS 排序
```

找到現有取得商品的方式（可能是 `getProducts` 或 `listProducts` 等），加入排序查詢：

```typescript
const [sortOrder] = await Promise.all([
  getProductSortOrder(),
  // ... 其他已有的查詢
]);
```

### 計算「其餘商品」

```typescript
// featuredProductIds = 嚴選商品的 product ID 列表（從現有的 FeaturedProducts 元件的資料來源取得）
// allProducts = Medusa 全部商品

// 排除嚴選商品
const remainingProducts = allProducts.filter(
  p => !featuredProductIds.includes(p.id)
);

// 套用 CMS 排序
let sortedRemaining = [...remainingProducts];
if (sortOrder && sortOrder.length > 0) {
  const sortMap = new Map(
    sortOrder.map(s => [s.product_id, { sort_order: s.sort_order, is_pinned: s.is_pinned }])
  );
  
  const withSort = sortedRemaining.filter(p => sortMap.has(p.id));
  const withoutSort = sortedRemaining.filter(p => !sortMap.has(p.id));
  
  withSort.sort((a, b) => {
    const sa = sortMap.get(a.id)!;
    const sb = sortMap.get(b.id)!;
    if (sa.is_pinned && !sb.is_pinned) return -1;
    if (!sa.is_pinned && sb.is_pinned) return 1;
    return sa.sort_order - sb.sort_order;
  });
  
  sortedRemaining = [...withSort, ...withoutSort];
}
```

### 渲染「更多商品」區塊

在嚴選商品區塊後面加：

```tsx
{/* 更多商品 */}
{sortedRemaining.length > 0 && (
  <section className="max-w-7xl mx-auto px-5 py-16">
    {/* 標題 — 跟「嚴選商品」同樣的設計風格 */}
    <div className="text-center mb-10">
      <p className="text-xs tracking-[4px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
        ─── MORE PRODUCTS ───
      </p>
      <h2 className="text-2xl font-light tracking-[2px] gold-text">
        更多商品
      </h2>
    </div>
    
    {/* 商品網格 — 跟商品列表頁一樣的 ProductCard */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {sortedRemaining.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  </section>
)}
```

**注意：**
- 使用跟現有頁面一樣的 `ProductCard` 元件（確認 import 路徑）
- 標題風格跟「嚴選商品」的 SectionTitle 一致（確認現有元件的用法）
- 如果有現成的 `SectionTitle` 元件，直接用它而非手寫

### 確認 ProductCard import

```bash
grep -rn "ProductCard\|product.*card" components/ --include="*.tsx" -l | head -5
grep -rn "import.*ProductCard" app/ --include="*.tsx" | head -5
```

如果 ProductCard 已存在就直接 import。如果不存在，確認現有的商品卡片元件叫什麼名字，使用同一個。

## Step 4：處理嚴選商品 ID 的取得方式

需要知道哪些商品已經在「嚴選商品」區了。有兩種方式：

**方式 A：從 cms_featured_products 表讀取**

```bash
grep -n "cms_featured_products\|getFeatured" lib/cms.ts | head -10
```

如果 `lib/cms.ts` 有 `getFeaturedProducts()` 之類的函式，它應該回傳含 `product_id` 的列表。

**方式 B：從 FeaturedProducts 元件的 props 推斷**

看現有的 FeaturedProducts 元件接收什麼 props，從中提取 product_id 列表。

不管哪種方式，最終需要一個 `featuredProductIds: string[]` 來做 filter。

如果找不到現成的方式取得嚴選商品 ID，在 `lib/cms.ts` 新增：

```typescript
export async function getFeaturedProductIds(
  placement: string = 'home_featured', 
  merchantCode: string = 'minjie'
): Promise<string[]> {
  const { data } = await supabase
    .from('cms_featured_products')
    .select('product_id')
    .eq('merchant_code', merchantCode)
    .eq('placement', placement);
  return (data || []).map(d => d.product_id);
}
```

## Step 5：取得全部商品

如果首頁目前沒有取全部商品的邏輯，需要加入。確認現有的 Medusa 商品查詢函式：

```bash
grep -rn "export.*function.*getProducts\|export.*function.*listProducts\|export.*function.*fetchProducts" lib/ --include="*.ts" | head -10
```

用現有函式取得全部商品。如果沒有，直接用 Medusa Store API：

```typescript
import { getProducts } from '@/lib/medusa'; // 或現有的 import 路徑

const { products: allProducts } = await getProducts({ limit: 100 });
```

確認帶上 publishable key 或 sales channel 參數（跟 /products 頁面一樣的方式）。

## Step 6：Build

```bash
npm run build
```

Build 成功才結束。失敗就修，最多 3 次。

完成後在終端輸出修改摘要，包含：
- 新增/修改了哪些檔案
- 「更多商品」區塊的商品數量（19 - 嚴選商品數 = ?）
- 嚴選商品 ID 的取得方式
- Build 結果
