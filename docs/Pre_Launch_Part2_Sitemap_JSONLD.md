# 上線前 Part 2：Sitemap + JSON-LD 結構化資料

> 日期：2026-02-17
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> Repo：`O:\Projects\Storefront-MVP---ready-for-deployment`
> 部署目標：Vercel → `shop.minjie0326.com`
> 前置任務：Part 1（SEO Metadata）完成後再執行

---

## 背景

Google Search Console 需要 sitemap.xml 才能有效爬取網站。結構化資料（JSON-LD）能讓搜尋結果顯示更豐富的資訊（價格、評價、品牌 Logo 等）。這兩項是上線前 SEO 的收尾工作。

---

## 任務 ① Sitemap.xml

### Step 1.1：檢查是否已有 sitemap

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"

# 檢查靜態 sitemap
ls public/sitemap* 2>/dev/null

# 檢查動態 sitemap route
ls app/sitemap.ts app/sitemap.xml/route.ts 2>/dev/null
find app/ -name "sitemap*" 2>/dev/null
```

### Step 1.2：如果不存在，建立動態 sitemap

建立 `app/sitemap.ts`：

```typescript
import { MetadataRoute } from 'next'

// ⚠️ 用 lib/medusa.ts 或 lib/cms.ts 中已有的方式取得商品列表
// 檢查現有的商品查詢函數是什麼，保持一致

const BASE_URL = 'https://shop.minjie0326.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 靜態頁面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // 動態商品頁面
  let productPages: MetadataRoute.Sitemap = []
  try {
    // ⚠️ 用現有的 Medusa API 函數取得所有商品
    // 檢查 lib/medusa.ts 中有哪些函數可用
    // 可能是 getProducts()、listProducts()、或直接 fetch Medusa API
    // 範例：
    // import { listProducts } from '@/lib/medusa'
    // const products = await listProducts()

    // 先搜尋現有的商品查詢方式：
    // grep -n "getProducts\|listProducts\|fetchProducts\|getAllProducts" lib/medusa.ts

    // 假設函數叫 X，取得商品列表後：
    // productPages = products.map((product) => ({
    //   url: `${BASE_URL}/products/${product.handle}`,
    //   lastModified: new Date(product.updated_at || product.created_at),
    //   changeFrequency: 'weekly' as const,
    //   priority: 0.8,
    // }))

    // ⚠️ 實際實作時，務必用 lib/medusa.ts 中已有的函數
    // 如果沒有適合的函數，直接 fetch Medusa Store API：
    const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BACKEND_URL
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

    if (medusaUrl) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (publishableKey) {
        headers['x-publishable-api-key'] = publishableKey
      }

      const res = await fetch(`${medusaUrl}/store/products?limit=200`, {
        headers,
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const data = await res.json()
        productPages = (data.products || []).map((product: any) => ({
          url: `${BASE_URL}/products/${product.handle}`,
          lastModified: new Date(product.updated_at || product.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))
      }
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error)
    // sitemap 取不到商品不應該阻擋整個 sitemap 生成
  }

  return [...staticPages, ...productPages]
}
```

**注意：**
- 先用 `grep` 找到 `lib/medusa.ts` 中已有的商品查詢函數，盡量複用
- 如果有 `getProducts` 或類似函數，用它而非直接 fetch
- sitemap 取商品失敗時不要 throw，只 console.error 然後回傳靜態頁面的 sitemap
- `revalidate: 3600` 讓 sitemap 每小時重新生成

### Step 1.3：確認 robots.txt

```bash
cat public/robots.txt 2>/dev/null || echo "NOT FOUND"
ls app/robots.ts 2>/dev/null
```

如果不存在，建立 `app/robots.ts`：

```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/checkout/', '/account/'],
    },
    sitemap: 'https://shop.minjie0326.com/sitemap.xml',
  }
}
```

如果 `public/robots.txt` 已存在，確認有 `Sitemap: https://shop.minjie0326.com/sitemap.xml` 行。沒有就加上。

---

## 任務 ② JSON-LD 結構化資料

### 2.1 Organization Schema（首頁）

在首頁 `app/(website)/page.tsx` 的頁面元件中加入 JSON-LD：

```typescript
// 在 page component 的 return JSX 最前面加上
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'MINJIE STUDIO',
      url: 'https://shop.minjie0326.com',
      logo: 'https://shop.minjie0326.com/logo.png',
      description: '嚴選全球頂級原料，打造專屬你的健康方案。',
      sameAs: [
        'https://lin.ee/Ro3Fd4p',
        // Instagram、Facebook URL 有的話加上
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+886-927-372-271',
        contactType: 'customer service',
        availableLanguage: 'Chinese',
      },
    }),
  }}
/>
```

**注意：**
- 檢查 `public/` 下是否有 logo 圖片，確認 logo URL 正確
- 如果有 `getGlobalSeo()` 的資料（Part 1 已新增），可以從中取值
- `sameAs` 陣列只加有值的社群連結，不要放空字串

