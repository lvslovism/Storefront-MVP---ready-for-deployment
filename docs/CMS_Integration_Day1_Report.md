# CMS ↔ Storefront Day 1 串接報告
> 日期：2026-02-15

---

## ① Revalidation 雙向驗證

### Storefront 端（接收方）
- `/api/revalidate/route.ts` 狀態：✅ 正常
- 支援多路徑：✅ 支援 `{ path }` 單路徑 和 `{ paths: [...] }` 陣列
- Secret 驗證邏輯：✅
  - `REVALIDATE_SECRET` 未設定 → 500
  - `x-revalidate-secret` header 不匹配 → 403
  - 匹配 → 執行 `revalidatePath()` 並回傳 `{ revalidated: true, paths, now }`
- 改善項目：加強 try/catch 保護 body parse、統一使用 header-only 驗證

### CMS 端（發送方）
- Revalidate API route 存在：✅（路徑：`app/api/revalidate-storefront/route.ts`）
- 呼叫目標 URL：`https://shop.minjie0326.com/api/revalidate`（硬編碼，未使用 `STOREFRONT_URL` 環境變數）
- Secret 來源：`process.env.REVALIDATE_SECRET`
- `.env.example` 有 `REVALIDATE_SECRET`：✅
- `.env.example` 有 `STOREFRONT_URL`：✅（`NEXT_PUBLIC_STOREFRONT_URL`）
- `.env.local` 已設定 `REVALIDATE_SECRET`：✅（值已配置）

### CMS 儲存頁面呼叫 revalidate 的狀況

| 管理頁面 | 儲存時呼叫 revalidate？ | 說明 |
|---------|:----:|------|
| 首頁區塊管理 (homepage-sections) | ✅ | 儲存後呼叫 `/api/revalidate-storefront`，paths: `['/']` |
| Banner 管理 | ❌ | 儲存後未觸發 revalidation |
| 公告/文章管理 | ❌ | 儲存後未觸發 revalidation |
| 商品推薦管理 | ❌ | 儲存後未觸發 revalidation |
| 區塊編輯 (content/sections) | ❌ | 儲存後未觸發 revalidation |
| SEO 設定 | ❌ | 儲存後未觸發 revalidation |
| 促銷活動管理 | ❌ | 儲存後未觸發 revalidation |
| 系統設定 | ❌ | 儲存後未觸發 revalidation |

> **注意**：目前僅 `homepage-sections` 頁面在儲存後呼叫 revalidate，其餘所有 CMS 管理頁面均未觸發。建議 Day 2 統一為所有儲存操作加入 revalidation 呼叫。

---

## ② 首頁分類 Tabs + 精選商品

### 修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `lib/cms.ts` | 新增 `getFeaturedPlacements()` 函式，從 `cms_featured_products` 取得不重複 placement 列表 |
| `lib/medusa.ts` | 新增 `getProductsByIds()` 函式，按 ID 陣列批次取商品，保持 CMS 排序 |
| `components/cms/FeaturedProducts.tsx` | **新建** — Client component，Tab 切換精選商品，支援 CMS 驅動 + fallback |
| `app/(website)/page.tsx` | 重寫商品區塊：CMS 驅動 placement tabs → `FeaturedProducts` 元件，保留 fallback |

### 新增函式

| 函式 | 檔案 | 說明 |
|------|------|------|
| `getFeaturedPlacements()` | `lib/cms.ts` | 查詢 `cms_featured_products` 取得所有活躍 placement（去重） |
| `getProductsByIds(ids)` | `lib/medusa.ts` | 按 ID 陣列向 Medusa Store API 批次取商品，使用 `region_id`、`publishable key`，回傳結果按 CMS 排序 |

### 新增元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| `FeaturedProducts` | `components/cms/FeaturedProducts.tsx` | Client component，接收 `tabs[]` 和 `fallbackProducts[]`，Tab 切換顯示商品，使用 `ProductCard` 渲染 |

### 元件特性
- **Tab UI**：多於 1 個 Tab 時才顯示 Tab 列，金色底線 active 狀態
- **商品網格**：`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`，最多顯示 8 個商品
- **空狀態**：無商品時不渲染
- **底部 CTA**：「查看全部商品」連結至 `/products`

### Placement 對應 Tab 名稱

| Placement Key | 中文名稱 |
|--------------|----------|
| `home_featured` | 精選推薦 |
| `home_new` | 新品上架 |
| `home_hot` | 熱銷排行 |
| `category_top` | 分類精選 |

### Fallback 行為
- **CMS `cms_featured_products` 有資料時**：按 placement 分組，每組取商品 ID 再從 Medusa 批次取商品，渲染為多 Tab 精選商品區
- **CMS 0 筆時**：從 Medusa `getProducts({ limit: 8 })` 取商品，以「全部商品」單一分類顯示（無 Tab 列）

### TODO 註解處理
- 原有 `// TODO: 分類 Tabs（接 Medusa Collections）` 已隨商品區塊重寫而移除
- 新實作使用 CMS 驅動的 placement 機制取代原先規劃的 Medusa Collections 方案

---

## ③ Build 結果

### Storefront `npm run build`

| 項目 | 結果 |
|------|------|
| 第 1 次 build | ❌ TypeScript 錯誤：`Set` 展開語法需要 `--downlevelIteration` |
| 修復 | `lib/cms.ts` 第 114 行：`[...new Set(...)]` → `Array.from(new Set(...))` |
| 第 2 次 build | ✅ 成功，72 頁面生成 |

- 首頁 (`/`) 靜態生成：✅（3.98 kB，First Load 100 kB）
- API routes 動態渲染：✅（符合預期）
- Tier/Wallet API cookie 動態警告：⚠️ 預期行為（使用 `cookies()` 觸發動態伺服器渲染）

### CMS `npm run build`
- ⏭️ 跳過（本次未修改 CMS 程式碼）

---

## 剩餘需人工處理

1. **CMS revalidation 覆蓋不足**：目前僅 `homepage-sections` 儲存後呼叫 revalidate，其餘 Banner、公告、商品推薦、SEO 等管理頁面均未觸發。建議 Day 2 統一為所有 CMS 儲存操作加入 revalidation。

2. **CMS revalidate-storefront 硬編碼 URL**：`app/api/revalidate-storefront/route.ts` 中 Storefront URL 為硬編碼 `https://shop.minjie0326.com`，建議改為讀取 `process.env.NEXT_PUBLIC_STOREFRONT_URL` 或 `process.env.STOREFRONT_URL`。

3. **CMS 精選商品資料**：`cms_featured_products` 表需要在 CMS 後台手動新增商品推薦資料（設定 `placement`、`product_id`、`sort_order`），否則首頁將持續使用 Medusa fallback 模式。

4. **E2E 測試**：建議手動測試完整流程：CMS 後台新增精選商品 → 觸發 revalidation → 確認首頁 Tab 更新。

5. **TypeScript 配置**：`tsconfig.json` 的 `target` 設為較低版本，導致 `Set` 展開語法不支援。已用 `Array.from()` 替代解決，但長期建議考慮升級 target 至 `es2015` 或更高。
