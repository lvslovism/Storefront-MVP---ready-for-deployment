# Storefront 商品排序合併邏輯修復 — Claude Code 指令

> 日期：2026-02-16
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`

---

## 問題

1. **商品消失**：`/products` 頁面只顯示部分商品，其餘商品不見了
2. **排序未生效**：CMS 設定的排序沒有反映在前台

## 根因推測

合併邏輯可能有 bug：只顯示了 `cms_product_sort_order` 表裡有紀錄的商品，沒有排序設定的商品被過濾掉了。正確行為是：有排序的商品排前面，沒排序的商品接在後面（全部都要顯示）。

---

## Step 1：確認問題位置

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 找 products 頁面
find app -path "*/products/page.tsx" | head -5

# 看排序合併邏輯
grep -n -A 30 "sortOrder\|sort_order\|sortMap\|getProductSortOrder\|sorted\|unsorted" app/\(website\)/products/page.tsx
```

## Step 2：檢查 lib/cms.ts 的查詢

```bash
grep -n -A 20 "getProductSortOrder" lib/cms.ts
```

確認：
- 查詢 `cms_product_sort_order` 表
- 用的是 anon key（RLS 允許 anon SELECT）
- 回傳 `product_id`, `sort_order`, `is_pinned`

## Step 3：修復合併邏輯

找到 `/products` 頁面中的排序合併程式碼，確保邏輯如下：

```typescript
import { getProductSortOrder } from '@/lib/cms';

// 平行取得商品和排序
const [productsResult, sortOrder] = await Promise.all([
  getProducts({ limit: 100 }),
  getProductSortOrder(),
]);

const { products: allProducts } = productsResult;

// 合併排序 — 所有商品都要顯示
let sortedProducts = [...allProducts]; // 預設：全部商品，Medusa 預設順序

if (sortOrder && sortOrder.length > 0) {
  // 建立排序 map：product_id → { sort_order, is_pinned }
  const sortMap = new Map(
    sortOrder.map(s => [s.product_id, { sort_order: s.sort_order, is_pinned: s.is_pinned }])
  );
  
  // 分成兩組：有排序設定的 + 沒有排序設定的
  const withSort: typeof allProducts = [];
  const withoutSort: typeof allProducts = [];
  
  for (const product of allProducts) {
    if (sortMap.has(product.id)) {
      withSort.push(product);
    } else {
      withoutSort.push(product);
    }
  }
  
  // 有排序的按 sort_order 排列（置頂優先）
  withSort.sort((a, b) => {
    const sa = sortMap.get(a.id)!;
    const sb = sortMap.get(b.id)!;
    // 置頂商品永遠在最前面
    if (sa.is_pinned && !sb.is_pinned) return -1;
    if (!sa.is_pinned && sb.is_pinned) return 1;
    // 同為置頂或同為非置頂，按 sort_order
    return sa.sort_order - sb.sort_order;
  });
  
  // 合併：有排序的在前 + 沒排序的在後
  sortedProducts = [...withSort, ...withoutSort];
}

// 後續渲染用 sortedProducts
```

**關鍵要點：**
- `allProducts` 是從 Medusa 取得的所有商品（不能過濾掉任何一個）
- `sortOrder` 為空時，直接用 Medusa 預設順序（不影響任何東西）
- `withoutSort` 保留 Medusa 預設順序（不排序）
- 最終 `sortedProducts` 長度必須等於 `allProducts` 長度

**常見錯誤（確認不要犯）：**
- ❌ `sortedProducts = withSort;` → 只顯示有排序的商品
- ❌ `allProducts.filter(p => sortMap.has(p.id))` → 過濾掉沒排序的
- ❌ 忘記 fallback 當 sortOrder 為空時
- ✅ `sortedProducts = [...withSort, ...withoutSort];` → 全部顯示

## Step 4：確認 getProducts 取得所有商品

```bash
grep -n -A 10 "getProducts\|fetchProducts\|/store/products" lib/medusa.ts lib/data.ts lib/products.ts 2>/dev/null | head -30
```

確認 `getProducts({ limit: 100 })` 確實回傳所有商品（limit 夠大，目前 19 個商品）。

如果用的是不同的函式名稱或 import 路徑，照現有程式碼的方式調整。

## Step 5：加 debug log（暫時）

在合併邏輯前後加 console.log，方便驗證：

```typescript
console.log('[Products] Total from Medusa:', allProducts.length);
console.log('[Products] Sort order entries:', sortOrder.length);
console.log('[Products] With sort:', withSort.length, 'Without sort:', withoutSort.length);
console.log('[Products] Final count:', sortedProducts.length);
```

## Step 6：Build

```bash
npm run build
```

Build 成功才結束。失敗就修，最多 3 次。

完成後在終端輸出修改摘要。
