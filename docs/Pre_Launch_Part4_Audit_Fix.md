# 上線前 Part 4：技術審計問題修復

> 日期：2026-02-17
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`
> 前置任務：Part 3 審計報告（`docs/Pre_Launch_Part3_Tech_Audit_Report.md`）

---

## 背景

Part 3 技術審計發現 3 項必須修復 + 6 項建議修復。本指令修復所有 🔴 必須修復項目 + 部分 🟡 建議修復項目。

**核心原則：把所有 hardcoded 機密值替換為環境變數引用，加上 fallback 不能讓程式崩潰。**

---

## 任務 ① 🔴 移除 Hardcoded Publishable Key

### Step 1.1：找出所有 hardcoded publishable key

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 找出所有 hardcoded pk_ 值
grep -rn "pk_[a-zA-Z0-9]" app/ lib/ components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|\.env\|process\.env" \
  | head -20
```

### Step 1.2：替換為環境變數

對每個找到的位置：

**替換前（範例）：**
```typescript
const publishableKey = 'pk_9e9c701859cf...'
// 或
headers: { 'x-publishable-api-key': 'pk_9e9c701859cf...' }
```

**替換後：**
```typescript
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''
// 或
headers: { 'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '' }
```

**具體檔案：**
- `app/api/liff/checkout/route.ts` — 找到 hardcoded `pk_` 值，替換為 `process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `app/api/liff/cart/route.ts` — 同上

如果這些是 API Route（server-side），也可以用 `process.env.MEDUSA_PUBLISHABLE_KEY`（不帶 NEXT_PUBLIC_ 前綴）。
但如果已有其他地方用 `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`，保持一致。

先確認環境變數名稱：
```bash
grep -rn "MEDUSA_PUBLISHABLE_KEY\|PUBLISHABLE_KEY" .env.example .env.local 2>/dev/null
grep -rn "MEDUSA_PUBLISHABLE_KEY\|PUBLISHABLE_KEY" app/ lib/ --include="*.ts" --include="*.tsx" | grep "process\.env" | head -10
```

用已經存在的環境變數名稱，不要發明新的。

---

## 任務 ② 🔴 移除 Hardcoded Supabase Anon Key

### Step 2.1：找出位置

```bash
grep -rn "eyJ" app/checkout/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|process\.env" \
  | head -10
```

### Step 2.2：替換

在 `app/checkout/complete/page.tsx`（第 188 行附近）：

**替換前：**
```typescript
apikey: 'eyJhbGci...'  // 完整的 anon key
// 或
const supabaseKey = 'eyJhbGci...'
```

**替換後：**
```typescript
apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
// 或
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
```

先確認環境變數名稱：
```bash
grep -rn "SUPABASE_ANON_KEY\|SUPABASE_KEY" .env.example 2>/dev/null | head -5
grep -rn "SUPABASE_ANON_KEY" app/ lib/ --include="*.ts" --include="*.tsx" | grep "process\.env" | head -5
```

---

## 任務 ③ 🔴 移除 Hardcoded Supabase URL

### Step 3.1：找出位置

```bash
grep -rn "supabase\.co" app/checkout/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|process\.env\|\.env" \
  | head -10
