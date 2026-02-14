# Pre-Launch 修復 + 驗證指令（一次到底）

> 日期：2026-02-15
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**

---

## 第一部分：修復 Blocker

### Blocker 1A：Medusa API inventory_quantity 參數

**最優先**。搜尋 `lib/` 和 `app/` 中所有呼叫 Medusa `/store/products` 的地方，確認 query params 是否有帶 `fields` 含 `variants.inventory_quantity`。

- 如果沒有，加上 `fields=*variants,+variants.inventory_quantity` 或在現有 fields 參數中追加
- 同時檢查商品詳情頁 `app/(website)/products/[handle]/page.tsx` 的單品 API 呼叫，確保也帶了 inventory 欄位
- 檢查 `getProducts()`、`getProductByHandle()` 或任何類似的封裝函式

### Blocker 1B：ProductDetailClient 庫存檢查

在 `components/ProductDetailClient.tsx` 中：

1. 從選中的 variant 讀取 `inventory_quantity`
2. 定義判斷邏輯：
   - `inventory_quantity` 為 `undefined` 或 `null` → 視為可購買（不阻擋）
   - `inventory_quantity <= 0` → 缺貨
   - `inventory_quantity > 0 && inventory_quantity <= 5` → 低庫存提示
3. 缺貨時：
   - 加入購物車按鈕設為 `disabled`
   - 按鈕文字改為「暫時缺貨」
   - 按鈕樣式改為灰色（移除金色漸層），加 `opacity-50 cursor-not-allowed`
4. 低庫存時：
   - 按鈕正常可點
   - 按鈕附近顯示「僅剩 X 件」提示文字（金色 `#D4AF37`）
5. 缺貨時顯示「此商品目前缺貨」提示（紅色 `text-red-400`）

### Blocker 1C：CartProvider 錯誤處理

在 `components/CartProvider.tsx` 的 `addItem`（或 `addToCart`）函式中：

- 加入 try/catch
- 捕獲 Medusa 回傳的庫存不足錯誤（HTTP 409 或 response 含 `inventory` / `insufficient` 關鍵字）
- 庫存不足時顯示提示訊息（用現有的 toast/alert 機制，或 console.error + alert fallback）
- 不要因為錯誤讓整個購物車 state 壞掉

### Blocker 2：Logo Fallback

1. 建立 `public/tenant/` 目錄（如果不存在）
2. 檢查 `components/website/Header.tsx` 的 Logo 渲染邏輯
3. 確認已有 fallback（logo 為空時顯示文字）。如果沒有，加上：

```tsx
{store.logo ? (
  <Image src={store.logo} alt={store.name} width={120} height={40} />
) : (
  <span className="text-[#D4AF37] text-lg font-light tracking-[3px] uppercase">
    {store.name || 'MINJIE STUDIO'}
  </span>
)}
```

4. 確認 `config/store.json` 的 `name` 欄位有值（應為 `MINJIE STUDIO` 或類似）

### Blocker 3：環境變數

