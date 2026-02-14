# CMS ↔ Storefront 串接 Day 1：管道打通 + 商品控制

> 日期：2026-02-15
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> 涉及 2 個 Repo：
> - Storefront：`O:\Projects\Storefront-MVP---ready-for-deployment`
> - CMS：`O:\Projects\cms-admin`

---

## 任務 ① Revalidation 雙向驗證

### 目標
確認 CMS 儲存內容後，能自動觸發 Storefront 的 ISR 快取刷新：
```
CMS 儲存 → CMS /api/revalidate-storefront → Storefront /api/revalidate → revalidatePath()
```

### Step 1.1：檢查 Storefront 端（接收方）

在 Storefront repo（`O:\Projects\Storefront-MVP---ready-for-deployment`）：

```bash
cat app/api/revalidate/route.ts
```

確認以下邏輯都在：
- 讀取 `process.env.REVALIDATE_SECRET`
- Secret 未設定 → 回 500
- Secret 不匹配 → 回 403
- 匹配 → 執行 `revalidatePath()`
- **支援多路徑**：body 可以是 `{ path: '/' }` 或 `{ paths: ['/', '/products', '/blog'] }`

如果只支援單一 `path`，擴展為也支援 `paths` 陣列：

```typescript
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    console.error('REVALIDATE_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const headerSecret = request.headers.get('x-revalidate-secret')
  if (headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const paths: string[] = body.paths || (body.path ? [body.path] : ['/'])
    
    for (const p of paths) {
      revalidatePath(p)
    }

    return NextResponse.json({ 
      revalidated: true, 
      paths,
      now: Date.now() 
    })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
```

如果現有邏輯已經差不多，只補缺少的部分，不要全部重寫。

### Step 1.2：檢查 CMS 端（發送方）

切換到 CMS repo（`O:\Projects\cms-admin`）：

```bash
# 找 revalidate 相關的 API route
find . -path "*/api/*revalidat*" -name "*.ts" -o -path "*/api/*revalidat*" -name "*.tsx" | head -20

# 找環境變數使用
grep -rn "REVALIDATE_SECRET\|STOREFRONT.*URL\|revalidate-storefront\|revalidatePath" src/ app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null
```

**情況 A：CMS 已有 revalidate API**
- 確認它 POST 到的 URL 是 `https://shop.minjie0326.com/api/revalidate`
- 確認它帶 `x-revalidate-secret` header
- 確認 header 值讀的是 `process.env.REVALIDATE_SECRET`

**情況 B：CMS 沒有 revalidate API**
建立 `app/api/revalidate-storefront/route.ts`（或放在合適的 API 路徑）：

```typescript
import { NextRequest, NextResponse } from 'next/server'

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'https://shop.minjie0326.com'
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET

export async function POST(request: NextRequest) {
  if (!REVALIDATE_SECRET) {
    console.error('REVALIDATE_SECRET not set in CMS')
    return NextResponse.json({ error: 'Secret not configured' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const paths = body.paths || ['/']

    const res = await fetch(`${STOREFRONT_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': REVALIDATE_SECRET,
      },
      body: JSON.stringify({ paths }),
    })

    const result = await res.json()
    
    if (!res.ok) {
      console.error('Storefront revalidation failed:', result)
      return NextResponse.json({ 
        error: 'Storefront revalidation failed', 
        detail: result 
      }, { status: res.status })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Failed to call Storefront revalidate:', error)
    // Revalidation 失敗不應阻擋 CMS 儲存
    return NextResponse.json({ error: 'Revalidation failed but save succeeded' }, { status: 200 })
  }
}
```

### Step 1.3：確認 CMS 儲存時呼叫 revalidate

搜尋 CMS 中所有「儲存」操作，確認它們儲存完後會呼叫 revalidate：

```bash
# 找所有可能的儲存操作
grep -rn "revalidate\|/api/revalidate" src/ app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null
```

重點確認這些管理頁面的儲存按鈕是否觸發 revalidation：
- Banner 管理（圖片區塊）
- 公告管理
- 商品推薦管理
- 區塊編輯（brand_story, trust_numbers 等）

如果某些頁面儲存後沒有呼叫 revalidate，記錄下來，但**不要改 CMS 的程式碼**（CMS 的修改在 Day 2 或另外處理）。只記錄哪些有呼叫、哪些沒有。

### Step 1.4：確認 CMS .env

```bash
cat .env.local 2>/dev/null | grep -E "REVALIDATE|STOREFRONT"
cat .env.example 2>/dev/null | grep -E "REVALIDATE|STOREFRONT"
```

如果 `.env.example` 沒有這兩個變數，補上：
```env
# Storefront ISR Revalidation（與 Storefront 端相同的隨機字串）
REVALIDATE_SECRET=
# Storefront URL（revalidate 目標）
STOREFRONT_URL=https://shop.minjie0326.com
```

### Step 1.5：回到 Storefront repo

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
```

