# MINJIE 上線前驗證報告

> 執行日期：2026-02-15
> 執行者：Claude Code
> 驗證依據：docs/Pre_Launch_Verification_Checklist.md（第一節至第九節）

---

## 上線前狀態摘要

### 🔴 阻擋上線（Must Fix）

1. **4.2 / 4.3 前端庫存檢查缺失** — `ProductDetailClient.tsx` 完全沒有 `inventory_quantity` 檢查，庫存為 0 的商品不會顯示「缺貨」，也不會阻止加入購物車。伺服器端 `page.tsx` 的 JSON-LD 有庫存判斷，但前端 UI 未實作。
   - **需要做：** 在 `ProductDetailClient.tsx` 加入庫存為 0 時的缺貨提示，並在加入購物車前檢查 `inventory_quantity`。

2. **6.2 Logo 圖片路徑為空** — `config/store.json` 中 `logo` 為空字串 `""`，且 `public/tenant/` 目錄不存在。Header 雖有 fallback（顯示文字店名），但正式上線應有品牌 Logo。
   - **需要做：** 上傳 Logo 圖片至 `public/tenant/` 或 Supabase Storage，並更新 `config/store.json` 的 `logo` 欄位。

3. **8.x 環境變數缺失（.env.local）** — 以下必要變數未在 `.env.local` 中設定：
   - `REVALIDATE_SECRET`（ISR revalidation 認證用，僅存在 .env.example）
   - `NEXT_PUBLIC_LIFF_ID`（LIFF 結帳頁初始化用）
   - **需要做：** 在 `.env.local`（開發）和 Vercel 環境變數中補齊上述變數。

### 🟡 建議修復（Should Fix）

1. **3.6 正式環境憑證狀態** — Gateway 服務正常運行（health check OK），但清單指出所有商家目前 `is_staging=true`，上線前需切換至正式環境。
   - **需要做：** 在 ecpay-gateway 將 minjie / minjie-logistics / minjie-c2c 的 `is_staging` 切為 `false`。

2. **8.x NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY** — 清單列為「必要」，但程式碼中使用 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 作為主要值，`NEXT_PUBLIC_*` 為 fallback。目前 server-side 可正常運作，但若有 client-side Supabase 需求則會失效。
   - **建議：** 在 Vercel 環境變數中設定 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

3. **1.2 首頁分類 Tabs 未實作** — 首頁商品區有 `TODO: 分類 Tabs（接 Medusa Collections）` 的註解，目前顯示全部商品，無分類篩選。
   - **建議：** 上線後優先迭代加入分類 Tab。

### ✅ 已確認完成

**一、Storefront 切版**
1. ✅ 1.1 Route Group `(website)` 已建立 — 含 about, account, blog, faq, login, products, search 等頁面
2. ✅ 1.2 首頁已改為品牌首頁 — 使用 CMS ImageSection 元件 + 商品網格，非單純商品列表
3. ✅ 1.3 商品列表頁 `/products` — `app/(website)/products/page.tsx` 存在，含分類篩選（ProductFilter.tsx）
4. ✅ 1.4 商品詳情頁 `/products/[handle]` — 存在 `page.tsx` + `ProductDetailClient.tsx`（16KB，含變體選擇）
5. ✅ 1.5 黑金色系 CSS Token — globals.css 和 checkout.css 含大量 `#D4AF37`（金色）和 `#0a0a0a`（黑色）
6. ✅ 1.6 Header 含 UserMenu — 已使用 `UserMenu` 元件，非舊版 `LineLoginButton`
7. ✅ 1.7 Footer 存在且含聯絡資訊 — `Footer.tsx`（8.7KB），從 CMS 讀取 merchant_settings
8. ✅ 1.8 CMS 圖片區塊 — `ImageSection.tsx` 元件存在，首頁使用 6 個 CMS 區塊（hero_brand, membership_table, spring_promo, installment_info, shopping_flow, community_cta）
9. ✅ 1.9 ISR Revalidation API — `app/api/revalidate/route.ts` 存在

**二、結帳流程**
1. ✅ 2.1 結帳頁含收件人表單 — name, phone, email, address 等欄位完備
2. ✅ 2.2 物流選擇（宅配 + 超商取貨） — `ShippingMethod` type 含 `'cvs' | 'home'`
3. ✅ 2.3 付款方式選擇 — 支援信用卡（credit_card）、貨到付款（cod）、中租零卡分期（chailease）
4. ✅ 2.4 ECPay Gateway 串接 — `gateway.ts` 含 `createCheckout`、`getCvsMap` 等，導向 `checkout_url`
5. ✅ 2.5 付款完成頁存在 — `app/checkout/complete/page.tsx`（27KB）
6. ✅ 2.6 免運門檻自動判斷 — 宅配 ≥$3000 免運，超商 ≥$1000 免運，程式碼明確
7. ✅ 2.7 超商選店 popup blocker 修復 — Desktop 用 `window.open('about:blank')`，Mobile 用 `window.location.href`
8. ✅ 2.8 購物車 CRUD — `CartProvider.tsx` 含 `addItem`、`updateItem`、`removeItem`、`refreshCart`
9. ✅ 2.9 已登入自動帶入收件資訊 — fetch `/api/member/profile`、`/addresses`、`/cvs-stores` 並自動填入

