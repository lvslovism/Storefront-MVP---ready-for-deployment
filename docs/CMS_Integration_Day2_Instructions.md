# CMS ↔ Storefront 串接 Day 2：Revalidation 補齊 + 營運元件

> 日期：2026-02-15
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**
> 涉及 2 個 Repo：
> - CMS：`O:\Projects\cms-admin`（任務 ①）
> - Storefront：`O:\Projects\Storefront-MVP---ready-for-deployment`（任務 ②③④）

---

## 任務 ① CMS 全頁面 Revalidation 補齊

### 背景

Day 1 發現只有 `homepage-sections` 管理頁面儲存後觸發 revalidation，其餘 9+ 管理頁面都沒有。這代表商家在 CMS 改內容後，前台不會自動更新。

### Step 1.1：盤點所有管理頁面的儲存邏輯

切到 CMS repo（`O:\Projects\cms-admin`）：

```bash
cd "O:\Projects\cms-admin"
```

找出所有管理頁面的儲存操作：

```bash
# 找所有包含 save/submit/update/upsert 的 API 或 action
grep -rn "\.upsert\|\.update\|\.insert\|\.delete\|handleSave\|handleSubmit\|onSave\|儲存" app/ src/ components/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|\.next" | head -60

# 找已有的 revalidate 呼叫
grep -rn "revalidate-storefront\|revalidateStorefront\|triggerRevalidat" app/ src/ components/ lib/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

### Step 1.2：找出 revalidation 工具函式

確認 CMS 是否有一個統一的 revalidation 工具函式：

```bash
# 找 revalidate 相關的 lib/utils 函式
grep -rn "revalidate\|STOREFRONT_URL\|REVALIDATE_SECRET" lib/ utils/ helpers/ --include="*.ts" --include="*.tsx" 2>/dev/null
```

**情況 A：已有工具函式**（例如 `triggerRevalidation(paths)`）
- 記錄它的位置和 signature
- 後續只要在各頁面呼叫它

**情況 B：沒有統一工具函式**
在 `lib/` 或 `utils/` 建立一個：

```typescript
// lib/revalidate.ts
const STOREFRONT_URL = process.env.STOREFRONT_URL || 'https://shop.minjie0326.com'
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET

export async function revalidateStorefront(paths: string[] = ['/']) {
  if (!REVALIDATE_SECRET) {
    console.warn('REVALIDATE_SECRET not set, skipping revalidation')
    return { success: false, reason: 'no_secret' }
  }

  try {
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
      return { success: false, status: res.status, detail: result }
    }
    return { success: true, ...result }
  } catch (error) {
    console.error('Revalidation request failed:', error)
    // 不阻擋 CMS 儲存
    return { success: false, reason: 'network_error' }
  }
}
```

**如果已有 `/api/revalidate-storefront` API route**，那工具函式應該呼叫這個 internal API 而不是直接打外部 URL。看現有 `homepage-sections` 頁面怎麼做的，保持一致。

### Step 1.3：為每個管理頁面加上 revalidation

找出所有管理頁面的儲存成功邏輯，在儲存成功後呼叫 revalidation。

**每個頁面對應的 revalidation 路徑：**

| 管理頁面 | 儲存後要刷新的路徑 |
|---------|-------------------|
| 首頁圖片區塊（homepage-sections） | `['/']` — 已有 ✅ |
| Banner 管理 | `['/']` |
| 公告管理 | `['/']` |
| 商品推薦管理 | `['/', '/products']` |
| 區塊編輯（brand_story, trust_numbers 等） | `['/']` |
| Blog 文章管理 | `['/', '/blog']` |
| 活動頁管理 | `['/']` |
| 商家設定 | `['/']` |
| SEO 設定 | `['/', '/products', '/blog']` |
| LINE Bot 回覆管理 | 不需要（前台不讀這個） |
| 促銷規則管理 | 不需要（走 Medusa） |
| 會員管理 | 不需要（動態資料） |

**做法：**

在每個管理頁面的儲存成功回調中（通常是 `handleSave` 或 `onSubmit` 的 success 分支），加入：

```typescript
// 方式 1：如果用工具函式
import { revalidateStorefront } from '@/lib/revalidate'
// 儲存成功後
await revalidateStorefront(['/', '/products'])

