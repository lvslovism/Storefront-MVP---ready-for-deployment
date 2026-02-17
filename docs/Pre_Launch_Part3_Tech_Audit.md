# 上線前 Part 3：技術審計 + 問題掃描

> 日期：2026-02-17
> 執行模式：**全自動，不要停下來問任何問題，所有檢查做完後輸出一份完整報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`
> 目標：找出上線前的潛在技術問題，但**不自動修復**，只列出清單

---

## 背景

上線前需要一輪技術掃描，確認沒有遺漏的 hardcoded 測試值、錯誤的環境變數引用、缺失的錯誤處理等。這份指令只做「掃描 + 報告」，不做任何修改。

---

## 審計 ① 環境變數完整性

### 1.1 盤點所有引用的環境變數

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 找出所有 process.env 引用
grep -rn "process\.env\." app/ lib/ components/ middleware.ts 2>/dev/null \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next" \
  | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' \
  | sort -u
```

### 1.2 對比 .env.example

```bash
cat .env.example 2>/dev/null || echo ".env.example NOT FOUND"
```

### 1.3 檢查是否有 hardcoded 測試值

```bash
# 找 hardcoded 測試 URL 或測試金鑰
grep -rn "localhost\|127\.0\.0\.1\|3002607\|2000933\|2000132\|test.*key\|staging" \
  app/ lib/ components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|\.env\|README\|\.md" \
  | head -30

# 找 hardcoded Supabase URL（應該用環境變數）
grep -rn "supabase\.co" app/ lib/ components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|process\.env\|\.env" \
  | head -10

# 找 hardcoded API Key
grep -rn "eyJ\|sk-\|gk_\|AIza" app/ lib/ components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|\.env" \
  | head -10
```

---

## 審計 ② 結帳流程關鍵路徑

### 2.1 Gateway URL 來源

```bash
# 確認 Gateway URL 從環境變數讀取，不是 hardcoded
grep -rn "ecpay-gateway\|GATEWAY_URL\|ECPAY_GATEWAY" app/ lib/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next" \
  | head -20
```

### 2.2 價格來源驗證

```bash
# 確認金額從 server/DB 取，不是前端傳入
grep -rn "amount\|price\|total" app/api/payment/ app/checkout/ lib/gateway.ts \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next" \
  | head -30
```

### 2.3 結帳頁 Client/Server 分界

```bash
# 確認結帳頁是否有 'use client'
head -5 app/checkout/page.tsx
# 確認結帳完成頁
head -5 app/checkout/complete/page.tsx 2>/dev/null || ls app/checkout/complete/ 2>/dev/null
```

---

## 審計 ③ 錯誤處理檢查

### 3.1 API Route 錯誤處理

```bash
# 找所有 API route
find app/api -name "route.ts" | head -30

# 檢查是否有 try-catch
for f in $(find app/api -name "route.ts" | head -20); do
  has_try=$(grep -c "try {" "$f" 2>/dev/null || echo "0")
  has_catch=$(grep -c "catch" "$f" 2>/dev/null || echo "0")
  echo "$f: try=$has_try catch=$has_catch"
done
```

### 3.2 Supabase 查詢錯誤處理

```bash
# 找 supabase 查詢後沒有檢查 error 的地方
grep -n "await.*supabase" lib/cms.ts | head -20
grep -n "\.error\|if.*error" lib/cms.ts | head -20
```

### 3.3 未處理的 .single() 呼叫

```bash
# .single() 在 0 筆或多筆時會拋錯，應該用 .maybeSingle()
grep -rn "\.single()" lib/ app/ components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next\|maybeSingle" \
  | head -20
```

---

## 審計 ④ 安全性檢查

### 4.1 Service Role Key 暴露風險

```bash
# service_role_key 不應該出現在 NEXT_PUBLIC_ 開頭的變數中
grep -rn "NEXT_PUBLIC.*SERVICE_ROLE\|NEXT_PUBLIC.*service_role" \
  app/ lib/ components/ .env.example \
  --include="*.ts" --include="*.tsx" --include="*.env*" \
  | grep -v "node_modules" \
  | head -10

# 確認 service_role_key 只在 server-side 使用
grep -rn "SERVICE_ROLE_KEY" app/ lib/ components/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|\.next" \
  | head -20
```

### 4.2 CORS 設定

```bash
# 檢查是否有 CORS header 設定
grep -rn "Access-Control\|cors\|CORS" app/api/ middleware.ts \
  --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v "node_modules" \
  | head -10
```

### 4.3 Session 安全

```bash
# 確認 cookie 設定有 HttpOnly、Secure、SameSite
grep -rn "httpOnly\|HttpOnly\|secure\|SameSite\|sameSite" lib/auth.ts app/api/auth/ \
  --include="*.ts" \
  | grep -v "node_modules" \
  | head -10
```