```

### Step 3.2：替換

在 `app/checkout/page.tsx` 和 `app/checkout/complete/page.tsx`：

**替換前（範例）：**
```typescript
const url = 'https://xxxx.supabase.co/functions/v1/order-notify'
// 或
fetch('https://xxxx.supabase.co/functions/v1/...')
```

**替換後：**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const url = `${supabaseUrl}/functions/v1/order-notify`
// 或
fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/functions/v1/...`)
```

確認環境變數名稱：
```bash
grep -rn "SUPABASE_URL" .env.example 2>/dev/null | head -5
grep -rn "SUPABASE_URL" lib/supabase.ts lib/cms.ts 2>/dev/null | head -5
```

**注意：** 如果在 Client Component（`'use client'`）中使用，必須用 `NEXT_PUBLIC_` 前綴的變數。如果在 API Route 或 Server Component 中，用不帶前綴的。檢查檔案開頭有沒有 `'use client'` 來決定。

---

## 任務 ④ 🟡 API Route 補 try-catch

### Step 4.1：找出缺少 try-catch 的 API route

根據審計報告，以下 3 個 API route 缺少 try-catch：
- `app/api/auth/line/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/liff/cart/route.ts`

### Step 4.2：為每個加上 try-catch

對每個檔案，找到 handler function（GET/POST/PUT/DELETE），如果沒有 try-catch 就包上：

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... 現有邏輯全部保留 ...
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**注意：**
- 不要改動現有邏輯，只是外面包一層 try-catch
- `catch` 裡回傳 500 JSON response，不要 throw
- 如果函數裡已經有局部 try-catch 處理特定邏輯，不衝突，外層的是兜底
- 如果 handler 有 redirect（如 LINE OAuth），確認 redirect 不被 catch 攔住。Next.js 的 `redirect()` 會 throw 一個特殊錯誤，需要 re-throw：

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... 現有邏輯 ...
  } catch (error) {
    // Next.js redirect() throws NEXT_REDIRECT error, must re-throw
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    // 或者更安全的寫法：
    if ((error as any)?.digest?.startsWith?.('NEXT_REDIRECT')) {
      throw error
    }
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

先檢查每個檔案是否有 `redirect`：
```bash
grep -n "redirect\|NextResponse.redirect" \
  app/api/auth/line/route.ts \
  app/api/auth/logout/route.ts \
  app/api/liff/cart/route.ts \
  2>/dev/null
```

有 redirect 的用 re-throw 版，沒有的用簡單版。

---

## 任務 ⑤ 🟡 補齊 .env.example

### Step 5.1：找出缺少的環境變數

```bash
# 取得所有 process.env 引用
grep -rn "process\.env\." app/ lib/ components/ middleware.ts \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next" \
  | sed 's/.*process\.env\.\([A-Z_]*[A-Z0-9_]*\).*/\1/' \
  | sort -u > /tmp/env_used.txt

# 取得 .env.example 中已有的變數
grep -v "^#\|^$" .env.example | sed 's/=.*//' | sort -u > /tmp/env_example.txt

# 差集
comm -23 /tmp/env_used.txt /tmp/env_example.txt
```

### Step 5.2：把缺少的加到 .env.example

根據審計報告，至少需要補上：

```bash
# 在 .env.example 尾部追加（如果還沒有的話）
```

```env
# === Email ===
FROM_EMAIL=noreply@yourdomain.com

# === ECPay Gateway ===
GATEWAY_API_KEY=your-gateway-api-key
NEXT_PUBLIC_PAYMENT_GATEWAY_URL=https://ecpay-gateway-production.up.railway.app

# === Site ===
NEXT_PUBLIC_SITE_URL=https://shop.minjie0326.com
STOREFRONT_URL=https://shop.minjie0326.com
```

**注意：** 只加不存在的，不要重複。先用 grep 確認每個變數名是否已在 .env.example 中。

---

## 任務 ⑥ 🟡 next.config.js images hostname 收緊

### Step 6.1：檢查現有配置

```bash
cat next.config.js 2>/dev/null || cat next.config.mjs 2>/dev/null || cat next.config.ts 2>/dev/null
```

### Step 6.2：修正 images 設定

找到 `images` 配置中的 `hostname: '**'`（允許所有域名），替換為明確的域名清單：

**替換前：**
```javascript
images: {
  remotePatterns: [
    { hostname: '**' },
  ],
}
```

**替換後：**
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
    },
    {
      protocol: 'https',
      hostname: '*.supabase.in',
    },
    {
      protocol: 'http',
      hostname: 'localhost',
    },
  ],
}
```

**先確認 Medusa 的圖片域名：**
```bash
# 找 Medusa 圖片 URL 的 pattern
grep -rn "thumbnail\|image.*url\|\.jpg\|\.png\|\.webp" components/ app/ --include="*.tsx" | grep "http" | head -10

# 找 Medusa backend URL
grep "MEDUSA_BACKEND_URL" .env.example
```

