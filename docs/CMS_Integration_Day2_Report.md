# CMS ↔ Storefront Day 2 串接報告
> 日期：2026-02-15

---

## ① CMS 全頁面 Revalidation

### 工具函式
- 位置：`lib/revalidate.ts`（新建）
- 呼叫方式：`revalidateStorefront(paths: string[])` — 呼叫 CMS 內部 `/api/revalidate-storefront` API
- 失敗時 `console.warn` 但不 throw，不阻擋 CMS 儲存操作
- 同時更新 `homepage-sections` 原有 inline `triggerRevalidation()` 改用共用工具函式

### API Route 更新
- `app/api/revalidate-storefront/route.ts`：
  - 新增 `paths` 陣列支援（相容原有 `path` 單路徑）
  - Storefront URL 改用 `process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL` 環境變數（保留 hardcoded fallback）

### 各管理頁面狀態

| 管理頁面 | 修改前 | 修改後 | revalidate paths |
|---------|:------:|:------:|-----------------|
| 首頁圖片區塊 (homepage-sections) | ✅ 已有 | ✅ 改用共用函式 | `['/']` |
| Banner 管理 | ❌ | ✅ | `['/']`（save / delete / toggle） |
| 商品推薦管理 (products) | ❌ | ✅ | `['/', '/products']` |
| 文章列表 (articles) | ❌ | ✅ | `['/', '/blog']`（delete） |
| 新增文章 (articles/new) | ❌ | ✅ | `['/', '/blog']`（僅 published 時觸發） |
| 編輯文章 (articles/[slug]) | ❌ | ✅ | `['/', '/blog']`（僅 published 時觸發） |
| 內容管理 (content/[pageKey]) | ❌ | ✅ | `['/']`（圖片上傳 + 政策儲存） |
| SEO 全站設定 (seo) | ❌ | ✅ | `['/', '/products', '/blog']` |
| SEO 頁面設定 (seo/[pageKey]) | ❌ | ✅ | `['/', '/products', '/blog']` |
| 活動管理 (events/[eventId]) | ❌ | ✅ | `['/']` |
| 商家設定 (settings) | ❌ | ✅ | `['/']`（saveBasicInfo） |
| LINE Bot 回覆管理 | — | — | 不需要（前台不讀） |
| 促銷規則管理 | — | — | 不需要（走 Medusa） |
| 會員管理 | — | — | 不需要（動態資料） |

### CMS Build
- `npm run build`：✅ 成功（43 routes）

---

## ② AnnouncementBar

### 檔案狀態

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `components/cms/AnnouncementBar.tsx` | ✅ 已存在 | Client component，支援 auto-rotate、dismiss、type styling |
| `components/cms/AnnouncementBarServer.tsx` | ✅ 新建 | Server component 包裝，呼叫 `getAnnouncements()` |
| `lib/cms.ts` `getAnnouncements()` | ✅ 已存在 | 過濾 is_active + valid_from/until + sort_order |

### 串接方式
- Layout 類型：**Server Component**（`app/(website)/layout.tsx`）
- 整合方式：`<Suspense fallback={null}><AnnouncementBarServer /></Suspense>` 放在 `<Header />` 正下方
- 改善：原本 layout 直接 fetch + 傳 props，改用 Server Component wrapper + Suspense，更乾淨且不阻擋 Header 渲染
- 沒有公告時的行為：`AnnouncementBarServer` 回傳 `null`，不佔空間

---

## ③ Footer 動態化

### 修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `components/website/Footer.tsx` | **無需修改** — 已完整實現動態化 |

### 已有功能（無需修改）

Footer 已在先前版本完成動態化：

### 資料來源

| 欄位 | 來源 | Fallback |
|------|------|---------|
| 店名 | `merchant_settings.store_name` | `config.store.name` |
| Email | `merchant_settings.contact_email` | `config.contact.email` |
| 電話 | `merchant_settings.contact_phone` | `config.contact.phone` |
| LINE | `merchant_settings.line_oa_url` | `config.contact.lineOA` |
| Facebook | `merchant_settings.facebook_url` | `config.contact.facebook` |
| Instagram | `merchant_settings.instagram_url` | `config.contact.instagram` |
| 連結列表 | `cms_sections (home, footer_info).links` | hardcoded 5 links |
| 社群連結覆蓋 | `cms_sections (home, footer_info).social` | merchant_settings 值 |
| 年份 | `new Date().getFullYear()` | — |

