# 上線前 Part 1：SEO Metadata 動態化 + OG 圖片

> 日期：2026-02-17
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`
> 部署目標：Vercel → `shop.minjie0326.com`

---

## 背景

CMS ↔ Storefront 串接中，`cms_sections (seo)` 各頁 metadata 標記為 ❌ 未串，現在是 hardcoded。
需要改成：優先從 DB 讀取，DB 沒資料時 fallback 到現有 hardcoded 值。

**核心原則：所有修改都必須有 fallback，DB 沒資料絕對不能白屏或顯示空白 title。**

---

## 任務 ① 盤點現狀

### Step 1.1：確認 lib/cms.ts 現有函數

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 列出 cms.ts 中所有 export 函數
grep -n "export.*function\|export.*const.*=" lib/cms.ts | head -30

# 確認是否已有 getSection 或 getPageSeo 函數
grep -n "getSection\|getPageSeo\|getSeo" lib/cms.ts

# 確認 Supabase client 導入方式
head -20 lib/cms.ts
```

### Step 1.2：確認各頁面現有 metadata

```bash
# 首頁
grep -n "metadata\|generateMetadata\|title\|description" "app/(website)/page.tsx" | head -20

# 商品列表頁
grep -n "metadata\|generateMetadata\|title\|description" "app/(website)/products/page.tsx" | head -20

# 商品詳情頁（這頁應該已經是動態的，確認即可）
grep -n "metadata\|generateMetadata" "app/(website)/products/[handle]/page.tsx" | head -10

# Blog 列表頁（可能不存在）
ls "app/(website)/blog/" 2>/dev/null && grep -n "metadata\|generateMetadata" "app/(website)/blog/page.tsx" | head -10

# Layout
grep -n "metadata\|generateMetadata" "app/(website)/layout.tsx" | head -10
grep -n "metadata\|generateMetadata" "app/layout.tsx" | head -10
```

### Step 1.3：確認 Supabase 中 cms_sections seo 資料

```bash
# 確認 cms_sections 表的查詢模式
grep -rn "cms_sections" lib/cms.ts | head -10
```

---

## 任務 ② 建立 SEO 查詢函數

在 `lib/cms.ts` 中**新增**以下函數（不修改任何既有函數簽名）：

```typescript
// ============================================
// SEO 查詢函數（上線前 Part 1 新增）
// ============================================

/** 預設 SEO 值 — DB 沒資料時的 fallback */
export const DEFAULT_SEO = {
  brand_name: 'MINJIE STUDIO',
  home: {
    title: 'MINJIE STUDIO｜嚴選保健食品',
    description: '嚴選全球頂級原料，打造專屬你的健康方案。益生菌、膠原蛋白、酵素等保健食品。',
  },
  products: {
    title: '全部商品｜MINJIE STUDIO',
    description: '瀏覽 MINJIE STUDIO 全系列保健食品，嚴選益生菌、膠原蛋白、酵素、養生飲品。',
  },
  blog: {
    title: '保健知識｜MINJIE STUDIO',
    description: 'MINJIE STUDIO 保健知識文章，幫助你了解更多健康資訊。',
  },
  about: {
    title: '品牌故事｜MINJIE STUDIO',
    description: '了解 MINJIE STUDIO 的品牌理念與堅持。',
  },
  faq: {
    title: '常見問題｜MINJIE STUDIO',
    description: 'MINJIE STUDIO 常見問題解答。',
  },
  default_og_image: '/og-image.jpg',
} as const

/**
 * 讀取頁面 SEO 設定
 * cms_sections WHERE page={page}, section_key='seo'
 */
export async function getPageSeo(page: string, merchantCode: string = 'minjie') {
  try {
    // ⚠️ 用 lib/cms.ts 裡面「實際使用的」Supabase client 取得方式
    // 檢查檔案開頭怎麼取 client 就怎麼寫，保持一致
    const supabase = /* 現有的 client 取得方式 */

    const { data, error } = await supabase
      .from('cms_sections')
      .select('content')
      .eq('merchant_code', merchantCode)
      .eq('page', page)
      .eq('section_key', 'seo')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data?.content) return null

    return data.content as {
      meta_title?: string
      meta_description?: string
      og_image?: string
      og_title?: string
      canonical_url?: string
      no_index?: boolean
    }
  } catch (error) {
    console.error(`Failed to fetch SEO for page "${page}":`, error)
    return null
  }
}

/**
 * 讀取全站 SEO 設定
 * cms_sections WHERE page='global', section_key='seo_settings'
 */
export async function getGlobalSeo(merchantCode: string = 'minjie') {
  try {
    const supabase = /* 現有的 client 取得方式 */

    const { data, error } = await supabase
      .from('cms_sections')
      .select('content')
      .eq('merchant_code', merchantCode)
      .eq('page', 'global')
      .eq('section_key', 'seo_settings')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data?.content) return null

    return data.content as {
      brand_name?: string
      brand_tagline?: string
      default_meta_description?: string
      default_og_image?: string
      google_verification?: string
      social_links?: {
        line?: string
        instagram?: string
        facebook?: string
      }
    }
  } catch (error) {
    console.error('Failed to fetch global SEO:', error)
    return null
  }
}
```

