# MINJIE 網站上線前驗證清單
# Claude Code 執行指令

> 日期：2026-02-15
> 目的：逐項確認網站上線前各功能的實際完成狀態
> 執行方式：Claude Code 依序檢查程式碼、環境變數、API 端點

---

## 使用方式

請 Claude Code 逐項執行以下檢查，每項回報：
- ✅ 已完成（附證據）
- ⚠️ 部分完成（說明缺什麼）
- ❌ 未完成（說明需要做什麼）
- ❓ 無法確認（需要人工檢查的項目）

---

## 一、Storefront 切版狀態確認

### 檢查指令

```bash
# 1. 確認路由結構是否已重構
ls -la app/\(website\)/
ls -la app/\(liff\)/

# 2. 確認首頁是否已從商品列表改為品牌首頁
cat app/\(website\)/page.tsx | head -50

# 3. 確認商品列表頁存在
ls -la app/\(website\)/products/

# 4. 確認商品詳情頁存在
ls -la app/\(website\)/products/\[handle\]/

# 5. 確認黑金色系 CSS 變數
grep -r "D4AF37\|--gold\|--bg-primary\|0a0a0a" app/ styles/ --include="*.css" --include="*.tsx" | head -20

# 6. 確認 Layout 元件（Header/Footer）
ls -la components/website/
cat components/website/Header.tsx | head -30
cat components/website/Footer.tsx | head -30 2>/dev/null || echo "Footer 不存在"

# 7. CMS ImageSection 元件
cat components/cms/ImageSection.tsx | head -30 2>/dev/null || echo "ImageSection 不存在"

# 8. CMS 查詢函數
cat lib/cms.ts | head -50 2>/dev/null || echo "cms.ts 不存在"
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 1.1 | Route Group `(website)` 已建立 | 檢查目錄結構 |
| 1.2 | 首頁已改為品牌首頁（非商品列表） | 檢查 page.tsx 內容 |
| 1.3 | 商品列表頁 `/products` | 檢查檔案存在 + 含分類篩選 |
| 1.4 | 商品詳情頁 `/products/[handle]` | 檢查檔案存在 + 含變體選擇 |
| 1.5 | 黑金色系 CSS Token | 檢查 globals.css |
| 1.6 | Header 含 UserMenu（非舊版 LineLoginButton） | 檢查 Header.tsx |
| 1.7 | Footer 存在且含聯絡資訊 | 檢查 Footer.tsx |
| 1.8 | 6 個 CMS 圖片區塊 | 檢查 ImageSection 元件 |
| 1.9 | ISR Revalidation API | 檢查 `app/api/revalidate/route.ts` |

---

## 二、結帳流程完整性

### 檢查指令

```bash
# 1. 結帳頁面存在
cat app/checkout/page.tsx | head -80

# 2. 付款完成頁
ls -la app/checkout/complete/ 2>/dev/null || echo "complete 頁面不存在"

# 3. Gateway API 呼叫
cat lib/gateway.ts | head -50

# 4. Medusa Payment 初始化 API
cat app/api/payment/init/route.ts 2>/dev/null | head -50 || echo "payment init 不存在"

# 5. 結帳頁是否含物流選擇（宅配/超商）
grep -n "shipping\|物流\|宅配\|超商\|CVS" app/checkout/page.tsx | head -20

# 6. 免運門檻邏輯
grep -n "免運\|free.shipping\|3000\|1000" app/checkout/page.tsx lib/gateway.ts | head -10

# 7. 購物車功能
cat components/CartProvider.tsx | head -50
cat components/CartDrawer.tsx | head -30 2>/dev/null || echo "CartDrawer 不存在"

# 8. 超商選店（Mobile/Desktop 分流）
grep -rn "window.open\|window.location\|cvs.map\|about:blank" app/checkout/ lib/ --include="*.tsx" --include="*.ts" | head -10
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 2.1 | 結帳頁含收件人表單 | 檢查 page.tsx |
| 2.2 | 物流選擇（宅配 + 超商取貨） | grep 關鍵字 |
| 2.3 | 付款方式選擇（信用卡 / ATM / 超商代碼） | grep 關鍵字 |
| 2.4 | ECPay Gateway 串接（checkout_url 導向） | 檢查 gateway.ts |
| 2.5 | 付款完成頁存在 | 檢查目錄 |
| 2.6 | 免運門檻自動判斷 | 檢查邏輯 |
| 2.7 | 超商選店 popup blocker 修復 | Desktop: window.open / Mobile: location.href |
| 2.8 | 購物車 CRUD（加入/修改數量/刪除） | 檢查 CartProvider |
| 2.9 | 已登入自動帶入收件資訊 | 檢查結帳頁 fetch profile/addresses |

