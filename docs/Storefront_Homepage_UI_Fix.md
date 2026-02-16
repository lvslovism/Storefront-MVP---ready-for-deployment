# Storefront 嚴選商品 UI 微調 — Claude Code 指令

> 日期：2026-02-16
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`

---

## 問題

1. **商品數量少時不置中**：例如「新品上市」只有 1 個商品，靠左顯示很突兀
2. **「更多商品」名稱不好**：應改為「嚴選商品」，不要用「更多商品」「其他商品」這種讓人覺得不認真的詞

---

## Step 1：找到相關檔案

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 找首頁
cat app/\(website\)/page.tsx | head -30

# 找「更多商品」的標題文字
grep -n "更多商品\|MORE PRODUCTS\|remainingProducts\|sortedRemaining" app/\(website\)/page.tsx
```

## Step 2：修改「更多商品」→「嚴選商品」

找到「更多商品」區塊的標題，修改為：

```tsx
{/* 修改前 */}
<p>─── MORE PRODUCTS ───</p>
<h2>更多商品</h2>

{/* 修改後 */}
<p>─── OUR PRODUCTS ───</p>
<h2>嚴選商品</h2>
```

如果英文 subtitle 和中文 title 的具體寫法不同，保持跟上面「嚴選商品」區塊一致的風格。

## Step 3：商品網格置中（少數商品時）

找到首頁所有商品網格（包含嚴選商品各 Tab 的網格 和 新增的「嚴選商品」剩餘區塊）。

**問題：** `grid` 佈局在商品數量少於一行時，商品靠左對齊。

**解法：** 在 grid 外面包一層 flex justify-center，或用 CSS 讓商品置中。

最簡單的做法是在商品數量少於一行的欄數時，改用 flex 佈局：

```tsx
{/* 通用方式：grid 加 place-items 或用 justify-items */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-items-center">
```

但這會讓多行時每個 item 也置中（可能不是想要的效果）。

**更好的做法 — 少量商品時用 flex：**

```tsx
{products.length <= 3 ? (
  // 少量商品：flex 置中
  <div className="flex flex-wrap justify-center gap-4 md:gap-6">
    {products.map((product) => (
      <div key={product.id} className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)]">
        <ProductCard product={product} />
      </div>
    ))}
  </div>
) : (
  // 正常數量：grid
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    {products.map((product) => (
      <ProductCard key={product.id} product={product} />
    ))}
  </div>
)}
```

**更簡潔的做法（推薦）：**

直接用 flex-wrap + justify-center，配合固定寬度的子元素：

```tsx
<div className="flex flex-wrap justify-center gap-4 md:gap-6">
  {products.map((product) => (
    <div key={product.id} className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] max-w-[300px]">
      <ProductCard product={product} />
    </div>
  ))}
</div>
```

這樣不管幾個商品都會置中，多行時也會自動折行且整體置中。

**找到所有首頁上的商品網格並統一套用這個模式。** 包括：
- 各個嚴選商品 Tab（精選推薦、新品上市、熱銷排行等）的商品網格
- 新增的「嚴選商品」剩餘區塊的商品網格

```bash
# 找所有商品網格的位置
grep -n "grid.*grid-cols\|ProductCard\|product.*card" app/\(website\)/page.tsx | head -20
```

## Step 4：Build

```bash
npm run build
```

Build 成功才結束。失敗就修，最多 3 次。

完成後在終端輸出修改摘要。