// 方式 2：如果用 internal API
await fetch('/api/revalidate-storefront', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paths: ['/', '/products'] }),
})
```

**保持跟 `homepage-sections` 頁面一樣的呼叫方式**，不要發明新模式。

### Step 1.4：revalidation 失敗不阻擋儲存

確認所有 revalidation 呼叫都不會因為失敗而阻擋 CMS 的儲存操作：
- revalidation 呼叫應在 `try/catch` 中
- 失敗時 `console.warn` 但不 throw
- 可以顯示一個 toast 通知「儲存成功，但前台更新可能延遲」

### Step 1.5：CMS Build

```bash
npm run build
```

Build 成功才繼續。失敗就修，最多 3 次。

---

## 任務 ② AnnouncementBar（Storefront）

切回 Storefront repo：

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
```

### Step 2.1：確認 lib/cms.ts 有 getAnnouncements

```bash
grep -n "getAnnouncements" lib/cms.ts
```

確認有這個函式且包含：
- `is_active = true` 過濾
- `valid_from` / `valid_until` 時間過濾
- `sort_order` 排序

如果沒有，按照 `Website_CMS_SOP.md` 的範例新增。

### Step 2.2：建立 AnnouncementBar 元件

確認 `components/cms/AnnouncementBar.tsx` 不存在（Pre_Launch_Report 沒提到這個元件）：

```bash
ls components/cms/AnnouncementBar* 2>/dev/null
```

建立 `components/cms/AnnouncementBar.tsx`（Client Component）：

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Announcement {
  id: string
  title: string
  content?: string
  link_url?: string
  type: 'info' | 'promo' | 'warning' | 'urgent'
}

interface AnnouncementBarProps {
  announcements: Announcement[]
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  info:    { bg: 'bg-transparent',  text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
  promo:   { bg: 'bg-[#D4AF37]',   text: 'text-black',     border: 'border-[#D4AF37]' },
  warning: { bg: 'bg-red-900/30',   text: 'text-red-300',   border: 'border-red-500/30' },
  urgent:  { bg: 'bg-red-600',      text: 'text-white',     border: 'border-red-600' },
}

export default function AnnouncementBar({ announcements }: AnnouncementBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (announcements.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [announcements.length])

  if (dismissed || announcements.length === 0) return null

  const current = announcements[currentIndex]
  const style = TYPE_STYLES[current.type] || TYPE_STYLES.info

  const content = (
    <div className={`relative w-full py-2.5 px-4 text-center text-sm border-b ${style.bg} ${style.text} ${style.border}`}>
      <span className="inline-block max-w-[90%]">
        {current.title}
        {current.content && <span className="ml-2 opacity-80">{current.content}</span>}
      </span>
      {announcements.length > 1 && (
        <span className="ml-3 text-xs opacity-50">
          {currentIndex + 1}/{announcements.length}
        </span>
      )}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true) }}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="關閉公告"
      >
        ✕
      </button>
    </div>
  )

  if (current.link_url) {
    return <Link href={current.link_url} className="block">{content}</Link>
  }
  return content
}
```

### Step 2.3：建立 Server 包裝元件

建立 `components/cms/AnnouncementBarServer.tsx`：

```tsx
import { getAnnouncements } from '@/lib/cms'
import AnnouncementBar from './AnnouncementBar'

export default async function AnnouncementBarServer() {
  const announcements = await getAnnouncements()
  if (!announcements || announcements.length === 0) return null
  return <AnnouncementBar announcements={announcements} />
}
```

### Step 2.4：串接到 Layout

編輯 `app/(website)/layout.tsx`：

```bash
cat "app/(website)/layout.tsx"
```

在 `<Header />` 的**正下方**加入 AnnouncementBarServer：

```tsx
import AnnouncementBarServer from '@/components/cms/AnnouncementBarServer'