---

## 三、金流物流環境確認

### 檢查指令

```bash
# 1. Gateway 健康檢查
curl -s https://ecpay-gateway-production.up.railway.app/health | head -5

# 2. Gateway 商家列表確認（需 admin key）
# 手動：確認 minjie / minjie-logistics / minjie-c2c 三個商家都存在

# 3. 確認 Gateway 穩定性修復（Graceful Shutdown）
# 在 ecpay-gateway repo 中檢查：
grep -rn "SIGTERM\|graceful\|shutdown" src/ --include="*.ts" --include="*.js" | head -10

# 4. Webhook 冪等性
grep -rn "idempotent\|already.*processed\|1|OK" src/ --include="*.ts" | head -10

# 5. Async Capture
grep -rn "setImmediate\|fire.and.forget\|async.*capture" src/ --include="*.ts" | head -10

# 6. 環境變數確認（Storefront）
# 列出 .env.local 或 .env 中與金流相關的變數（不顯示值）
grep -E "ECPAY|GATEWAY|MERCHANT" .env.local .env 2>/dev/null | sed 's/=.*/=***/'

# 7. 確認 ORDER_WEBHOOK_SECRET 是否在 Railway 環境中
# 手動確認：Railway Dashboard → ecpay-gateway → Variables
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 3.1 | Gateway 服務正常運行 | curl health endpoint |
| 3.2 | 三個商家都已建立（minjie / minjie-logistics / minjie-c2c） | API 或 DB 查詢 |
| 3.3 | Graceful Shutdown 已實作 | grep SIGTERM |
| 3.4 | Webhook 冪等性已實作 | grep idempotent |
| 3.5 | ORDER_WEBHOOK_SECRET 已設定 | Railway 環境變數 |
| 3.6 | 正式環境憑證狀態 | 目前全部 is_staging=true，上線前需切換 |

---

## 四、庫存問題確認

### 檢查指令

```bash
# 1. 前端庫存顯示邏輯
grep -rn "inventory\|in_stock\|stock\|庫存" app/ components/ lib/ --include="*.tsx" --include="*.ts" | head -20

# 2. Medusa API 商品回傳是否含 inventory
curl -s "https://medusa-store-minjie-production.up.railway.app/store/products?limit=3" \
  -H "x-publishable-api-key: pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print(p.get('title','?'), [v.get('inventory_quantity','N/A') for v in p.get('variants',[])]) for p in d.get('products',[])]" 2>/dev/null || echo "需手動檢查 Medusa API"
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 4.1 | Medusa 商品有 inventory_quantity | API 查詢 |
| 4.2 | 前端有庫存為 0 時的「缺貨」顯示 | 檢查商品詳情頁 |
| 4.3 | 加入購物車時檢查庫存 | 檢查 CartProvider |

---

## 五、會員系統確認

### 檢查指令

```bash
# 1. 認證 API 完整性
ls -la app/api/auth/email/
ls -la app/api/auth/line/

# 2. 會員 API 完整性
ls -la app/api/member/

# 3. 登入頁面
ls -la app/\(website\)/login/
cat app/\(website\)/login/page.tsx | head -20

# 4. 會員中心
ls -la app/\(website\)/account/

# 5. Session Cookie 邏輯
grep -rn "line_session\|HttpOnly\|session" lib/auth.ts | head -15

# 6. 環境變數
grep -E "RESEND|LIFF_ID|MEDUSA_ADMIN" .env.local .env 2>/dev/null | sed 's/=.*/=***/'
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 5.1 | LINE Login 完整流程 | auth/line/* API 存在 |
| 5.2 | Email 註冊/登入/忘記密碼 | auth/email/* 6 支 API |
| 5.3 | 會員中心 4 Tab | account/ 頁面 |
| 5.4 | 訂單歷史查詢 | member/orders API |
| 5.5 | 地址/門市 CRUD | member/addresses + cvs-stores |
| 5.6 | 結帳後自動儲存地址 | checkout page.tsx |

---

## 六、已知 Bug 確認

### 檢查指令

```bash
# 1. 商品價格 $0 問題
# 查詢「水嫩肌密玻尿酸膠囊」的價格
curl -s "https://medusa-store-minjie-production.up.railway.app/store/products?q=玻尿酸" \
  -H "x-publishable-api-key: pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print(p['title'], [v.get('calculated_price',{}).get('calculated_amount','N/A') for v in p.get('variants',[])]) for p in d.get('products',[])]" 2>/dev/null

