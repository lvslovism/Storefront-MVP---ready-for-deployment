# CMS ↔ Storefront P0 串接指引

> 給 Claude Code 執行用
> 日期：2026-02-15
> Repo：`Storefront-MVP---ready-for-deployment`
> 部署：Vercel → `shop.minjie0326.com`

---

## 前置確認

執行前先確認：
1. `lib/cms.ts` 存在且有 `getAnnouncements`、`getSection`、`getAllSections` 函數
2. `components/cms/` 資料夾存在
3. `app/(website)/layout.tsx` 存在
4. `.env.local` 有 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`

如果以上任一不存在，停止並回報。

---

## 任務一：AnnouncementBar 元件

### 1.1 建立元件

建立 `components/cms/AnnouncementBar.tsx`：

**需求：**
- 從 `cms_announcements` 表讀取 `is_active = true` 且在有效期限內的公告
- 支援多則公告輪播（自動切換，間隔 5 秒）
- 支援公告類型樣式區分：`info`（金色邊框）、`promo`（金色背景黑字）、`warning`（紅色系）、`urgent`（紅色背景白字）
- 有關閉按鈕（X），關閉後該 session 不再顯示（用 state，不用 localStorage）
- 點擊公告可跳轉（如果有 `link_url`）
- 沒有公告時不渲染任何東西（return null）
- 黑金色系風格，跟現有網站一致

**資料表結構參考（cms_announcements）：**
```
id, merchant_code, title, content, announcement_type, link_url, link_text,
sort_order, is_active, valid_from, valid_until, created_at, updated_at
```

**讀取函數：** 使用 `lib/cms.ts` 中已有的 `getAnnouncements()` 函數。檢查其實作：
- 如果已經有時間過濾邏輯（valid_from / valid_until），直接用
- 如果沒有，補上過濾：只取 `is_active = true` 且 `(valid_from IS NULL OR valid_from <= now())` 且 `(valid_until IS NULL OR valid_until >= now())`

### 1.2 串接到 Layout

修改 `app/(website)/layout.tsx`：
- 在 `<Header />` 的**上方**或**下方**加入 `<AnnouncementBar />`（建議在 Header 正下方）
- AnnouncementBar 是 Server Component 包 Client Component 的模式：
  - 外層用 Server Component 取資料（`getAnnouncements()`）
  - 傳 props 給 Client Component 做輪播和關閉互動

如果 layout 整個是 Client Component（有 `'use client'`），就直接在裡面呼叫或用 useEffect fetch。視現有架構決定。

---

## 任務二：Footer 動態化

### 2.1 分析現有 Footer

先讀取現有 Footer 元件（可能在 `components/website/Footer.tsx`），找出所有 hardcoded 內容。

根據盤點，以下需要改成動態：

| 現在 hardcoded | 改讀來源 |
|---------------|---------|
| 客服連結（FAQ、配送、退換貨、隱私、條款） | `cms_sections` WHERE page='home' AND section_key='footer_info' |
| 店名、描述 | `lib/config` 已有（保留） |
| Email / 電話 / LINE / FB / IG | `merchant_settings` WHERE merchant_code='minjie' |
| Copyright `© 2026 MINJIE STUDIO` | 年份動態化 + 讀 `merchant_settings.store_name` |

### 2.2 修改方式

**Step 1：** 確認 `merchant_settings` 表有哪些社群欄位。先讀 `lib/cms.ts` 裡是否有 `getMerchantSettings()` 之類的函數：
- 有 → 直接用
- 沒有 → 新增一個：

```typescript
export async function getMerchantSettings(merchantCode: string = 'minjie') {
  const { data } = await supabase
    .from('merchant_settings')
    .select('*')
    .eq('merchant_code', merchantCode)
    .single();
  return data;
}
```

**Step 2：** 確認 `cms_sections` WHERE `section_key = 'footer_info'` 的 JSONB `content` 結構。
用這段 SQL 查：`SELECT content FROM cms_sections WHERE section_key = 'footer_info' LIMIT 1;`
如果有資料，看 JSON 結構裡有什麼欄位。如果沒資料，先用 hardcoded fallback。

**Step 3：** 修改 Footer 元件：
- Footer 應該是 Server Component（不需要互動），直接在元件裡 `await` 取資料
- 如果 Footer 所在的 layout 是 Client Component，改用 props 傳入
- 所有 hardcoded 值改成讀 DB，**但保留 fallback 值**，確保 DB 沒資料時不會壞

**Fallback 原則：**
```typescript
const storeName = merchantSettings?.store_name || 'MINJIE STUDIO';
const email = merchantSettings?.contact_email || 'minjie0326@gmail.com';
const phone = merchantSettings?.contact_phone || '0927372271';
const year = new Date().getFullYear();
// Copyright: `© ${year} ${storeName}. All rights reserved.`
```

### 2.3 footer_info 連結結構

如果 `cms_sections` 的 `footer_info` 有 content JSONB，預期結構：
```json
{
  "links": [
    { "label": "常見問題", "url": "/faq" },
    { "label": "配送說明", "url": "/shipping" },
    { "label": "退換貨政策", "url": "/return-policy" },
    { "label": "隱私權政策", "url": "/privacy" },
    { "label": "服務條款", "url": "/terms" }
  ],
  "social": {
    "line_url": "https://line.me/R/ti/p/@xxx",
    "facebook_url": "https://facebook.com/xxx",
    "instagram_url": "https://instagram.com/xxx"
  }
}
```

如果實際 content 結構不同，就按實際結構調整。如果 content 為空或不存在，保留現有 hardcoded 值作為 fallback。

---

## 任務三：Metadata 集中化

### 3.1 目標

讓各頁面的 `generateMetadata` 優先從 CMS 讀取，hardcoded 值作為 fallback。

### 3.2 建立通用 metadata 函數

在 `lib/cms.ts` 檢查是否有 `getCategorySeo()` 函數。如果有，確認它的介面。如果沒有，新增：

```typescript
export async function getPageSeo(page: string, merchantCode: string = 'minjie') {
  // 先查 cms_category_seo（如果是分類頁）
  // 再查 cms_sections WHERE section_key = 'seo' AND page = page
  // 最後 fallback
}
```

### 3.3 修改各頁面

**首頁 `app/(website)/page.tsx`：**
- 找到 `export const metadata` 或 `generateMetadata`
- 改成：先讀 `cms_sections` WHERE page='home', section_key='seo'
- Fallback：現有的 hardcoded 值

**商品列表頁 `app/(website)/products/page.tsx`：**
- 同上邏輯，page='products'

**Blog 列表頁 `app/(website)/blog/page.tsx`：**
- 同上邏輯，page='blog'

**商品詳情頁 `app/(website)/products/[handle]/page.tsx`：**
- 這頁的 metadata 從 Medusa 商品資料生成，**保持不變**（已經是動態的）

**Blog 詳情頁 `app/(website)/blog/[slug]/page.tsx`：**
- 從 `cms_posts` 讀 `seo_title`、`seo_description`、`og_image`
- 檢查現有 `generateMetadata` 是否已經這樣做，如果是就跳過

### 3.4 Fallback metadata 結構

```typescript
const defaultMeta = {
  home: {
    title: 'MINJIE STUDIO｜嚴選保健食品',
    description: '嚴選全球頂級原料，打造專屬你的健康方案。益生菌、膠原蛋白、酵素等保健食品。',
  },
  products: {
    title: '全部商品｜MINJIE STUDIO',
    description: '瀏覽 MINJIE STUDIO 全系列保健食品。',
  },
  blog: {
    title: '保健知識｜MINJIE STUDIO',
    description: 'MINJIE STUDIO 保健知識文章，幫助你了解更多健康資訊。',
  },
};
```

---

## 任務四：REVALIDATE_SECRET 支援

### 4.1 檢查現況

檢查 `app/api/revalidate/route.ts` 是否存在：
- 存在 → 確認它有 `x-revalidate-secret` header 驗證
- 不存在 → 建立一個

### 4.2 env 變數

確認 `.env.local` 有 `REVALIDATE_SECRET`。如果沒有：
- 在 `.env.example` 加上 `REVALIDATE_SECRET=your-secret-here`
- 提醒使用者需要在 `.env.local` 和 Vercel Environment Variables 設定相同的值

### 4.3 Revalidation 路徑擴展

現有 revalidate 可能只刷 `'/'`。確認並擴展支援：
```typescript
// POST body: { path: '/blog' } 或 { paths: ['/', '/blog', '/products'] }
```

---

## 完成後驗證清單

- [ ] `npm run build` 無錯誤
- [ ] 首頁正常顯示（沒有因為 DB 沒資料而壞掉）
- [ ] Footer 顯示正確的聯絡資訊（從 merchant_settings）
- [ ] Footer 連結正常（如果 footer_info 有資料就讀 DB，沒有就 fallback）
- [ ] AnnouncementBar：沒有公告時不顯示任何東西（目前 0 筆，所以應該看不到）
- [ ] Blog 頁面 metadata 正確
- [ ] 首頁 metadata 正確（查看 page source 確認 `<title>` 和 `<meta name="description">`）
- [ ] 手機版排版不受影響

## 注意事項

1. **不要刪除任何 hardcoded fallback** — 所有動態值都要有 fallback，確保 DB 沒資料不會白屏
2. **不要改動** `lib/cms.ts` 中已有函數的介面 — 只新增，不修改既有函數簽名
3. **不要改動** CMS 後台（`cms-admin` repo）— 這次只改 Storefront
4. **不要改動** 結帳流程相關的任何東西
5. **保持 ISR 策略不變** — 首頁 3600s、Blog 60s