---

## ④ 信任數字動態化

### 修改方式
- 資料來源：`cms_sections` WHERE `page='home'` AND `section_key='trust_numbers'`
- 元件：`components/cms/TrustNumbers.tsx`（已存在，接受 `data` prop）
- Fallback：元件內建預設數字（900+, 689萬, 19K+, 95%）
- DB 有資料時顯示 `data.items` 陣列
- DB 沒資料時顯示內建 fallback

### 修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `app/(website)/page.tsx` | 並行 fetch 新增 `getSection('home', 'trust_numbers')`，渲染 `<TrustNumbers data={trustNumbers} />` |

---

## Build 結果
- Storefront `npm run build`：✅ 成功（72 頁面）
- CMS `npm run build`：✅ 成功（43 routes）

---

## 修改檔案總表

| Repo | 檔案 | 修改內容 |
|------|------|----------|
| CMS | `lib/revalidate.ts` | **新建** — 統一 revalidation 工具函式 |
| CMS | `app/api/revalidate-storefront/route.ts` | 新增 paths 陣列支援 + 使用環境變數 |
| CMS | `app/s/[token]/homepage-sections/page.tsx` | 改用共用 `revalidateStorefront()` |
| CMS | `app/s/[token]/banners/page.tsx` | 新增 save/delete/toggle 後 revalidation |
| CMS | `app/s/[token]/products/page.tsx` | 新增 saveFeatured 後 revalidation |
| CMS | `app/s/[token]/articles/page.tsx` | 新增 delete 後 revalidation |
| CMS | `app/s/[token]/articles/new/page.tsx` | 新增 published 後 revalidation |
| CMS | `app/s/[token]/articles/[slug]/page.tsx` | 新增 published 後 revalidation |
| CMS | `app/s/[token]/content/[pageKey]/page.tsx` | 新增 image upload + policy save 後 revalidation |
| CMS | `app/s/[token]/seo/page.tsx` | 新增 saveGlobalSeo 後 revalidation |
| CMS | `app/s/[token]/seo/[pageKey]/page.tsx` | 新增 saveSeo 後 revalidation |
| CMS | `app/s/[token]/events/[eventId]/page.tsx` | 新增 handleSave 後 revalidation |
| CMS | `app/s/[token]/settings/page.tsx` | 新增 saveBasicInfo 後 revalidation |
| Storefront | `components/cms/AnnouncementBarServer.tsx` | **新建** — Server component wrapper |
| Storefront | `app/(website)/layout.tsx` | 改用 `AnnouncementBarServer` + `Suspense` |
| Storefront | `app/(website)/page.tsx` | 新增 TrustNumbers CMS 資料 fetch + 渲染 |

---

## 剩餘需人工處理

1. **CMS 環境變數**：確認 Vercel 已設定 `REVALIDATE_SECRET` 和 `STOREFRONT_URL`（或 `NEXT_PUBLIC_STOREFRONT_URL`）
2. **E2E 測試**：建議手動測試：CMS 修改 Banner → 確認 Storefront 前台 1 小時內自動更新（或手動觸發 revalidation）
3. **CMS `cms_announcements` 資料**：需在 CMS 後台建立公告資料，否則 AnnouncementBar 不會顯示
4. **CMS `cms_sections` trust_numbers 資料**：需在 CMS 後台建立信任數字資料，否則使用元件內建 fallback
5. **Settings debounced auto-save**：`updateSettings()` 的 debounce save 未加 revalidation（僅 `saveBasicInfo` 有），若需要 feature toggle 即時反映前台，需額外處理
6. **CMS 公告管理 revalidation**：CMS 目前沒有獨立的公告管理頁面（announcements），若未來新增需補 revalidation