**重要：`supabase` client 取得方式必須和 cms.ts 中其他函數完全一致。** 看 `getBannerByPlacement` 或 `getHomeBanners` 怎麼取 client 就怎麼寫。

---

## 任務 ③ 各頁面 Metadata 動態化

### 3.1 首頁

找到 `app/(website)/page.tsx`，將 metadata 改為動態：

```typescript
import { getPageSeo, getGlobalSeo, DEFAULT_SEO } from '@/lib/cms'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const [pageSeo, globalSeo] = await Promise.all([
    getPageSeo('home'),
    getGlobalSeo(),
  ])

  const brandName = globalSeo?.brand_name || DEFAULT_SEO.brand_name

  // 優先級：pageSeo > globalSeo > DEFAULT_SEO
  const title = pageSeo?.meta_title
    || (globalSeo?.brand_tagline ? `${globalSeo.brand_tagline}｜${brandName}` : null)
    || DEFAULT_SEO.home.title
  const description = pageSeo?.meta_description
    || globalSeo?.default_meta_description
    || DEFAULT_SEO.home.description
  const ogImage = pageSeo?.og_image
    || globalSeo?.default_og_image
    || DEFAULT_SEO.default_og_image

  return {
    title,
    description,
    openGraph: {
      title: pageSeo?.og_title || title,
      description,
      images: ogImage ? [ogImage] : undefined,
      siteName: brandName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageSeo?.og_title || title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}
```

**注意：**
- 如果原本是 `export const metadata = {...}` 靜態寫法，**刪掉舊的**，改成 `export async function generateMetadata()`
- 確認有 `import type { Metadata } from 'next'`
- 如果頁面有 `'use client'`，metadata 必須從 layout 設定，記錄在報告中
- **保留頁面其他所有邏輯不變**，只改 metadata 部分

### 3.2 商品列表頁

找到 `app/(website)/products/page.tsx`：

```typescript
import { getPageSeo, DEFAULT_SEO } from '@/lib/cms'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const pageSeo = await getPageSeo('products')

  const title = pageSeo?.meta_title || DEFAULT_SEO.products.title
  const description = pageSeo?.meta_description || DEFAULT_SEO.products.description
  const ogImage = pageSeo?.og_image || DEFAULT_SEO.default_og_image

  return {
    title,
    description,
    openGraph: {
      title: pageSeo?.og_title || title,
      description,
      images: ogImage ? [ogImage] : undefined,
      siteName: DEFAULT_SEO.brand_name,
    },
  }
}
```

### 3.3 商品詳情頁 — 只確認不改

確認 `app/(website)/products/[handle]/page.tsx` 已有動態 `generateMetadata`。
- 如果已有 → 跳過
- 如果沒有 → 記錄在報告中，但**不要改動**

### 3.4 Blog 列表頁

檢查 `app/(website)/blog/page.tsx` 是否存在：
- **存在** → 套用 `getPageSeo('blog')` + `DEFAULT_SEO.blog` fallback
- **不存在** → 跳過，記錄在報告「Blog 頁面路由不存在」

### 3.5 About / FAQ 頁面

檢查是否存在，存在就套用，不存在就跳過記錄。

---

## 任務 ④ Root Layout OG Fallback + metadataBase

### 4.1 檢查 OG 圖片

```bash
ls public/og-image.* public/images/og-* public/opengraph-* 2>/dev/null
```

### 4.2 設定 metadataBase