**三、金流物流**
1. ✅ 3.1 Gateway 服務正常運行 — `{"status":"ok","timestamp":"2026-02-14T20:05:04.816Z"}`
2. ✅ 3.6 Gateway URL 正確設定 — `config/store.json` 指向 `https://ecpay-gateway-production.up.railway.app`

**五、會員系統**
1. ✅ 5.1 LINE Login 完整流程 — `auth/line/route.ts`（入口）+ `auth/line/callback/`（回調）+ `auth/line/session/`
2. ✅ 5.2 Email 註冊/登入/忘記密碼 — 7 支 API 完備：register, verify, login, forgot-password, reset-password, resend-otp, bind + bind-verify
3. ✅ 5.3 會員中心 — `AccountClient.tsx`（62KB）
4. ✅ 5.4 訂單歷史查詢 — `api/member/orders/` 存在，另有 `account/orders/` 頁面
5. ✅ 5.5 地址/門市 CRUD — `api/member/addresses/` + `api/member/cvs-stores/` + `api/member/preferences/`
6. ✅ 5.6 結帳後自動儲存地址 — checkout page 有 fetch addresses 並帶入邏輯
7. ✅ 5.x Session Cookie 安全 — `httpOnly: true`, `secure: production`, `sameSite: 'lax'`

**六、已知 Bug**
1. ✅ 6.1 玻尿酸膠囊價格已非 $0 — API 回傳 `calculated_amount: 598`（TWD $598）
2. ✅ 6.3 品牌故事區圖片 — 首頁使用 CMS `ImageSection` 元件從 Supabase 動態載入，非硬編碼

**七、SEO**
1. ✅ 7.1 Root metadata — `layout.tsx` 含 `title`（template 格式）、`description`、`metadataBase`
2. ✅ 7.2 商品頁動態 metadata — `products/[handle]/page.tsx` 和 `products/page.tsx` 皆有 `generateMetadata`
3. ✅ 7.3 Sitemap 自動生成 — `app/sitemap.ts` 存在（Next.js 會自動生成 `/sitemap.xml`）
4. ✅ 7.4 robots.txt — `app/robots.ts` 存在
5. ✅ 7.5 OG Image 設定 — 多處設定 `openGraph` 和 `twitter` metadata（layout, products, blog, about, faq, policy）
6. ✅ 7.x 商品頁 JSON-LD — `products/[handle]/page.tsx` 含 Product 結構化資料

**八、環境變數**
1. ✅ `MERCHANT_CODE` — 已設定
2. ✅ `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — 已設定
3. ✅ `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — 已設定
4. ✅ `MEDUSA_BACKEND_URL` — 已設定
5. ✅ `MEDUSA_ADMIN_EMAIL` — 已設定
6. ✅ `MEDUSA_ADMIN_PASSWORD` — 已設定
7. ✅ `SUPABASE_URL` — 已設定
8. ✅ `SUPABASE_SERVICE_ROLE_KEY` — 已設定
9. ✅ `RESEND_API_KEY` — 已設定
10. ✅ `LINE_LOGIN_CHANNEL_ID` — 已設定
11. ✅ `LINE_LOGIN_CHANNEL_SECRET` — 已設定
12. ✅ `ECPAY_GATEWAY_URL` / `ECPAY_GATEWAY_API_KEY` — 透過 `config/store.json` 設定

### ❓ 需人工確認

1. **3.2 三個商家都已建立**（minjie / minjie-logistics / minjie-c2c） — 需登入 Gateway Admin 或查 DB 確認
2. **3.3 Graceful Shutdown 已實作** — 此邏輯在 ecpay-gateway repo，非本 Storefront repo，需至 gateway 專案確認 `SIGTERM` 處理
3. **3.4 Webhook 冪等性已實作** — 同上，在 ecpay-gateway repo 確認
4. **3.5 ORDER_WEBHOOK_SECRET 已設定** — 需在 Railway Dashboard → ecpay-gateway → Variables 確認
5. **3.6 正式環境憑證切換** — 需在 Gateway 確認 `is_staging` 狀態，上線前必須切為 `false`
6. **4.1 Medusa 商品 inventory_quantity** — Store API 回傳的 variant 不含 `inventory_quantity` 欄位（需 `+variants.inventory_quantity` fields 參數），需確認前端 `getProducts()` 是否有帶此參數
7. **8.x Vercel 環境變數** — 以上所有變數需在 Vercel Dashboard 一一確認已設定

---

## 檢查統計

| 狀態 | 數量 |
|------|------|
| ✅ 已確認完成 | 34 項 |
| 🔴 阻擋上線 | 3 項 |
| 🟡 建議修復 | 3 項 |
| ❓ 需人工確認 | 7 項 |

---

*報告生成時間：2026-02-15 by Claude Code*
