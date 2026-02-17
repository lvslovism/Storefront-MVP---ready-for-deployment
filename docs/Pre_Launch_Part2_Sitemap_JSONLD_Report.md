# 上線前 Part 2：Sitemap + JSON-LD 執行報告
> 日期：2026-02-17

## Sitemap
| 項目 | 狀態 |
|------|:----:|
| app/sitemap.ts 建立 | 已存在，已優化 |
| 靜態頁面包含（首頁、商品列表、Blog、About、FAQ） | ✅ |
| 動態商品頁面包含 | ✅ |
| 動態文章頁面包含 | ✅ |
| 政策頁面包含（privacy, terms, return, shipping） | ✅ |
| 商品取得方式 | `getProducts()` from `@/lib/medusa` |
| 文章取得方式 | `getPosts()` from `@/lib/cms` |
| 錯誤處理（try/catch） | ✅ 新增 — 商品/文章 fetch 失敗不阻擋 sitemap |
| 商品數量上限 | 200 個（從 100 調高） |

## robots.txt
| 項目 | 狀態 |
|------|:----:|
| robots.ts 存在 | ✅ 已存在 |
| 包含 Sitemap URL | ✅ `https://shop.minjie0326.com/sitemap.xml` |
| 禁止爬取 /api/ | ✅ |
| 禁止爬取 /checkout/ | ✅ |
| 禁止爬取 /account/ | ✅ 新增 |
| 禁止爬取 /liff/ | ✅ 已有 |

## JSON-LD
| Schema 類型 | 頁面 | 狀態 |
|-------------|------|:----:|
| Organization | 首頁（root layout） | ✅ 已存在於 `app/layout.tsx`，不重複添加 |
| WebSite + SearchAction | 首頁（root layout） | ✅ 已存在於 `app/layout.tsx`，不重複添加 |
| Product | 商品詳情 | ✅ 已存在 `generateProductJsonLd()` |
| BreadcrumbList | 商品詳情 | ✅ 新增 |
| FAQPage | FAQ 頁面 | ✅ 已存在 |
| BreadcrumbList | FAQ 頁面 | ✅ 已存在 |

### JSON-LD 備註
- Organization + WebSite 已在 `app/layout.tsx`（root layout）以全站 JSON-LD 形式存在，涵蓋所有頁面，因此不在首頁重複添加
- 商品詳情頁的 Product schema 已正確包含：name, description, image, url, brand, offers (price, currency, availability, seller)
- 價格使用 `price / 100`（Medusa v2 以 cents 儲存），保持現有邏輯不變

## 修改檔案
| 檔案 | 動作 | 說明 |
|------|------|------|
| `app/sitemap.ts` | 修改 | 加入 try/catch 錯誤處理、商品上限調至 200、結構重整 |
| `app/robots.ts` | 修改 | disallow 新增 `/account/` |
| `app/(website)/products/[handle]/page.tsx` | 修改 | 新增 BreadcrumbList JSON-LD（首頁 → 全部商品 → 商品名） |

## Build 結果
- `npm run build`：✅ 成功（72/72 pages generated）
- `sitemap.xml` 出現在 build output：✅
- `robots.txt` 出現在 build output：✅

## ⚠️ 需要人工處理
1. 部署後驗證：`curl https://shop.minjie0326.com/sitemap.xml`
2. 部署後驗證：`curl https://shop.minjie0326.com/robots.txt`
3. Google Search Console 提交 sitemap：`https://shop.minjie0326.com/sitemap.xml`
4. 用 [Google Rich Results Test](https://search.google.com/test/rich-results) 測試商品頁 JSON-LD
5. 用 [Schema.org Validator](https://validator.schema.org/) 驗證 Organization + Product schema