檢查 `app/layout.tsx`（root layout），確認有設定：

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://shop.minjie0326.com'),
  // ... 其他設定 ...
}
```

如果是 `generateMetadata`，在回傳的物件中加入 `metadataBase`。

**`metadataBase` 必須設定**，否則相對路徑的 OG image（如 `/og-image.jpg`）不會變成完整 URL `https://shop.minjie0326.com/og-image.jpg`。

### 4.3 Root Layout OG Fallback

確認 root layout 的 metadata 有全站 OG fallback：

```typescript
openGraph: {
  type: 'website',
  siteName: 'MINJIE STUDIO',
  images: ['/og-image.jpg'],
},
```

如果已有就不動。如果沒有就加上。

---

## 任務 ⑤ Revalidation API 確認

### 5.1 檢查

```bash
cat "app/api/revalidate/route.ts" 2>/dev/null || echo "FILE NOT FOUND"
```

確認三點：
1. 有 `x-revalidate-secret` header 驗證
2. 支援 `{ paths: ['/', '/products'] }` 和 `{ path: '/' }` 兩種格式
3. 對每個 path 呼叫 `revalidatePath()`

如果不存在或不完整，建立/補齊：

```typescript
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expectedSecret = process.env.REVALIDATE_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET not configured' }, { status: 500 })
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const paths: string[] = body.paths || (body.path ? [body.path] : ['/'])

    for (const path of paths) {
      revalidatePath(path)
    }

    return NextResponse.json({ revalidated: true, paths })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 })
  }
}
```

### 5.2 .env.example

```bash
grep "REVALIDATE_SECRET" .env.example 2>/dev/null || echo "NOT FOUND"
```

沒有就加上 `REVALIDATE_SECRET=your-revalidate-secret-here`。

---

## 任務 ⑥ Build + 輸出報告

### Step 6.1

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
npm run build
```

Build 成功 → 繼續。失敗 → 修復，最多 3 次。

### Step 6.2 輸出報告

寫入 `docs/Pre_Launch_Part1_SEO_OG_Report.md`：

```markdown
# 上線前 Part 1：SEO + OG 執行報告
> 日期：2026-02-17

## 盤點結果

### lib/cms.ts 函數
| 函數 | 狀態 | 說明 |
|------|:----:|------|
| getPageSeo | ✅ 新增 | cms_sections seo 查詢 |
| getGlobalSeo | ✅ 新增 | 全站 SEO 設定查詢 |
| DEFAULT_SEO | ✅ 新增 | Fallback 常數 |

### 各頁面 Metadata
| 頁面 | 路徑 | 修改前 | 修改後 | 狀態 |
|------|------|--------|--------|:----:|
| 首頁 | app/(website)/page.tsx | ... | CMS + fallback | ✅/❌ |
| 商品列表 | app/(website)/products/page.tsx | ... | CMS + fallback | ✅/❌ |
| 商品詳情 | app/(website)/products/[handle]/page.tsx | 已動態 | 不動 | — |
| Blog | app/(website)/blog/page.tsx | 存在/不存在 | ... | ✅/❌/N/A |
| About | app/(website)/about/page.tsx | 存在/不存在 | ... | ✅/❌/N/A |
| FAQ | app/(website)/faq/page.tsx | 存在/不存在 | ... | ✅/❌/N/A |

### OG 圖片
| 項目 | 狀態 |
|------|:----:|
| public/og-image.jpg 存在 | ✅/❌ |
| metadataBase 已設定 | ✅/❌ |
| Root layout OG fallback | ✅/❌ |

### Revalidation API
| 項目 | 狀態 |
|------|:----:|
| /api/revalidate 存在 | ✅/❌ |
| 支援多路徑 | ✅/❌ |
| x-revalidate-secret 驗證 | ✅/❌ |
| .env.example 已更新 | ✅/❌ |

## 修改檔案
| 檔案 | 動作 | 說明 |
|------|------|------|
| ... | ... | ... |

## Build 結果
- `npm run build`：✅/❌

## ⚠️ 需要人工處理
1. ...
```

**不要 git commit，等人工確認後再 commit。**

---

## 不要動的東西

1. **結帳流程**（`app/checkout/` 下所有檔案）
2. **會員系統 API**（`app/api/auth/`、`app/api/member/`）
3. **購物金系統**（`components/checkout/CreditsSelector*`）
4. **CMS 後台 repo**（`cms-admin`）
5. **lib/cms.ts 中已有函數的介面**（只新增，不改既有函數簽名）
6. **ISR revalidate 時間**（不改）
7. **商品詳情頁的 generateMetadata**（已動態，不動）
