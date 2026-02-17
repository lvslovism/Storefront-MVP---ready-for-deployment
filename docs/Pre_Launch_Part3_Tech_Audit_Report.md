# 上線前 Part 3：技術審計報告
> 日期：2026-02-17
> 審計範圍：Storefront-MVP---ready-for-deployment

---

## 1. 環境變數

### 引用的環境變數清單
| 變數名 | 在 .env.example | 備註 |
|--------|:---------------:|------|
| SUPABASE_URL | ✅ | |
| NEXT_PUBLIC_SUPABASE_URL | ✅ | |
| SUPABASE_SERVICE_ROLE_KEY | ✅ (名稱為 SUPABASE_SERVICE_ROLE_KEY) | |
| SUPABASE_SERVICE_KEY | ❌ | `lib/cms.ts` 和 `lib/supabase.ts` 有用到作 fallback，但 .env.example 未列 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | |
| MERCHANT_CODE | ✅ | |
| MEDUSA_BACKEND_URL | ✅ | |
| NEXT_PUBLIC_MEDUSA_BACKEND_URL | ✅ | |
| MEDUSA_PUBLISHABLE_KEY | ❌ | `api/cart/complete` 有用，.env.example 未列（有 NEXT_PUBLIC 版本） |
| NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY | ✅ | |
| MEDUSA_ADMIN_EMAIL | ✅ | |
| MEDUSA_ADMIN_PASSWORD | ✅ | |
| LINE_LOGIN_CHANNEL_ID | ✅ | |
| LINE_LOGIN_CHANNEL_SECRET | ✅ | |
| LINE_LOGIN_CALLBACK_URL | ✅ | |
| RESEND_API_KEY | ✅ | |
| FROM_EMAIL | ❌ | `lib/email.ts` 和 `api/auth/email/bind` 有用到，.env.example 未列 |
| NEXT_PUBLIC_LIFF_ID | ✅ | |
| REVALIDATE_SECRET | ✅ | |
| NEXT_PUBLIC_PAYMENT_GATEWAY_URL | ❌ | `api/liff/checkout` 有用到，.env.example 未列 |
| GATEWAY_API_KEY | ❌ | `api/liff/checkout` 有用到，.env.example 未列 |
| NEXT_PUBLIC_SITE_URL | ❌ | `api/auth/email/forgot-password` 和 `resend-otp` 有用到，.env.example 未列 |
| STOREFRONT_URL | ❌ | `api/categories` 有用到（revalidation trigger），.env.example 未列 |
| NEXT_PUBLIC_DEFAULT_REGION | ✅ | |
| NODE_ENV | N/A | Next.js 自動設定 |

### ⚠️ Hardcoded 值（非測試值，但為生產 URL fallback）

| 檔案 | 行號 | 內容 | 風險 |
|------|------|------|------|
| `lib/cms.ts` | 3 | `'https://ephdzjkgpkuydpbkxnfw.supabase.co'` fallback | 🟡 中 — 環境變數未設定時會用此值，生產環境應正確設定 |
| `lib/supabase.ts` | 14 | `'https://ephdzjkgpkuydpbkxnfw.supabase.co'` fallback | 🟡 同上 |
| `api/cart/complete` | 3 | `'https://medusa-store-minjie-production.up.railway.app'` fallback | 🟡 生產 URL hardcoded 為 fallback |
| `api/order/[cartId]` | 3 | `'https://medusa-store-minjie-production.up.railway.app'` fallback | 🟡 同上 |
| `api/order-extension` | 17 | `'https://medusa-store-minjie-production.up.railway.app'` fallback | 🟡 同上 |
| `api/liff/checkout` | 9 | `'https://medusa-store-minjie-production.up.railway.app'` fallback | 🟡 同上 |
| `api/liff/cart` | 9 | `'https://medusa-store-minjie-production.up.railway.app'` fallback | 🟡 同上 |
| `api/liff/checkout` | 10 | `'pk_9e9c701859cf64d...'` hardcoded publishable key | 🔴 高 — API key 不應 hardcode |
| `api/liff/cart` | 10 | `'pk_9e9c701859cf64d...'` hardcoded publishable key | 🔴 高 — 同上 |
| `api/liff/checkout` | 11 | `'https://ecpay-gateway-production.up.railway.app'` fallback | 🟡 生產 URL hardcoded |
| `checkout/complete/page.tsx` | 185-188 | Hardcoded Supabase URL + anon key | 🔴 高 — 直接 hardcode 完整 apikey |
| `checkout/page.tsx` | 392, 957 | Hardcoded Supabase URL (edge function calls) | 🟡 中 — 應改用環境變數 |

---

## 2. 結帳流程