### 2.2 WebSite Schema + SearchAction（首頁）

在同一個 JSON-LD script 旁邊再加一個：

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MINJIE STUDIO',
      url: 'https://shop.minjie0326.com',
    }),
  }}
/>
```

### 2.3 Product Schema（商品詳情頁）

找到 `app/(website)/products/[handle]/page.tsx`，在商品詳情元件中加入：

```typescript
// ⚠️ product 變數名稱要和頁面中實際的商品資料變數一致
// 檢查頁面中 fetch 商品後存到什麼變數名

// 在 return JSX 中加入
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || product.subtitle || '',
      image: product.thumbnail || product.images?.[0]?.url,
      url: `https://shop.minjie0326.com/products/${product.handle}`,
      brand: {
        '@type': 'Brand',
        name: 'MINJIE STUDIO',
      },
      offers: {
        '@type': 'Offer',
        url: `https://shop.minjie0326.com/products/${product.handle}`,
        priceCurrency: 'TWD',
        // ⚠️ 價格取法要看 Medusa v2 的資料結構
        // 可能是 product.variants?.[0]?.prices?.[0]?.amount
        // 或 product.variants?.[0]?.calculated_price?.calculated_amount
        // TWD 不除以 100（整數幣值）
        price: product.variants?.[0]?.calculated_price?.calculated_amount
          || product.variants?.[0]?.prices?.[0]?.amount
          || 0,
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'MINJIE STUDIO',
        },
      },
    }),
  }}
/>
```

**重要：**
- `product` 變數名稱必須和頁面中實際使用的一致
- 先 `grep -n "product\.\|variant" "app/(website)/products/[handle]/page.tsx" | head -20` 確認資料結構
- TWD 是整數幣值（Medusa v2），不除以 100
- 如果頁面是 Client Component（有 `'use client'`），JSON-LD 需要用 `useEffect` + `document.head.appendChild` 或從 parent Server Component 傳入。**最簡單的方式是確認這個頁面是 Server Component**

### 2.4 BreadcrumbList Schema（商品詳情頁）

在商品詳情頁同時加入麵包屑：

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '首頁',
          item: 'https://shop.minjie0326.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '全部商品',
          item: 'https://shop.minjie0326.com/products',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.title,
          item: `https://shop.minjie0326.com/products/${product.handle}`,
        },
      ],
    }),
  }}
/>
```

---

## 任務 ③ Build + 驗證

### Step 3.1：Build

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
npm run build
```

### Step 3.2：驗證 sitemap

```bash
# Build 後確認 sitemap 存在
# Next.js App Router 的 sitemap 是動態生成的，build 後檢查
ls .next/server/app/sitemap.xml* 2>/dev/null
```

### Step 3.3：驗證 robots.txt

```bash
ls .next/server/app/robots.txt* 2>/dev/null || ls public/robots.txt 2>/dev/null
```

---

## 輸出報告

寫入 `docs/Pre_Launch_Part2_Sitemap_JSONLD_Report.md`：

```markdown
# 上線前 Part 2：Sitemap + JSON-LD 執行報告
> 日期：2026-02-17

## Sitemap
| 項目 | 狀態 |
|------|:----:|
| app/sitemap.ts 建立 | ✅/❌/已存在 |
| 靜態頁面包含（首頁、商品列表） | ✅/❌ |
| 動態商品頁面包含 | ✅/❌ |
| 商品取得方式 | （記錄用了什麼函數） |
| 商品數量 | N 個 |

## robots.txt
| 項目 | 狀態 |
|------|:----:|
| robots.txt 存在 | ✅/❌ |
| 包含 Sitemap URL | ✅/❌ |
| 禁止爬取 /api/ /checkout/ /account/ | ✅/❌ |

## JSON-LD
| Schema 類型 | 頁面 | 狀態 |
|-------------|------|:----:|
| Organization | 首頁 | ✅/❌ |
| WebSite | 首頁 | ✅/❌ |
| Product | 商品詳情 | ✅/❌ |
| BreadcrumbList | 商品詳情 | ✅/❌ |

## 修改檔案
| 檔案 | 動作 | 說明 |
|------|------|------|
| ... | ... | ... |

## Build 結果
- `npm run build`：✅/❌

## ⚠️ 需要人工處理
1. 部署後驗證：curl https://shop.minjie0326.com/sitemap.xml
2. Google Search Console 提交 sitemap
3. 用 Google Rich Results Test 測試 JSON-LD
```

**不要 git commit，等人工確認後再 commit。**

---

## 不要動的東西

1. **結帳流程**
2. **會員系統 API**
3. **購物金系統**
4. **CMS 後台 repo**
5. **Part 1 剛改好的 generateMetadata**（不要覆蓋）
6. **lib/medusa.ts 中已有函數的介面**