// 在 return 的 JSX 中，Header 後面：
<Header />
<AnnouncementBarServer />
```

**注意**：
- 如果 layout 是 `'use client'`，不能直接用 async Server Component。改用 useEffect fetch 模式或把 AnnouncementBar 的資料取得挪到 page level
- 如果 layout 有 `<Suspense>`，可以把 AnnouncementBarServer 包在 Suspense 裡
- 最安全的做法：先看 layout 是 Server 還是 Client Component，再決定怎麼整合

---

## 任務 ③ Footer 動態化

### Step 3.1：確認 lib/cms.ts 有 getMerchantSettings

```bash
grep -n "getMerchantSettings\|merchant_settings" lib/cms.ts
```

如果沒有，新增：

```typescript
export async function getMerchantSettings(merchantCode: string = MERCHANT) {
  const { data } = await supabase
    .from('merchant_settings')
    .select('*')
    .eq('merchant_code', merchantCode)
    .single()
  return data
}
```

### Step 3.2：確認 merchant_settings 的實際欄位

```bash
# 搜尋現有 Footer 已經在讀什麼
grep -n "merchant_settings\|store_name\|contact_email\|contact_phone\|line_url\|facebook\|instagram" components/website/Footer.tsx components/Footer.tsx 2>/dev/null
```

### Step 3.3：修改 Footer

讀取 `components/website/Footer.tsx`（或找到實際的 Footer 元件）：

```bash
find . -name "Footer*" -not -path "*/node_modules/*" -not -path "*/.next/*" | head -5
```

修改要點：

**A. 社群連結動態化**

找到 LINE / Facebook / Instagram 連結的 hardcoded 部分，改為從 `merchant_settings` 讀取：

```typescript
// 如果 Footer 是 Server Component
const settings = await getMerchantSettings()

const socialLinks = {
  line: settings?.line_official_url || settings?.line_url || 'https://lin.ee/Ro3Fd4p',
  facebook: settings?.facebook_url || '#',
  instagram: settings?.instagram_url || '#',
}
const contactInfo = {
  email: settings?.contact_email || 'minjie0326@gmail.com',
  phone: settings?.contact_phone || '0927372271',
  storeName: settings?.store_name || 'MINJIE STUDIO',
}
```

**B. Footer 連結動態化**

檢查 `cms_sections` WHERE `section_key = 'footer_info'`：

```typescript
const footerInfo = await getSection('home', 'footer_info')
// footerInfo 預期結構：
// { links: [{ label, url }], social: { line_url, facebook_url, instagram_url } }

// 如果有 footerInfo.links → 用 DB 的連結
// 如果沒有 → 用現有 hardcoded 連結作為 fallback
const footerLinks = footerInfo?.links || [
  { label: '常見問題', url: '/faq' },
  { label: '配送說明', url: '/shipping' },
  { label: '退換貨政策', url: '/return-policy' },
  { label: '隱私權政策', url: '/privacy' },
  { label: '服務條款', url: '/terms' },
]
```

**C. Copyright 年份動態化**

```typescript
const year = new Date().getFullYear()
// © {year} {contactInfo.storeName}. All rights reserved.
```

**D. 如果 Footer 是 Client Component**

不能直接 `await`。改成：
1. 在 layout 的 Server 部分取得 settings 和 footerInfo
2. 通過 props 傳給 Footer
3. 或建立一個 API route `/api/cms/footer` 讓 Footer useEffect fetch

看現有 Footer 是怎麼取 merchant_settings 的，保持一致。

**核心原則：所有動態值都必須有 hardcoded fallback。DB 沒資料 = 跟現在一樣，不會壞。**

---

## 任務 ④ 信任數字動態化

### Step 4.1：找到信任數字區塊

```bash
# 搜尋 600+ / 476K+ / 13K+ / 68%+ 或 trust 相關
grep -rn "600\|476\|13K\|68%\|trust.*number\|TrustNumber" app/(website)/page.tsx components/ --include="*.tsx" | grep -v "node_modules\|\.next" | head -10
```

### Step 4.2：改為 CMS 驅動

找到信任數字的 hardcoded 部分（可能在首頁 page.tsx 或獨立元件）。

修改為從 `cms_sections` 讀取：

```typescript
import { getSection } from '@/lib/cms'