### Gateway URL
- `lib/gateway.ts`：從 `config/store.json` 的 `gateway.url` 讀取 ✅
- `api/liff/checkout`：從 `process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_URL` 讀取，fallback 到 hardcoded production URL 🟡
- Gateway API key：`api/liff/checkout` 從 `process.env.GATEWAY_API_KEY` 讀取 ✅

### 價格來源
- `api/payment/init`：不處理金額，只做 cart 初始化（shipping + payment collection） ✅
- `lib/gateway.ts`：`CheckoutRequest.amount` 由 server 傳入 ✅
- 結帳流程金額由 Medusa cart 計算，前端不傳價格 ✅

---

## 3. 錯誤處理

### API Route 錯誤處理覆蓋率
| API Route | try-catch | 備註 |
|-----------|:---------:|------|
| /api/auth/email/* (8 routes) | ✅ | 全部有 try-catch |
| /api/auth/line/callback | ✅ | 3 層 try-catch |
| /api/auth/line | ❌ | 無 try-catch |
| /api/auth/line/session | ✅ | |
| /api/auth/logout | ❌ | 無 try-catch |
| /api/cart/complete | ✅ | |
| /api/categories | ✅ | |
| /api/categories/[id] | ✅ | |
| /api/liff/cart | ❌ | 無 try-catch |
| /api/liff/checkout | ✅ | |
| /api/member/* (7 routes) | ✅ | 全部有 try-catch |
| /api/order/[cartId] | ✅ | 6 層 |
| /api/order-extension | ✅ | |
| /api/payment/init | ✅ | |
| /api/revalidate | ✅ | |
| /api/search/posts | ✅ | |
| /api/wallet/* (3 routes) | ✅ | |

### ⚠️ 缺少 try-catch 的 API Route
1. `app/api/auth/line/route.ts` — LINE 登入初始化（redirect）
2. `app/api/auth/logout/route.ts` — 登出
3. `app/api/liff/cart/route.ts` — LIFF 購物車操作

### ⚠️ 使用 .single() 的位置（非 worktree，主 repo 內）

**lib/cms.ts**（7 處）：
| 行號 | 函數 | 有 error 檢查 | 風險 |
|------|------|:------------:|------|
| 46 | getSection | ✅ 檢查 PGRST116 | 低 |
| 159 | getBotReply | ✅ 檢查 PGRST116 | 低 |
| 238 | getPostBySlug | ✅ 檢查 PGRST116 | 低 |
| 301 | getCampaignBySlug | ✅ 檢查 PGRST116 | 低 |
| 379 | getBannerByPlacement | ✅ 檢查 error | 低 |
| 455 | getMerchantSettings | ✅ 檢查 PGRST116 | 低 |
| 685 | getCategorySeo | ✅ 檢查 PGRST116 | 低 |

**lib/supabase.ts**（10 處）：全在 member 相關 CRUD 操作中，多數有 error 檢查。

**API routes** 中的 `.single()`：多在 upsert / insert 後使用（addresses, preferences, profile, wallet 等），預期一定有結果，風險較低。

---

## 4. 安全性

| 項目 | 狀態 | 備註 |
|------|:----:|------|
| Service Role Key 未暴露前端 | ✅ | 無 `NEXT_PUBLIC.*SERVICE_ROLE` 引用 |
| Service Role Key 只在 API routes 使用 | ✅ | 僅出現在 `lib/cms.ts`, `lib/supabase.ts`, `app/api/*` |
| Cookie HttpOnly | ✅ | `lib/auth.ts:16`, `api/auth/line/*` |
| Cookie Secure (production) | ✅ | `process.env.NODE_ENV === 'production'` |
| Cookie SameSite | ✅ | `sameSite: 'lax'` |
| CORS 設定 | ⚠️ 無顯式設定 | API routes 無 CORS headers；依賴 Next.js 預設（same-origin） |
| Revalidation API secret 驗證 | ✅ | `x-revalidate-secret` header 檢查 |

### ⚠️ 安全性備註
- `checkout/complete/page.tsx:188`：Supabase **anon key** 直接 hardcoded 在前端 client component 中。雖然 anon key 本來就是公開的，但最佳實踐是使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 環境變數
- Session 使用 JSON 格式存在 cookie 中（非 JWT），無簽名驗證 — session 可被用戶端修改

---

## 5. 效能 + SEO

| 項目 | 狀態 | 備註 |
|------|:----:|------|
| next/image 使用 | 8 個檔案 | `Header`, `ProductCard`, `ProductDetail`, `ImageGallery`, `CartDrawer`, `UserMenu`, `OrderDetailClient`, `checkout/page` |
| 原生 `<img>` 使用 | 5 處（主 repo） | `BrandStory.tsx`, `blog/page.tsx`(2), `blog/[slug]/page.tsx`, `about/page.tsx` |
| 自訂 404 頁面 | ✅ | `app/not-found.tsx` 存在 |
| loading.tsx 存在 | ❌ | 無任何 `loading.tsx`，沒有 Suspense boundary |
| 頂層頁面 'use client' | ✅ | 僅 `reset-password/page.tsx` 有 `'use client'`，合理（需要表單互動） |

### 原生 `<img>` 使用詳情
| 檔案 | 行號 | 說明 |
|------|------|------|
| `components/cms/BrandStory.tsx` | 46 | CMS 圖片，可改用 next/image |
| `app/(website)/blog/page.tsx` | 114, 168 | 文章封面圖 |
| `app/(website)/blog/[slug]/page.tsx` | 153 | 文章封面圖 |
| `app/(website)/about/page.tsx` | 108 | 品牌形象圖 |

---

## 6. 部署配置

### next.config.js
```javascript
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**' }]
}
```
- images.remotePatterns 包含 Supabase：✅（`**` 通配所有域名）
- images.remotePatterns 包含 Medusa：✅（同上）
- ⚠️ `hostname: '**'` 允許所有域名的圖片 — 生產環境建議限制為已知域名

### 其他
- `vercel.json`：不存在（使用 Vercel 預設配置）
- `package.json scripts`：`dev`, `build`, `start`, `lint` — 標準配置 ✅

---

## 總結

### 🔴 必須修復（上線阻斷）
1. **Hardcoded Publishable Key** — `api/liff/checkout/route.ts:10` 和 `api/liff/cart/route.ts:10` 有 hardcoded `pk_9e9c701859cf...`，應改為純環境變數讀取
2. **Hardcoded Supabase anon key** — `checkout/complete/page.tsx:188` hardcoded 完整 Supabase anon key，應改用 `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Hardcoded Supabase URL in checkout** — `checkout/page.tsx:392,957` 和 `checkout/complete/page.tsx:185` 直接 hardcode Supabase edge function URL

### 🟡 建議修復（影響品質）
1. **缺少 try-catch** — `api/auth/line/route.ts`, `api/auth/logout/route.ts`, `api/liff/cart/route.ts` 三個 API route 無 try-catch
2. **缺少 .env.example 項目** — `FROM_EMAIL`, `NEXT_PUBLIC_PAYMENT_GATEWAY_URL`, `GATEWAY_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `STOREFRONT_URL` 未在 .env.example 中列出
3. **原生 `<img>` 標籤** — 5 處使用原生 `<img>` 而非 `next/image`，影響圖片載入效能和 LCP
4. **無 loading.tsx** — 無任何路由有 loading.tsx，頁面切換時無 Suspense loading 狀態
5. **images.remotePatterns 過於寬鬆** — `hostname: '**'` 允許所有域名，建議限制為 Supabase + Medusa 域名
6. **Hardcoded Medusa/Supabase URL fallback** — 多個 API route 的 fallback 值為生產 URL，環境變數未設時會靜默使用

### 🟢 無風險
1. Gateway URL 從 config/env 讀取
2. 價格由 Medusa server 計算，非前端傳入
3. Service Role Key 未暴露前端
4. Cookie 安全設定完整（HttpOnly + Secure + SameSite）
5. 自訂 404 頁面存在
6. 所有 (website) 頂層頁面皆為 Server Component
7. Revalidation API 有 secret 驗證
8. lib/cms.ts 中的 `.single()` 全部有 PGRST116 error 檢查

---

## 完整掃描 Log

### 環境變數引用（去重後，僅主 repo）
```
FROM_EMAIL
GATEWAY_API_KEY
LINE_LOGIN_CALLBACK_URL
LINE_LOGIN_CHANNEL_ID
LINE_LOGIN_CHANNEL_SECRET
MEDUSA_ADMIN_EMAIL
MEDUSA_ADMIN_PASSWORD
MEDUSA_BACKEND_URL
MEDUSA_PUBLISHABLE_KEY
MERCHANT_CODE
NEXT_PUBLIC_LIFF_ID
NEXT_PUBLIC_MEDUSA_BACKEND_URL
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
NEXT_PUBLIC_PAYMENT_GATEWAY_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NODE_ENV
REVALIDATE_SECRET
STOREFRONT_URL
SUPABASE_SERVICE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

### API Route try-catch 覆蓋率
```
api/auth/line/route.ts: try=0 catch=0          ← ⚠️
api/auth/logout/route.ts: try=0 catch=0        ← ⚠️
api/liff/cart/route.ts: try=0 catch=0          ← ⚠️
（其餘 28 個 API route 全部有 try-catch）
```

### .single() 呼叫統計（主 repo，不含 worktree）
```
lib/cms.ts: 7 處（全部有 PGRST116 檢查）
lib/supabase.ts: 10 處（member CRUD）
app/api/wallet/: 3 處
app/api/member/: 10 處
app/api/liff/checkout: 1 處
app/api/categories: 3 處
```
