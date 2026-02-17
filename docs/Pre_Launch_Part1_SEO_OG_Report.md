# 上線前 Part 1：SEO + OG 執行報告
> 日期：2026-02-17

## 盤點結果

### lib/cms.ts 函數
| 函數 | 狀態 | 說明 |
|------|:----:|------|
| getPageSeo | ✅ 重寫 | 改用 `maybeSingle()` + typed return `{ meta_title, meta_description, og_image, og_title, canonical_url, no_index }` |
| getGlobalSeo | ✅ 新增 | 全站 SEO 設定查詢 (`cms_sections WHERE page='global', section_key='seo_settings'`) |
| DEFAULT_SEO | ✅ 新增 | Fallback 常數，涵蓋 home/products/blog/about/faq + default_og_image |

### 各頁面 Metadata
| 頁面 | 路徑 | 修改前 | 修改後 | 狀態 |
|------|------|--------|--------|:----:|
| 首頁 | `app/(website)/page.tsx` | 動態但欄位名 `seo.title` | CMS `meta_title` + `getGlobalSeo` + `DEFAULT_SEO` fallback，含 twitter card | ✅ |
| 商品列表 | `app/(website)/products/page.tsx` | 動態但欄位名 `seo.title` | CMS `meta_title` + `DEFAULT_SEO` fallback，含 openGraph | ✅ |
| 商品詳情 | `app/(website)/products/[handle]/page.tsx` | 已有動態 `generateMetadata` | 不動 | — |
| Blog | `app/(website)/blog/page.tsx` | 動態但欄位名 `seo.title` | CMS `meta_title` + `DEFAULT_SEO` fallback | ✅ |
| About | `app/(website)/about/page.tsx` | **靜態** `export const metadata` | 動態 `generateMetadata` + CMS + `DEFAULT_SEO` fallback | ✅ |
| FAQ | `app/(website)/faq/page.tsx` | **靜態** `export const metadata` | 動態 `generateMetadata` + CMS + `DEFAULT_SEO` fallback | ✅ |

### OG 圖片
| 項目 | 狀態 |
|------|:----:|
| public/og-image.jpg 存在 | ❌ 不存在 |
| metadataBase 已設定 | ✅ `https://shop.minjie0326.com` (app/layout.tsx) |
| Root layout OG fallback | ✅ 已有 `openGraph.images: [config.seo.ogImage]` |

### Revalidation API
| 項目 | 狀態 |
|------|:----:|
| /api/revalidate 存在 | ✅ |
| 支援多路徑 (`paths` + `path`) | ✅ |
| x-revalidate-secret 驗證 | ✅ |
| .env.example 已更新 | ✅ 已有 `REVALIDATE_SECRET` |

## 修改檔案
| 檔案 | 動作 | 說明 |
|------|------|------|
| `lib/cms.ts` | 修改 | 重寫 `getPageSeo`（typed return + `maybeSingle`），新增 `getGlobalSeo`、`DEFAULT_SEO` |
| `app/(website)/page.tsx` | 修改 | 首頁 metadata 改用 `getPageSeo` + `getGlobalSeo` + `DEFAULT_SEO` 三層 fallback |
| `app/(website)/products/page.tsx` | 修改 | 商品列表 metadata 欄位對齊 `meta_title`/`meta_description`，加 openGraph |
| `app/(website)/blog/page.tsx` | 修改 | Blog metadata 欄位對齊 `meta_title`/`meta_description` |
| `app/(website)/about/page.tsx` | 修改 | 靜態 metadata → 動態 `generateMetadata` + CMS fallback |
| `app/(website)/faq/page.tsx` | 修改 | 靜態 metadata → 動態 `generateMetadata` + CMS fallback |

## Build 結果
- `npm run build`：✅ 成功（72/72 pages generated）

## ⚠️ 需要人工處理
1. **`public/og-image.jpg` 不存在** — 需要放一張 1200×630 的 OG 圖片到 `public/og-image.jpg`，否則 fallback 的 OG image 路徑會 404
2. **`config/store.json` 的 `seo.ogImage`** — 確認此值指向的圖片實際存在（root layout 的 OG fallback 使用此值）
3. **Supabase `cms_sections` 資料** — 如果 DB 中沒有 `page='global', section_key='seo_settings'` 的資料，`getGlobalSeo` 會回傳 null（首頁會使用 `DEFAULT_SEO` fallback，不影響顯示）