---

## 審計 ⑤ 效能 + SEO 基本檢查

### 5.1 圖片優化

```bash
# 檢查是否使用 next/image 而非原生 <img>
grep -rn "<img " components/ app/ \
  --include="*.tsx" \
  | grep -v "node_modules\|\.next\|dangerouslySetInnerHTML\|JSON\.stringify" \
  | head -20

# 統計 next/image vs 原生 img 比例
echo "=== next/image usage ==="
grep -rn "from.*next/image\|import.*Image.*from.*next" components/ app/ \
  --include="*.tsx" | wc -l

echo "=== raw <img> usage ==="
grep -rn "<img " components/ app/ \
  --include="*.tsx" | grep -v "node_modules\|\.next" | wc -l
```

### 5.2 頁面載入關鍵資源

```bash
# 檢查是否有不必要的 'use client' 在頂層頁面
for f in $(find "app/(website)" -name "page.tsx" 2>/dev/null); do
  has_client=$(head -3 "$f" | grep -c "use client" || echo "0")
  echo "$f: use_client=$has_client"
done
```

### 5.3 404 頁面

```bash
# 確認有自訂 404 頁面
ls app/not-found.tsx 2>/dev/null || echo "NO CUSTOM 404"
```

### 5.4 Loading 狀態

```bash
# 確認有 loading.tsx（Suspense boundary）
find app/ -name "loading.tsx" 2>/dev/null | head -10
```

---

## 審計 ⑥ 部署配置

### 6.1 next.config 檢查

```bash
cat next.config.js 2>/dev/null || cat next.config.mjs 2>/dev/null || cat next.config.ts 2>/dev/null
```

重點確認：
- `images.domains` 或 `images.remotePatterns` 有包含 Supabase Storage 和 Medusa 的域名
- 沒有開發用設定被帶到 production（如 `reactStrictMode: false`）

### 6.2 Vercel 配置

```bash
cat vercel.json 2>/dev/null || echo "NO vercel.json"
```

### 6.3 Package.json scripts

```bash
grep -A 5 '"scripts"' package.json
```

---

## 輸出報告

寫入 `docs/Pre_Launch_Part3_Tech_Audit_Report.md`：

```markdown
# 上線前 Part 3：技術審計報告
> 日期：2026-02-17
> 審計範圍：Storefront-MVP---ready-for-deployment

---

## 1. 環境變數

### 引用的環境變數清單
| 變數名 | 在 .env.example | 備註 |
|--------|:---------------:|------|
| MEDUSA_BACKEND_URL | ✅/❌ | |
| SUPABASE_URL | ✅/❌ | |
| ... | ... | ... |

### ⚠️ Hardcoded 測試值
| 檔案 | 行號 | 內容 | 風險 |
|------|------|------|------|
| ... | ... | ... | ... |

（沒發現就寫「✅ 未發現 hardcoded 測試值」）

---

## 2. 結帳流程

### Gateway URL
- 來源：環境變數 / hardcoded
- 變數名：...

### 價格來源
- 從 server 取：✅/❌
- 前端傳入風險：有/無

---

## 3. 錯誤處理

### API Route 錯誤處理覆蓋率
| API Route | try-catch | 備註 |
|-----------|:---------:|------|
| /api/auth/line/callback | ✅/❌ | |
| /api/payment/init | ✅/❌ | |
| ... | ... | ... |

### ⚠️ 危險的 .single() 呼叫
| 檔案 | 行號 | 建議改為 .maybeSingle() |
|------|------|------------------------|
| ... | ... | ... |

（沒發現就寫「✅ 未發現危險的 .single() 呼叫」）

---

## 4. 安全性

| 項目 | 狀態 | 備註 |
|------|:----:|------|
| Service Role Key 未暴露前端 | ✅/❌ | |
| Cookie HttpOnly + Secure | ✅/❌ | |
| CORS 設定 | 有/無/N/A | |

---

## 5. 效能 + SEO

| 項目 | 狀態 | 備註 |
|------|:----:|------|
| next/image 使用比例 | X / Y | |
| 自訂 404 頁面 | ✅/❌ | |
| loading.tsx 存在 | ✅/❌ | |
| 頂層頁面無不必要的 'use client' | ✅/❌ | 列出有問題的頁面 |

---

## 6. 部署配置

### next.config
- images.remotePatterns 包含 Supabase：✅/❌
- images.remotePatterns 包含 Medusa：✅/❌

### 異常發現
（列出任何不尋常的配置）

---

## 總結

### 🔴 必須修復（上線阻斷）
1. ...

### 🟡 建議修復（影響品質）
1. ...

### 🟢 無風險
1. ...

---

## 完整掃描 Log

（附上所有 grep 指令的原始輸出，方便人工判讀）
```

**這份報告只做掃描，不做任何修改。不要 git commit。**
