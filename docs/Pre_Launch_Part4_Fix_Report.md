# 上線前 Part 4：審計問題修復報告
> 日期：2026-02-17

## 🔴 必須修復

### 1. Hardcoded Publishable Key
| 檔案 | 行號 | 修復方式 | 狀態 |
|------|------|---------|:----:|
| app/api/liff/checkout/route.ts | 10 | `'pk_9e9c...'` → `process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \|\| ''` | ✅ |
| app/api/liff/cart/route.ts | 10 | `'pk_9e9c...'` → `process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \|\| ''` | ✅ |

### 2. Hardcoded Supabase Anon Key
| 檔案 | 行號 | 修復方式 | 狀態 |
|------|------|---------|:----:|
| app/checkout/complete/page.tsx | 185-188 | `'eyJhbGci...'` → `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| ''` | ✅ |

### 3. Hardcoded Supabase URL
| 檔案 | 行號 | 修復方式 | 狀態 |
|------|------|---------|:----:|
| app/checkout/complete/page.tsx | 184-185 | `'https://ephdzjkgpkuydpbkxnfw.supabase.co/rest/v1/...'` → `` `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/...` `` | ✅ |
| app/checkout/page.tsx | 392 | `'https://ephdzjkgpkuydpbkxnfw.supabase.co/functions/v1/chailease-plans...'` → `` `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chailease-plans...` `` | ✅ |
| app/checkout/page.tsx | 957 | `'https://ephdzjkgpkuydpbkxnfw.supabase.co/functions/v1/chailease-checkout'` → `` `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chailease-checkout` `` | ✅ |

### 殘留檢查
- Hardcoded pk_ 殘留：✅ 無（app/ 和 lib/ 皆無）
- Hardcoded eyJ 殘留：✅ 無（app/ 皆無）
- Hardcoded supabase.co 殘留（app/）：✅ 無
- Hardcoded supabase.co 殘留（lib/）：⚠️ 仍有 — `lib/cms.ts:3` 和 `lib/supabase.ts:14` 保留為 server-side fallback（屬 🟡 建議修復項目 #6，不在本次修復範圍）

## 🟡 建議修復

### 4. API Route try-catch
| API Route | 有 redirect | 修復方式 | 狀態 |
|-----------|:-----------:|---------|:----:|
| auth/line | ✅ NextResponse.redirect | 外層 try-catch + NEXT_REDIRECT re-throw | ✅ |
| auth/logout | ❌ | 外層 try-catch + 500 JSON response | ✅ |
| liff/cart | ❌ | 外層 try-catch + 500 JSON response | ✅ |

### 5. .env.example 補齊
| 變數 | 狀態 |
|------|:----:|
| FROM_EMAIL | ✅ 已加 |
| GATEWAY_API_KEY | ✅ 已加 |
| NEXT_PUBLIC_PAYMENT_GATEWAY_URL | ✅ 已加 |
| NEXT_PUBLIC_SITE_URL | ✅ 已加 |
| STOREFRONT_URL | ✅ 已加 |

### 6. next.config images hostname
- 修改前：`hostname: '**'`（允許所有域名）
- 修改後：
  - `*.supabase.co`（Supabase Storage 圖片）
  - `*.supabase.in`（Supabase 備用域名）
  - `*.railway.app`（Medusa 後端圖片）
  - `localhost`（開發環境）
- 狀態：✅

## 修改檔案
| 檔案 | 動作 | 說明 |
|------|------|------|
| app/api/liff/checkout/route.ts | 修改 | 移除 hardcoded pk_ fallback → `''` |
| app/api/liff/cart/route.ts | 修改 | 移除 hardcoded pk_ fallback → `''`；加 try-catch |
| app/checkout/complete/page.tsx | 修改 | Supabase URL + anon key → 環境變數 |
| app/checkout/page.tsx | 修改 | 2 處 Supabase URL → 環境變數 |
| app/api/auth/line/route.ts | 修改 | 加 try-catch（含 NEXT_REDIRECT re-throw） |
| app/api/auth/logout/route.ts | 修改 | 加 try-catch |
| .env.example | 修改 | 補 5 個缺少的環境變數 |
| next.config.js | 修改 | images hostname `**` → 具體域名清單 |

## Build 結果
- `npm run build`：✅ 成功（72/72 頁面）
- Build 過程中的 `DYNAMIC_SERVER_USAGE` 錯誤為正常現象（API routes 使用 cookies/request.url，Next.js 自動切換為 dynamic rendering）

## 未修改項目（不在本次範圍）
- `lib/cms.ts` / `lib/supabase.ts` 中的 Supabase URL fallback（🟡 #6）
- 多個 API route 中的 Medusa URL fallback（🟡 #6）
- `api/liff/checkout/route.ts` 中的 ECPay Gateway URL fallback（🟡 #6）
- 原生 `<img>` 標籤替換為 next/image（🟡 #3）
- 新增 loading.tsx（🟡 #4）