// 在首頁或元件中
const trustNumbers = await getSection('home', 'trust_numbers')

// DB content 預期結構：
// { items: [{ number: "900+", label: "商品銷售" }, ...] }

// Fallback
const defaultTrustNumbers = [
  { number: '600+', label: '商品銷售' },
  { number: '476K+', label: '社群觸及' },
  { number: '13K+', label: '滿意客戶' },
  { number: '68%+', label: '回購率' },
]

const displayNumbers = trustNumbers?.items?.length > 0 
  ? trustNumbers.items 
  : defaultTrustNumbers
```

如果是獨立的 `TrustNumbers` 元件，改成接受 `items` props。
如果是直接寫在 page.tsx 裡的 JSX，就地修改。

---

## 任務 ⑤ Build + 輸出報告

### Step 5.1：Storefront Build

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
npm run build
```

Build 成功 → 繼續。失敗 → 修復，最多 3 次。

### Step 5.2：輸出報告

寫入 `docs/CMS_Integration_Day2_Report.md`：

```markdown
# CMS ↔ Storefront Day 2 串接報告
> 日期：2026-02-15

## ① CMS 全頁面 Revalidation

### 工具函式
- 位置：...
- 呼叫方式：...

### 各管理頁面狀態
| 管理頁面 | 修改前 | 修改後 | revalidate paths |
|---------|:------:|:------:|-----------------|
| 首頁圖片區塊 | ✅ 已有 | 不動 | ['/'] |
| Banner 管理 | ❌ | ✅/❌ | ['/'] |
| 公告管理 | ❌ | ✅/❌ | ['/'] |
| 商品推薦管理 | ❌ | ✅/❌ | ['/', '/products'] |
| 區塊編輯 | ❌ | ✅/❌ | ['/'] |
| Blog 管理 | ❌ | ✅/❌ | ['/', '/blog'] |
| 活動頁管理 | ❌ | ✅/❌ | ['/'] |
| 商家設定 | ❌ | ✅/❌ | ['/'] |

### CMS Build
- `npm run build`：✅/❌

## ② AnnouncementBar

### 新建檔案
| 檔案 | 說明 |
|------|------|
| ... | ... |

### 串接方式
- Layout 類型（Server/Client）：...
- 整合方式：...
- 沒有公告時的行為：...

## ③ Footer 動態化

### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| ... | ... |

### 資料來源
| 欄位 | 來源 | Fallback |
|------|------|---------|
| 店名 | merchant_settings.store_name | MINJIE STUDIO |
| Email | merchant_settings.contact_email | minjie0326@gmail.com |
| 電話 | merchant_settings.contact_phone | 0927372271 |
| LINE | merchant_settings.line_official_url | https://lin.ee/Ro3Fd4p |
| 連結列表 | cms_sections (footer_info) | hardcoded 5 links |

## ④ 信任數字動態化

### 修改方式
- 資料來源：cms_sections (home, trust_numbers)
- Fallback：現有 hardcoded 數字
- DB 有資料時顯示 DB 值
- DB 沒資料時顯示 fallback

## Build 結果
- Storefront `npm run build`：✅/❌
- CMS `npm run build`：✅/❌

## 修改檔案總表
| Repo | 檔案 | 修改內容 |
|------|------|----------|
| CMS | ... | ... |
| Storefront | ... | ... |

## 剩餘需人工處理
1. CMS 環境變數：REVALIDATE_SECRET 和 STOREFRONT_URL 是否已在 Vercel 設定
2. ...
```

**兩個 repo 都不要 git commit，等人工確認後再 commit。**