---

## 任務 ② 首頁分類 Tabs + 精選商品（CMS 驅動）

### 目標
首頁商品區目前是 `getProducts({ limit: 50 }).slice(0, 6)` 硬取前 6 個。
改成 CMS 驅動：商家在 CMS 後台選哪些商品出現在首頁、怎麼分類。

### Step 2.1：確認 lib/cms.ts 有 getFeaturedProductIds

```bash
grep -n "getFeaturedProduct\|featured_products" lib/cms.ts
```

如果有 `getFeaturedProductIds()` 函式，確認其 signature。
如果沒有，新增：

```typescript
export async function getFeaturedProductIds(placement: string = 'home_featured') {
  const { data } = await supabase
    .from('cms_featured_products')
    .select('product_id')
    .eq('merchant_code', MERCHANT)
    .eq('placement', placement)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return data?.map((d: any) => d.product_id) || []
}
```

同時確認是否有讀取分類 Tabs 設定的函式。CMS 的 `cms_featured_products` 表有 `placement` 欄位，不同 placement 對應不同 Tab：
- `home_featured`：精選推薦（預設 Tab）
- `home_new`：新品上架
- `category_top`：分類置頂

新增一個取得所有 placements 的函式：

```typescript
export async function getFeaturedPlacements() {
  const { data } = await supabase
    .from('cms_featured_products')
    .select('placement')
    .eq('merchant_code', MERCHANT)
    .eq('is_active', true)
  
  // 取得不重複的 placement 列表
  const placements = [...new Set((data || []).map((d: any) => d.placement))]
  return placements
}
```

### Step 2.2：確認 lib/medusa.ts 有按 ID 批次取商品的能力

```bash
grep -n "getProductById\|product_id\|id=\|ids=" lib/medusa.ts
```

如果沒有按 ID 列表取商品的函式，新增：