如果 Medusa 圖片也從特定域名載入（如 `*.railway.app` 或 Medusa 的 file service URL），也要加上。

如果不確定有哪些域名，保守做法是只把 `'**'` 改成具體的幾個已知域名，不要過度收緊導致圖片載入失敗。寧可多列幾個域名也不要用 `'**'`。

---

## 任務 ⑦ Build + 驗證

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
npm run build
```

Build 成功 → 繼續。失敗 → 修復，最多 3 次。

### 特別驗證

```bash
# 確認沒有殘留的 hardcoded 機密
echo "=== Checking for remaining hardcoded secrets ==="

# Publishable Key
grep -rn "pk_[a-zA-Z0-9]\{10,\}" app/ lib/ --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|\.env\|process\.env" | head -5

# Supabase anon key (eyJ 開頭的 JWT)
grep -rn "'eyJ[a-zA-Z0-9]" app/ lib/ --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|\.env\|process\.env" | head -5

# Hardcoded Supabase URL
grep -rn "supabase\.co" app/ --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|process\.env\|\.env\|\/\/" | head -5

echo "=== Done ==="
```

如果還有殘留，繼續修復。

---

## 輸出報告

寫入 `docs/Pre_Launch_Part4_Fix_Report.md`：

```markdown
# 上線前 Part 4：審計問題修復報告
> 日期：2026-02-17

## 🔴 必須修復

### 1. Hardcoded Publishable Key
| 檔案 | 行號 | 修復方式 | 狀態 |
|------|------|---------|:----:|
| app/api/liff/checkout/route.ts | ... | → process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY | ✅/❌ |
| app/api/liff/cart/route.ts | ... | → process.env... | ✅/❌ |

### 2. Hardcoded Supabase Anon Key
| 檔案 | 行號 | 修復方式 | 狀態 |
|------|------|---------|:----:|
| app/checkout/complete/page.tsx | 188 | → process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅/❌ |

### 3. Hardcoded Supabase URL
| 檔案 | 行號 | 修復方式 | 狀態 |
|------|------|---------|:----:|
| app/checkout/page.tsx | ... | → process.env 拼接 | ✅/❌ |
| app/checkout/complete/page.tsx | ... | → process.env 拼接 | ✅/❌ |

### 殘留檢查
- Hardcoded pk_ 殘留：✅ 無 / ❌ 仍有
- Hardcoded eyJ 殘留：✅ 無 / ❌ 仍有
- Hardcoded supabase.co 殘留：✅ 無 / ❌ 仍有

## 🟡 建議修復

### 4. API Route try-catch
| API Route | 狀態 |
|-----------|:----:|
| auth/line | ✅/❌ |
| auth/logout | ✅/❌ |
| liff/cart | ✅/❌ |

### 5. .env.example 補齊
| 變數 | 狀態 |
|------|:----:|
| FROM_EMAIL | ✅ 已加 / 已存在 |
| GATEWAY_API_KEY | ✅ 已加 / 已存在 |
| NEXT_PUBLIC_PAYMENT_GATEWAY_URL | ✅ 已加 / 已存在 |
| NEXT_PUBLIC_SITE_URL | ✅ 已加 / 已存在 |
| STOREFRONT_URL | ✅ 已加 / 已存在 |

### 6. next.config images hostname
- 修改前：`hostname: '**'`
- 修改後：（列出具體域名）
- 狀態：✅/❌

## 修改檔案
| 檔案 | 動作 | 說明 |
|------|------|------|
| ... | ... | ... |

## Build 結果
- `npm run build`：✅/❌
```

**不要 git commit，等人工確認後再 commit。**

---

## 不要動的東西

1. **結帳邏輯本身**（只改環境變數引用，不改業務邏輯）
2. **會員系統**
3. **購物金系統**
4. **CMS 後台 repo**
5. **Part 1-2 剛改好的 SEO / Sitemap / JSON-LD**
6. **已有 try-catch 的 API route**（不重複包）