1. 在 `.env.example` 補上（如果沒有）：
```env
# ISR Revalidation（CMS 修改後觸發前端更新，自訂隨機字串，需與 CMS 端一致）
REVALIDATE_SECRET=
# LINE LIFF App ID（從 LINE Developers Console 取得）
NEXT_PUBLIC_LIFF_ID=
# Supabase 前端用（client-side 操作需要）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

2. 檢查 `app/api/revalidate/route.ts`，確認安全邏輯：
   - 如果 `REVALIDATE_SECRET` 未設定 → 回傳 500，log 錯誤，**不放行**
   - 如果 request header 的 secret 不匹配 → 回傳 403
   - 不要有任何「secret 沒設就跳過驗證」的 fallback

如果現有邏輯不符合，修改為：
```ts
const secret = process.env.REVALIDATE_SECRET;
if (!secret) {
  console.error('REVALIDATE_SECRET not configured');
  return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
}
if (req.headers.get('x-revalidate-secret') !== secret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

---

## 第二部分：SEO 補強

### A. 確認 sitemap.ts

檢查 `app/sitemap.ts` 是否存在。如果存在，確認：
- 有靜態頁面（首頁、商品列表）
- 有動態商品頁（從 Medusa API 取 handle）
- Medusa API 呼叫用 server-side 變數 `MEDUSA_BACKEND_URL`（不是 `NEXT_PUBLIC_` 開頭的）

如果用了 `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`，改為 server-side 的 publishable key 環境變數，或直接用已有的 `NEXT_PUBLIC_` 但加個 `// NOTE: server-side only usage` 註解。

### B. 確認 robots.ts

檢查 `app/robots.ts` 是否存在。如果存在，確認 disallow 含 `/api/`、`/checkout/`、`/liff/`。

### C. 確認 OG Metadata

檢查 `app/layout.tsx` 或 `app/(website)/layout.tsx` 是否有 `openGraph` 設定。如果沒有，在 metadata 中補上：
```ts
openGraph: {
  title: 'MINJIE STUDIO | 專業美容保健品牌',
  description: 'MINJIE STUDIO 提供高品質美容保健產品',
  url: 'https://shop.minjie0326.com',
  siteName: 'MINJIE STUDIO',
  locale: 'zh_TW',
  type: 'website',
},
```

---

## 第三部分：跨 Repo 驗證（ecpay-gateway）

切換到 ecpay-gateway repo（`O:\Projects\ecpay-gateway`），執行以下檢查：

### ❓ 2：Graceful Shutdown
```bash
grep -rn "SIGTERM\|SIGINT\|graceful\|shutdown" src/ --include="*.ts" --include="*.js"
```
記錄是否有 SIGTERM handler，有的話記錄檔名和行號。

### ❓ 3：Webhook 冪等性
```bash
grep -rn "idempotent\|already.*processed\|duplicate\|1|OK" src/ --include="*.ts" --include="*.js"
```
記錄是否有重複 webhook 處理邏輯。

### ❓ 4：環境變數
```bash
grep -rn "ORDER_WEBHOOK_SECRET\|WEBHOOK_SECRET" src/ --include="*.ts" --include="*.js"
```
記錄是否有使用此變數，以及用在哪裡。

### ❓ 1 & 5：商家狀態
```bash
curl -s https://ecpay-gateway-production.up.railway.app/health
```
記錄 Gateway 狀態。商家和 is_staging 需要 admin API key 才能查，標記為「需人工在 Railway DB 確認」。

完成後切回 Storefront repo（`O:\Projects\Storefront-MVP---ready-for-deployment`）。

---

## 第四部分：Build 驗證

全部修改完成後，在 Storefront repo 執行：

```bash
npm run build
```

- 如果 build 成功 → 記錄 ✅
- 如果 build 失敗 → 記錄錯誤訊息，嘗試修復 TypeScript / import 錯誤，修完再 build 一次
- 最多嘗試 3 次修復

---

## 第五部分：輸出最終報告

全部完成後，把結果寫入 `docs/Pre_Launch_Fix_Report.md`，格式如下：

```markdown
# Pre-Launch 修復報告
> 日期：2026-02-15

## 修改檔案清單
| 檔案 | 修改內容 |
|------|----------|
| xxx | xxx |

## Blocker 修復狀態
| Blocker | 狀態 | 說明 |
|---------|------|------|
| 1A inventory_quantity 參數 | ✅/❌ | ... |
| 1B 前端庫存 UI | ✅/❌ | ... |
| 1C CartProvider 錯誤處理 | ✅/❌ | ... |
| 2 Logo fallback | ✅/❌ | ... |
| 3 環境變數 + revalidate 安全 | ✅/❌ | ... |

## SEO 補強狀態
| 項目 | 狀態 | 說明 |
|------|------|------|
| sitemap.ts | ✅/❌ | ... |
| robots.ts | ✅/❌ | ... |
| OG metadata | ✅/❌ | ... |

## Gateway 驗證結果
| 項目 | 狀態 | 說明 |
|------|------|------|
| Graceful Shutdown | ✅/❌/❓ | ... |
| Webhook 冪等性 | ✅/❌/❓ | ... |
| WEBHOOK_SECRET 使用 | ✅/❌/❓ | ... |
| Gateway Health | ✅/❌ | ... |
| 商家 is_staging | ❓ 需人工確認 | ... |

## Build 結果
- npm run build：✅ 成功 / ❌ 失敗（原因：...）

## 剩餘需人工處理
1. ...
```

**不要 git commit，等人工確認後再 commit。**