```typescript
export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return []
  
  // Medusa Store API 支援 id 陣列過濾
  const params = new URLSearchParams()
  ids.forEach(id => params.append('id', id))
  params.set('fields', '*variants,+variants.inventory_quantity,+variants.calculated_price')
  params.set('limit', String(ids.length))
  
  // 使用現有的 fetch 邏輯（看 getProducts 怎麼做的就照做）
  const url = `${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`
  const res = await fetch(url, {
    headers: medusaHeaders(),
    next: { revalidate: 3600 },
  })
  
  if (!res.ok) return []
  const data = await res.json()
  
  // 按照 ids 的順序排序（保持 CMS 排序）
  const productMap = new Map((data.products || []).map((p: any) => [p.id, p]))
  return ids.map(id => productMap.get(id)).filter(Boolean)
}
```

**重要**：看現有 `getProducts()` 的實作方式（headers、baseURL、publishable key 怎麼帶），`getProductsByIds` 要用完全一樣的方式。不要自己猜 header 格式。

### Step 2.3：建立 FeaturedProducts 元件

檢查 `components/cms/FeaturedProducts.tsx` 是否存在：

```bash
ls components/cms/FeaturedProducts.tsx 2>/dev/null
```

**如果不存在，建立。如果已存在，檢查並補強。**

需求：
- 接收 `tabs` 和 `products` 作為 props（Server Component 傳入）
- Tab 切換時顯示對應分類的商品
- 使用現有的 `ProductCard` 元件（先確認路徑）
- 黑金色系，Tab active 狀態用金色底線
- 沒有 tabs 時（DB 0 筆），fallback 顯示全部商品（無 Tab）

```bash
# 確認 ProductCard 元件路徑
find . -name "ProductCard*" -not -path "*/node_modules/*" | head -5
```

建立元件時的結構：

```tsx
'use client'

import { useState } from 'react'
// import ProductCard（用找到的實際路徑）

interface Tab {
  key: string       // placement: 'home_featured', 'home_new', etc.
  label: string     // 顯示名稱
  products: any[]   // 該 Tab 下的商品
}

interface FeaturedProductsProps {
  tabs: Tab[]
  fallbackProducts?: any[]  // 當 tabs 為空時的 fallback
}

// placement 對應的中文 Tab 名稱
const PLACEMENT_LABELS: Record<string, string> = {
  'home_featured': '精選推薦',
  'home_new': '新品上架',
  'home_hot': '熱銷排行',
  'category_top': '分類精選',
}

export default function FeaturedProducts({ tabs, fallbackProducts = [] }: FeaturedProductsProps) {
  const [activeTab, setActiveTab] = useState(0)
  
  // 沒有 CMS 資料時，用 fallback
  const displayTabs = tabs.length > 0 ? tabs : fallbackProducts.length > 0 
    ? [{ key: 'all', label: '全部商品', products: fallbackProducts }]
    : []
  
  if (displayTabs.length === 0) return null
  
  const currentProducts = displayTabs[activeTab]?.products || []
  
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-[4px] mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
            ─── OUR PRODUCTS ───
          </p>
          <h2 className="text-2xl md:text-3xl font-light tracking-wider" style={{ color: '#D4AF37' }}>
            嚴選商品
          </h2>
        </div>
        
        {/* Tabs（多於 1 個 Tab 時才顯示） */}
        {displayTabs.length > 1 && (
          <div className="flex justify-center gap-6 mb-10">
            {displayTabs.map((tab, idx) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(idx)}
                className={`pb-2 text-sm tracking-wider transition-all duration-300 ${
                  idx === activeTab
                    ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
                    : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {currentProducts.slice(0, 6).map((product: any) => (
            // 用找到的 ProductCard 元件
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {/* View All Button */}
        <div className="text-center mt-10">
          <a
            href="/products"
            className="inline-block px-8 py-3 border border-[#D4AF37] text-[#D4AF37] text-sm tracking-wider hover:bg-[#D4AF37] hover:text-black transition-all duration-300"
          >
            查看全部商品
          </a>
        </div>
      </div>
    </section>
  )
}
```

**注意**：
- `ProductCard` 的 import 路徑要用實際找到的路徑
- `ProductCard` 接收的 props 格式要跟現有用法一致
- 如果現有首頁已經有商品區塊（不是用 `FeaturedProducts` 元件），要替換那個區塊

### Step 2.4：修改首頁 page.tsx

找到首頁：`app/(website)/page.tsx`

```bash
cat "app/(website)/page.tsx"
```

找到目前顯示商品的部分（應該有 `getProducts` + `slice(0, 6)` 之類的）。

修改為：

```typescript
import { getFeaturedProductIds, getFeaturedPlacements } from '@/lib/cms'
import { getProductsByIds, getProducts } from '@/lib/medusa'
import FeaturedProducts from '@/components/cms/FeaturedProducts'

// 在 HomePage 函式中：

// 1. 取得 CMS 有哪些 placement
const placements = await getFeaturedPlacements()

// 2. 如果 CMS 有資料，按 placement 分組取商品
let tabs: { key: string; label: string; products: any[] }[] = []
let fallbackProducts: any[] = []

if (placements.length > 0) {
  // CMS 驅動模式
  tabs = await Promise.all(
    placements.map(async (placement: string) => {
      const productIds = await getFeaturedProductIds(placement)
      const products = await getProductsByIds(productIds)
      return {
        key: placement,
        label: PLACEMENT_LABELS[placement] || placement,
        products,
      }
    })
  )
  // 過濾掉沒有商品的 Tab
  tabs = tabs.filter(t => t.products.length > 0)
}

if (tabs.length === 0) {
  // Fallback：CMS 沒資料時用 Medusa 全部商品
  const { products } = await getProducts({ limit: 6 })
  fallbackProducts = products
}

// 3. 渲染
<FeaturedProducts tabs={tabs} fallbackProducts={fallbackProducts} />
```

**注意**：
- `PLACEMENT_LABELS` 定義放在 page.tsx 或 import 自 FeaturedProducts
- 不要刪除 `getProducts` 的 import，fallback 還需要它
- 保持現有的 `export const revalidate = 3600`
- 保持首頁其他區塊（ImageSection、品牌故事等）不動，只替換商品區塊

### Step 2.5：處理 TODO 註解

```bash
grep -rn "TODO.*分類\|TODO.*Tab\|TODO.*Collection\|TODO.*category" app/(website)/page.tsx components/ --include="*.tsx" 2>/dev/null
```

找到 TODO 註解後，如果是關於分類 Tabs 的，移除或改為完成註解。

---

## 任務 ③ Build + 驗證

### Step 3.1：Storefront Build

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
npm run build
```

- Build 成功 → 記錄 ✅
- Build 失敗 → 修復 TypeScript / import 錯誤，最多 3 次
- 注意：`getProductsByIds` 和 `getFeaturedPlacements` 是新增函式，確認 export 正確

### Step 3.2：CMS Build（如果有修改）

```bash
cd "O:\Projects\cms-admin"
npm run build
```

---

## 輸出報告

寫入 `O:\Projects\Storefront-MVP---ready-for-deployment\docs\CMS_Integration_Day1_Report.md`：

```markdown
# CMS ↔ Storefront Day 1 串接報告
> 日期：2026-02-15

## ① Revalidation 雙向驗證

### Storefront 端（接收方）
- `/api/revalidate/route.ts` 狀態：✅/❌
- 支援多路徑：✅/❌
- Secret 驗證邏輯：✅/❌

### CMS 端（發送方）
- Revalidate API route 存在：✅/❌（路徑：...）
- 呼叫目標 URL：...
- Secret 來源：...
- `.env.example` 有 REVALIDATE_SECRET：✅/❌
- `.env.example` 有 STOREFRONT_URL：✅/❌

### CMS 儲存頁面呼叫 revalidate 的狀況
| 管理頁面 | 儲存時呼叫 revalidate？ | 說明 |
|---------|:----:|------|
| Banner 管理 | ✅/❌ | ... |
| 公告管理 | ✅/❌ | ... |
| 商品推薦管理 | ✅/❌ | ... |
| 區塊編輯 | ✅/❌ | ... |
| Blog 管理 | ✅/❌ | ... |

## ② 首頁分類 Tabs + 精選商品

### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| ... | ... |

### 新增函式
| 函式 | 檔案 | 說明 |
|------|------|------|
| ... | ... | ... |

### Fallback 行為
- CMS `cms_featured_products` 有資料時：...
- CMS 0 筆時：...

## Build 結果
- Storefront `npm run build`：✅/❌
- CMS `npm run build`：✅/❌（如果有改）

## 剩餘需人工處理
1. ...
```

**不要 git commit，等人工確認後再 commit。**