# 2. Logo 路徑
grep -rn "logo\|Logo" components/website/Header.tsx | head -10
ls -la public/tenant/ 2>/dev/null || echo "public/tenant/ 不存在"

# 3. 品牌故事區圖片
grep -rn "brand.story\|品牌故事\|about" app/\(website\)/page.tsx | head -10
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 6.1 | 玻尿酸膠囊價格是否為 $0 | Medusa API 查詢 |
| 6.2 | Logo 圖片是否存在於正確路徑 | 檢查 public/ 或 Supabase Storage |
| 6.3 | 品牌故事區圖片是否正常 | 檢查元件引用 |

---

## 七、SEO 基礎確認

### 檢查指令

```bash
# 1. Root Layout 的 metadata
grep -A 20 "metadata" app/layout.tsx | head -25

# 2. 商品頁 generateMetadata
grep -rn "generateMetadata\|Metadata" app/\(website\)/products/ --include="*.tsx" | head -10

# 3. Sitemap
ls -la app/sitemap.ts 2>/dev/null || echo "sitemap.ts 不存在"
ls -la public/sitemap.xml 2>/dev/null || echo "sitemap.xml 不存在"

# 4. robots.txt
ls -la app/robots.ts 2>/dev/null || echo "robots.ts 不存在"
ls -la public/robots.txt 2>/dev/null || echo "robots.txt 不存在"

# 5. OG Image
grep -rn "openGraph\|og:image\|twitter" app/layout.tsx app/\(website\)/ --include="*.tsx" | head -10
```

### 需確認項目

| # | 項目 | 檢查方式 |
|---|------|----------|
| 7.1 | Root metadata（title / description） | layout.tsx |
| 7.2 | 商品頁動態 metadata | generateMetadata |
| 7.3 | Sitemap 自動生成 | sitemap.ts |
| 7.4 | robots.txt | 檔案存在 |
| 7.5 | OG Image 設定 | openGraph metadata |

---

## 八、環境變數完整性（Vercel）

> 以下為 Storefront 需要的所有環境變數，Claude Code 檢查 `.env.local` 或 `.env.example` 是否都有列出：

```bash
grep -E "^[A-Z_]+" .env.example .env.local 2>/dev/null | sed 's/=.*//' | sort -u
```

### 必要變數清單

| 變數 | 用途 | 必要性 |
|------|------|--------|
| `MERCHANT_CODE` | minjie | 必要 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa API | 必要 |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Medusa Store API | 必要 |
| `MEDUSA_BACKEND_URL` | Server-side Medusa | 必要 |
| `MEDUSA_ADMIN_EMAIL` | Admin API 認證 | 必要 |
| `MEDUSA_ADMIN_PASSWORD` | Admin API 認證 | 必要 |
| `SUPABASE_URL` | Supabase | 必要 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理 | 必要 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 前端 | 必要 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 | 必要 |
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF | 必要 |
| `RESEND_API_KEY` | 寄信 | 必要 |
| `ECPAY_GATEWAY_URL` | Gateway | 必要 |
| `ECPAY_GATEWAY_API_KEY` | Gateway 認證 | 必要 |
| `REVALIDATE_SECRET` | ISR revalidation | 必要 |
| `LINE_CHANNEL_ID` | LINE Login | 必要 |
| `LINE_CHANNEL_SECRET` | LINE Login | 必要 |

---

## 九、執行摘要模板

Claude Code 檢查完畢後，請填入以下摘要：

```
## 上線前狀態摘要

### 🔴 阻擋上線（Must Fix）
1. [項目] — [狀態] — [需要做什麼]

### 🟡 建議修復（Should Fix）
1. [項目] — [狀態] — [需要做什麼]

### ✅ 已確認完成
1. [項目]

### ❓ 需人工確認
1. [項目] — [原因]

### 預估剩餘工作量
- 切版：X 天
- Bug 修復：X 天
- 測試：X 天
- 總計：X 天
```

---

*此文件用於 Claude Code 系統性驗證，請放入 Storefront repo 的 `/docs` 目錄或同步至 CLAUDE.md*
