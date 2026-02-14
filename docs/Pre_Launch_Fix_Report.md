# Pre-Launch 修復報告
> 日期：2026-02-15
> 執行者：Claude Code
> 依據：docs/Pre_Launch_Fix_v2.md（第一至第五部分）

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `lib/medusa.ts` | `getProducts()`、`getProduct()`、`getProductByHandle()` 三個函式加上 `fields=*variants,+variants.inventory_quantity` 參數 |
| `app/(website)/products/[handle]/ProductDetailClient.tsx` | 新增庫存判斷邏輯：缺貨顯示「暫時缺貨」並 disable 按鈕（灰色 + opacity-50）、低庫存顯示「僅剩 X 件」（金色）、缺貨提示「此商品目前缺貨」（紅色） |
| `components/CartProvider.tsx` | `addItem` 的 catch 區塊增加庫存不足錯誤偵測（inventory/insufficient/out of stock/409），顯示友善提示訊息並 alert |
| `components/website/Header.tsx` | Logo fallback 樣式改為 `font-light tracking-[3px] uppercase` + `#D4AF37` 色 + fallback 文字 `MINJIE STUDIO` |
| `.env.example` | 新增 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_LIFF_ID` 三個變數及中文說明 |
| `app/api/revalidate/route.ts` | secret 不匹配時的 HTTP status 從 401 改為 403 |
| `app/robots.ts` | disallow 加入 `/api/`，並統一加上尾斜線（`/api/`、`/checkout/`、`/liff/`） |
| `app/layout.tsx` | openGraph metadata 補上 `url: 'https://shop.minjie0326.com'` |
| `public/tenant/` | 建立目錄（Logo 圖片需人工上傳） |

---

## Blocker 修復狀態

| Blocker | 狀態 | 說明 |
|---------|------|------|
| 1A inventory_quantity 參數 | ✅ 已修復 | `getProducts()`、`getProduct()`、`getProductByHandle()` 都加上 `fields=*variants,+variants.inventory_quantity`，確保 API 回傳庫存數量 |
| 1B 前端庫存 UI | ✅ 已修復 | `ProductDetailClient.tsx` 新增：(1) `isOutOfStock` 判斷（qty<=0 → 按鈕 disabled + 文字「暫時缺貨」+ 灰色 opacity-50）(2) `isLowStock` 判斷（qty 1~5 → 顯示「僅剩 X 件」金色提示）(3) 缺貨時顯示「此商品目前缺貨」紅色提示，桌面版和手機版按鈕同步處理 |
| 1C CartProvider 錯誤處理 | ✅ 已修復 | `addItem` catch 區塊偵測 inventory/insufficient/out of stock/409 關鍵字，顯示「此商品庫存不足，請減少數量或稍後再試」提示，不影響購物車整體 state |
| 2 Logo fallback | ✅ 已確認 | Header 已有 fallback 邏輯（logo 為空時顯示文字店名），樣式已更新為規格要求的 `font-light tracking-[3px] uppercase #D4AF37`，`config/store.json` name 為「MINJIE STUDIO」。`public/tenant/` 目錄已建立，Logo 圖片需人工上傳 |
| 3 環境變數 + revalidate 安全 | ✅ 已修復 | (1) `.env.example` 補上 `NEXT_PUBLIC_LIFF_ID`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 含中文說明 (2) `revalidate/route.ts` 安全邏輯確認：`REVALIDATE_SECRET` 未設定 → 500、secret 不匹配 → 403（從 401 改為 403），無任何跳過驗證的 fallback |

---

## SEO 補強狀態

| 項目 | 狀態 | 說明 |
|------|------|------|
| sitemap.ts | ✅ 已確認 | 存在且完整：含首頁、商品列表、商品詳情頁（動態從 Medusa API 取）、blog 列表和文章頁、政策頁面、FAQ、關於我們。使用 server-side `getProducts()` 呼叫 |
| robots.ts | ✅ 已修復 | 新增 `/api/` 到 disallow 清單，統一尾斜線格式。最終 disallow: `['/api/', '/checkout/', '/liff/']` |
| OG metadata | ✅ 已修復 | `app/layout.tsx` openGraph 補上 `url`。已有 title、description、images、siteName、locale、type。商品頁 `products/[handle]/page.tsx` 有獨立 `generateMetadata` + `openGraph` + `twitter` + JSON-LD 結構化資料 |

---

## Gateway 驗證結果

| 項目 | 狀態 | 說明 |
|------|------|------|
| Graceful Shutdown | ✅ 已實作 | `src/index.js:49` — `process.on('SIGTERM', ...)` 處理 Railway redeploy，等待 in-flight requests 完成再退出。同時有 `SIGINT` handler |
| Webhook 冪等性 | ✅ 已實作 | `src/routes/payment.js:339-354` — 冪等檢查：交易已處理過則跳過，log `skipped_idempotent`，回傳 `1|OK`。另有 `already processed` 判斷（line 220） |
| WEBHOOK_SECRET 使用 | ✅ 有使用 | `src/routes/payment.js:523` — webhook 呼叫 storefront 時帶 `x-webhook-secret: process.env.ORDER_WEBHOOK_SECRET`。需確認 Railway 環境變數已設定 |
| Gateway Health | ✅ 正常 | `{"status":"ok","timestamp":"2026-02-14T20:34:50.940Z"}` |
| 商家 is_staging | ❓ 需人工確認 | 需登入 Railway DB 或 Gateway Admin API 確認 minjie / minjie-logistics / minjie-c2c 三個商家的 `is_staging` 狀態。上線前必須切為 `false` |

---

## Build 結果

- **npm run build：✅ 成功**
- Compiled successfully，72 頁產生完成
- 產生 19 個靜態商品頁（SSG via `generateStaticParams`）
- 非阻擋性 warning：`api/member/tier` 和 `api/member/wallet` 使用 `cookies()` 所以是 dynamic route（預期行為，API Route 本該是 dynamic）

---

## 剩餘需人工處理

1. **上傳 Logo 圖片** — `public/tenant/` 目錄已建立，需將 Logo 圖片（如 `logo.png`）放入，並更新 `config/store.json` 的 `logo` 欄位
2. **設定 Vercel 環境變數** — 以下變數需在 Vercel Dashboard 設定：
   - `REVALIDATE_SECRET`（同步至 CMS webhook 設定）
   - `NEXT_PUBLIC_LIFF_ID`（從 LINE Developers Console 取得）
   - `NEXT_PUBLIC_SUPABASE_URL`（同 `SUPABASE_URL`）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（從 Supabase Dashboard 取得）
3. **確認 Railway 環境變數** — `ORDER_WEBHOOK_SECRET` 需在 ecpay-gateway Railway 專案中確認已設定
4. **切換正式環境憑證** — Gateway 三個商家（minjie / minjie-logistics / minjie-c2c）的 `is_staging` 需在上線前切為 `false`
5. **首頁分類 Tabs** — 首頁商品區有 `TODO: 分類 Tabs（接 Medusa Collections）` 註解，建議上線後優先迭代

---

*報告生成時間：2026-02-15 by Claude Code*
