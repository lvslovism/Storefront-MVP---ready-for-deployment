# Pre-Launch Blocker 修復指令

> 日期：2026-02-15
> 目的：修復上線前 3 個阻擋項目
> 執行模式：自動執行，不要停下來問我

---

## Blocker 1：庫存檢查缺失

### 問題
`ProductDetailClient.tsx` 沒有 `inventory_quantity` 檢查，庫存為 0 的商品仍可加入購物車。

### 修復要求

找到 `components/ProductDetailClient.tsx`（或實際的商品詳情頁 Client Component），做以下修改：

1. **取得庫存數量**：從 variant 中讀取 `inventory_quantity`
2. **禁用加入購物車**：當選中 variant 的 `inventory_quantity <= 0` 時：
   - 按鈕改為 disabled 狀態
   - 按鈕文字改為「暫時缺貨」
   - 按鈕樣式改為灰色（移除金色漸層）
3. **顯示庫存提示**（可選）：
   - 庫存 ≤ 5 且 > 0 時顯示「僅剩 X 件」（金色文字）
   - 庫存 = 0 時顯示「暫時缺貨」（紅色文字）
4. **防禦性檢查**：如果 `inventory_quantity` 為 `undefined` 或 `null`，視為可購買（不阻擋，因為可能是 Medusa 未設定庫存的情況）

### 參考 code pattern

```tsx
// 從 variant 取庫存
const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
const inventory = selectedVariant?.inventory_quantity;
const isOutOfStock = inventory !== undefined && inventory !== null && inventory <= 0;
const isLowStock = inventory !== undefined && inventory !== null && inventory > 0 && inventory <= 5;

// 按鈕
<button
  onClick={handleAddToCart}
  disabled={isOutOfStock || isAddingToCart}
  className={isOutOfStock ? "opacity-50 cursor-not-allowed bg-gray-600" : "bg-gradient-to-r from-[#D4AF37] to-[#B8962E]"}
>
  {isOutOfStock ? "暫時缺貨" : isAddingToCart ? "加入中..." : "加入購物車"}
</button>

// 庫存提示（按鈕下方或上方）
{isOutOfStock && <p className="text-red-400 text-sm mt-2">此商品目前缺貨</p>}
{isLowStock && <p className="text-[#D4AF37] text-sm mt-2">僅剩 {inventory} 件，把握機會！</p>}
```

### 驗證
- 確認改完後 `npm run build` 不報錯
- 如果有 TypeScript 型別問題，一併修復

---

## Blocker 2：Logo 圖片（需人工提供素材）

### 問題
`config/store.json` 的 logo 欄位為空字串，`public/tenant/` 目錄不存在。

### 你能做的
1. 建立 `public/tenant/` 目錄
2. 檢查 `config/store.json` 的 logo 欄位，確認引用路徑格式
3. 檢查 `components/website/Header.tsx` 中 Logo 的渲染邏輯
4. 如果 Header 中有 fallback 邏輯（logo 為空時顯示文字品牌名），確認 fallback 正常運作
5. 如果沒有 fallback，加一個：logo 為空時顯示 `MINJIE STUDIO` 文字（字型 letter-spacing: 3px，金色）

### 修復 Header fallback

```tsx
// 在 Header.tsx 的 Logo 區域
{store.logo ? (
  <Image src={store.logo} alt={store.name} width={120} height={40} />
) : (
  <span className="text-[#D4AF37] text-lg font-light tracking-[3px] uppercase">
    {store.name || 'MINJIE STUDIO'}
  </span>
)}
```

### 備註
Logo 圖片檔由商家提供，後續手動放入 `public/tenant/logo.png` 並更新 `config/store.json`。

---

## Blocker 3：環境變數缺失（需人工設定）

### 問題
`.env.local` 缺少 `REVALIDATE_SECRET` 和 `NEXT_PUBLIC_LIFF_ID`。

### 你能做的
1. 檢查 `.env.example` 是否已列出這兩個變數，沒有就補上
2. 檢查程式碼中使用這兩個變數的地方，確認缺失時有 graceful fallback（不會 crash）

```bash
# 搜尋 REVALIDATE_SECRET 的使用位置
grep -rn "REVALIDATE_SECRET" app/ lib/ --include="*.ts" --include="*.tsx"

# 搜尋 LIFF_ID 的使用位置
grep -rn "LIFF_ID" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

3. 在 `app/api/revalidate/route.ts` 確認：如果 `REVALIDATE_SECRET` 未設定，API 應回傳 500 並記錄錯誤（不要讓任何人不需 secret 就能觸發 revalidation）
4. 在 `.env.example` 補上註解：

```env
# ISR Revalidation（CMS 修改後觸發前端更新，自訂隨機字串，需與 CMS 端一致）
REVALIDATE_SECRET=

# LINE LIFF App ID（從 LINE Developers Console 取得）
NEXT_PUBLIC_LIFF_ID=
```

---

## 額外：🟡 建議修復項目

如果時間允許，順便處理這些：

### A. 確認 Sitemap 和 robots.txt

```bash
ls -la app/sitemap.ts public/sitemap.xml app/robots.ts public/robots.txt 2>/dev/null
```

如果都不存在，建立基礎版：

**app/robots.ts：**
```ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/checkout/', '/liff/'],
    },
    sitemap: 'https://shop.minjie0326.com/sitemap.xml',
  }
}
```

**app/sitemap.ts：**
```ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://shop.minjie0326.com'
  
  // 靜態頁面
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ]
  
  // 動態商品頁（從 Medusa 取）
  try {
    const res = await fetch(`${process.env.MEDUSA_BACKEND_URL}/store/products?limit=100`, {
      headers: { 'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '' },
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data = await res.json()
      const productPages = (data.products || []).map((p: any) => ({
        url: `${baseUrl}/products/${p.handle}`,
        lastModified: new Date(p.updated_at || p.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
      return [...staticPages, ...productPages]
    }
  } catch (e) {
    console.error('Sitemap: Failed to fetch products', e)
  }
  
  return staticPages
}
```

### B. 確認 OG Metadata

檢查 `app/layout.tsx` 或 `app/(website)/layout.tsx` 是否有設定 openGraph metadata。如果沒有，補上：

```ts
export const metadata: Metadata = {
  title: 'MINJIE STUDIO | 專業美容保健品牌',
  description: 'MINJIE STUDIO 提供高品質美容保健產品，專為 25-40 歲專業人士打造。',
  openGraph: {
    title: 'MINJIE STUDIO | 專業美容保健品牌',
    description: 'MINJIE STUDIO 提供高品質美容保健產品',
    url: 'https://shop.minjie0326.com',
    siteName: 'MINJIE STUDIO',
    locale: 'zh_TW',
    type: 'website',
  },
}
```

---

## 完成後

全部改完後：
1. 執行 `npm run build` 確認無錯誤
2. 列出所有修改的檔案
3. 簡述每個修改的內容

不要 commit，等我確認後再 commit。
