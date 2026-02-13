# Storefront 首頁圖片區塊切版指引

> 版本：v1.0 ｜ 日期：2026-02-13
> 
> 目的：Claude Code 執行用。在現有 Storefront repo 上實作 6 個 CMS 圖片區塊，完成首頁重構。

---

## 1. 目標

將首頁的 6 個區塊改為「CMS 可上傳圖片」模式。每個區塊支援桌面版 + 手機版各一張圖片，前台根據裝置自動切換。圖片透過 CMS 後台上傳管理。

---

## 2. 圖片區塊規格

### 2.1 區塊清單

| 順序 | placement 值 | 說明 | 備註 |
|------|-------------|------|------|
| 3 | `hero_brand` | Hero 品牌區（Hello！我是翠翠） | 首頁最上方大圖 |
| 4 | `membership_table` | 官網會員制度表 | 5 級會員表格 |
| 5 | `spring_promo` | 新春滿額禮 / 當季活動 | 促銷卡片區 |
| 6 | `installment_info` | 無卡分期說明 | 分期條件 + 期數 |
| 7 | `shopping_flow` | 客網購物流程圖 | 步驟圖解 |
| 10 | `community_cta` | 品牌社群 + 數據統計 | 歡迎加入女神心機 + 1247+ 等數字 |

### 2.2 圖片顯示規則

```
桌面版：
- max-width: 1920px
- max-height: 900px
- 若原圖高度 = 900px → 寬度按原圖比例縮放（不拉伸）
- 若原圖高度 < 900px → 寬度 100%（最大 1920），高度按原圖比例
- 水平居中
- object-fit: contain（不裁切、不變形）

手機版（< 768px）：
- width: 100%
- height: auto（完全按照上傳圖片的原始比例）
- 不鎖定高度

區塊之間：
- 間距 = 0px（無縫銜接，圖片緊貼）
- 背景色 = #0a0a0a（黑金主題底色）

點擊行為：
- 若 link_url 有值 → 整張圖可點擊跳轉
- 若 link_url 為空 → 純展示，不跳轉
```

---

## 3. 資料庫

### 3.1 使用現有表：`cms_banners`

不需要新建表。利用 `placement` 欄位區分每個區塊。

Schema 已存在（參考 Website_CMS_SOP.md）：

```
cms_banners:
  id                UUID PK
  merchant_code     VARCHAR(50) DEFAULT 'minjie'
  placement         VARCHAR(50)       ← 用這個區分區塊
  title             VARCHAR(255)      ← 可用於 alt text / SEO
  subtitle          VARCHAR(500)      ← 備用
  image_url         TEXT NOT NULL      ← 桌面版圖片
  image_mobile_url  TEXT               ← 手機版圖片
  link_url          TEXT               ← 點擊跳轉連結（選填）
  link_text         VARCHAR(100)       ← 備用
  sort_order        INT DEFAULT 0      ← 同 placement 多張時排序
  is_active         BOOLEAN DEFAULT true
  valid_from        TIMESTAMPTZ
  valid_until       TIMESTAMPTZ
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ
```

### 3.2 初始資料 SQL

✅ **已執行完成**（2026-02-13）

目前 `cms_banners` 共 7 筆：

| placement | title | sort_order | 狀態 |
|-----------|-------|------------|------|
| `hero` | （原有資料） | 0 | 已有圖片 |
| `hero_brand` | Hero 品牌區 | 1 | 待上傳 |
| `membership_table` | 官網會員制度表 | 2 | 待上傳 |
| `spring_promo` | 當季活動促銷 | 3 | 待上傳 |
| `installment_info` | 無卡分期說明 | 4 | 待上傳 |
| `shopping_flow` | 購物流程圖 | 5 | 待上傳 |
| `community_cta` | 品牌社群與數據 | 6 | 待上傳 |

> 注意：原有的 `placement = 'hero'` 不動，6 個新區塊使用獨立的 placement 值。

---

## 4. 前端實作

### 4.1 CMS 查詢函數

在 `lib/cms.ts` 中新增（如果檔案已存在就追加，不存在就建立）：

```typescript
// lib/cms.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!  // Server-side only，不要用 anon key
);

export interface CmsBanner {
  id: string;
  placement: string;
  title: string | null;
  image_url: string;
  image_mobile_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * 取得指定 placement 的 Banner（單筆）
 * 用於首頁圖片區塊
 */
export async function getBannerByPlacement(
  placement: string,
  merchantCode: string = 'minjie'
): Promise<CmsBanner | null> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('cms_banners')
    .select('*')
    .eq('merchant_code', merchantCode)
    .eq('placement', placement)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as CmsBanner;
}

/**
 * 取得指定 placement 的所有 Banner（多筆，輪播用）
 */
export async function getBannersByPlacement(
  placement: string,
  merchantCode: string = 'minjie'
): Promise<CmsBanner[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('cms_banners')
    .select('*')
    .eq('merchant_code', merchantCode)
    .eq('placement', placement)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as CmsBanner[];
}

/**
 * 批量取得多個 placement 的 Banner（首頁一次撈完，減少 DB 請求）
 */
export async function getHomeBanners(
  merchantCode: string = 'minjie'
): Promise<Record<string, CmsBanner | null>> {
  const placements = [
    'hero_brand',
    'membership_table', 
    'spring_promo',
    'installment_info',
    'shopping_flow',
    'community_cta'
  ];
  
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('cms_banners')
    .select('*')
    .eq('merchant_code', merchantCode)
    .in('placement', placements)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    // 回傳空 map
    return Object.fromEntries(placements.map(p => [p, null]));
  }

  // 每個 placement 取第一筆（sort_order 最小的）
  const result: Record<string, CmsBanner | null> = {};
  for (const p of placements) {
    result[p] = (data as CmsBanner[]).find(b => b.placement === p) || null;
  }
  return result;
}
```

### 4.2 ImageSection 元件

建立 `components/cms/ImageSection.tsx`：

```tsx
// components/cms/ImageSection.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { CmsBanner } from '@/lib/cms';

interface ImageSectionProps {
  banner: CmsBanner | null;
  /** 無圖片時是否隱藏區塊（預設 true） */
  hideWhenEmpty?: boolean;
  /** 優先載入（LCP 用，只給第一個區塊設 true） */
  priority?: boolean;
}

export default function ImageSection({ 
  banner, 
  hideWhenEmpty = true,
  priority = false 
}: ImageSectionProps) {
  // 無資料或圖片 URL 為空字串 → 隱藏或顯示 placeholder
  if (!banner || !banner.image_url || banner.image_url.trim() === '') {
    if (hideWhenEmpty) return null;
    return (
      <section 
        className="w-full flex items-center justify-center"
        style={{ 
          background: '#0a0a0a',
          minHeight: '200px',
          border: '1px dashed rgba(212,175,55,0.2)'
        }}
      >
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {banner?.title || '圖片區塊'} — 請至 CMS 上傳圖片
        </p>
      </section>
    );
  }

  const desktopSrc = banner.image_url;
  const mobileSrc = banner.image_mobile_url || banner.image_url;
  const alt = banner.title || 'MINJIE STUDIO';
  const hasLink = banner.link_url && banner.link_url.trim() !== '';

  const imageContent = (
    <div className="w-full" style={{ background: '#0a0a0a' }}>
      {/* 桌面版圖片 */}
      <picture>
        {/* 手機版：< 768px 使用 mobile 圖 */}
        <source
          media="(max-width: 767px)"
          srcSet={mobileSrc}
        />
        {/* 桌面版：>= 768px 使用 desktop 圖 */}
        <source
          media="(min-width: 768px)"
          srcSet={desktopSrc}
        />
        {/* fallback img */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={desktopSrc}
          alt={alt}
          style={{
            width: '100%',
            maxWidth: '1920px',
            maxHeight: '900px',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
          }}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
        />
      </picture>
    </div>
  );

  // 有連結 → 包 Link
  if (hasLink) {
    const isExternal = banner.link_url!.startsWith('http');
    
    if (isExternal) {
      return (
        <a 
          href={banner.link_url!} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          {imageContent}
        </a>
      );
    }
    
    return (
      <Link href={banner.link_url!} className="block">
        {imageContent}
      </Link>
    );
  }

  // 無連結 → 純展示
  return imageContent;
}
```

**設計決策說明：**

- 用原生 `<picture>` + `<img>` 而非 Next.js `<Image>`，因為我們不知道圖片原始尺寸，需要 `height: auto` 按原圖比例顯示。Next.js Image 強制要求 width/height 或 fill，不適合這個場景。
- `max-height: 900px` + `object-fit: contain` 確保超高圖片不會撐破版面。
- 手機版完全按原圖比例，不鎖高度。
- `loading="lazy"` 除了第一個 hero 區塊用 `eager`（LCP 優化）。

### 4.3 首頁組裝

替換 `app/(website)/page.tsx`：

```tsx
// app/(website)/page.tsx
import { getProducts } from '@/lib/medusa';
import { getHomeBanners } from '@/lib/cms';
import ImageSection from '@/components/cms/ImageSection';
import SectionTitle from '@/components/ui/SectionTitle';
import ProductCard from '@/components/ProductCard';

export const revalidate = 3600; // ISR: 1 小時

export default async function HomePage() {
  // 並行請求：CMS 圖片 + Medusa 商品
  const [banners, productsData] = await Promise.all([
    getHomeBanners(),
    getProducts({ limit: 50 }),
  ]);

  const products = productsData.products;

  return (
    <div style={{ background: '#0a0a0a' }}>
      
      {/* ===== 區塊 3: Hero 品牌區 ===== */}
      <ImageSection 
        banner={banners.hero_brand} 
        priority={true}          
        hideWhenEmpty={false}     
      />

      {/* ===== 區塊 4: 會員制度表 ===== */}
      <ImageSection banner={banners.membership_table} />

      {/* ===== 區塊 5: 新春滿額禮 / 當季活動 ===== */}
      <ImageSection banner={banners.spring_promo} />

      {/* ===== 區塊 6: 無卡分期 ===== */}
      <ImageSection banner={banners.installment_info} />

      {/* ===== 區塊 7: 購物流程圖 ===== */}
      <ImageSection banner={banners.shopping_flow} />

      {/* ===== 區塊 8: 商品分類標題 ===== */}
      <section className="py-16 px-5">
        <SectionTitle subtitle="PRODUCTS" title="商品選單" />
        
        {/* TODO: 分類 Tabs（接 Medusa Collections） */}
        
        {/* 商品網格 */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ===== 區塊 10: 品牌社群 + 數據統計 ===== */}
      <ImageSection banner={banners.community_cta} />

    </div>
  );
}
```

**注意：**
- 6 個 ImageSection 之間沒有 padding/margin，圖片無縫銜接
- hero_brand 設 `priority={true}` 和 `hideWhenEmpty={false}`（第一屏一定要顯示）
- 商品區塊（8）夾在圖片區塊 7 和 10 之間，保留程式碼元件
- `Promise.all` 並行請求，不浪費載入時間

---

## 5. 環境變數確認

確保 `.env.local` 有以下變數（已有的不用重複加）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://ephdzjkgpkuydpbkxnfw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...        # service_role key，server-side only（在 Supabase Dashboard > Settings > API 取得）
```

⚠️ `SUPABASE_SERVICE_KEY` 不要用 `NEXT_PUBLIC_` 前綴，這是 server-side 專用。

---

## 6. Next.js Image Domain 設定

在 `next.config.js` 確認 Supabase Storage domain 已允許（雖然我們用原生 img，但其他元件可能需要）：

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ephdzjkgpkuydpbkxnfw.supabase.co',
      },
    ],
  },
};
```

---

## 7. CMS 後台對接

### 7.1 管理介面需求

CMS 管理平台（admin.astrapath-marketing.com）的「頁面內容管理」模組需要為這 6 個 placement 各顯示一個編輯卡片：

```
每個區塊的編輯介面：

┌──────────────────────────────────────────┐
│  🖼️ {title}  [{placement}]              │
│                                          │
│  桌面版圖片                               │
│  ┌────────────────────────────┐          │
│  │  [拖拉或點擊上傳]           │          │
│  │  建議寬度 1920px            │          │
│  │  最大高度 900px             │          │
│  └────────────────────────────┘          │
│  ⓘ 支援 JPG、PNG、WebP｜最大 2MB        │
│                                          │
│  手機版圖片                               │
│  ┌────────────────────────────┐          │
│  │  [拖拉或點擊上傳]           │          │
│  │  寬度按螢幕 100% 顯示       │          │
│  │  高度按原圖比例              │          │
│  └────────────────────────────┘          │
│  ⓘ 支援 JPG、PNG、WebP｜最大 1MB        │
│                                          │
│  連結（選填）：[_________________________] │
│  ⓘ 不填則不跳轉                          │
│                                          │
│  ☑ 啟用                        [儲存]    │
│                                          │
└──────────────────────────────────────────┘
```

### 7.2 圖片上傳流程（CMS 端）

```
1. 使用者選擇/拖拉圖片
2. 前端驗證：格式（JPG/PNG/WebP）、大小（桌面 ≤ 2MB / 手機 ≤ 1MB）
3. 轉 WebP（壓縮品質 85%）
4. 自動命名：MINJIE/{placement}/{timestamp}-{hash}.webp
5. 上傳到 Supabase Storage bucket: cms-images
6. 取得 public URL
7. UPDATE cms_banners SET image_url = '{url}' WHERE placement = '{placement}'
8. 觸發前台 revalidation：POST /api/revalidate?path=/
```

### 7.3 Supabase Storage Bucket

已存在 `cms-images` bucket（不需要新建）。

圖片上傳路徑格式：`MINJIE/{placement}/{timestamp}-{hash}.webp`

例如：
- 桌面版：`MINJIE/hero_brand/1770800000000-abc123.webp`
- 手機版：`minjie/hero_brand-mobile/1770800000000-def456.webp`

---

## 8. Revalidation API

建立 On-demand Revalidation 端點，CMS 儲存後呼叫：

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  
  // 簡單驗證（正式環境用更強的驗證）
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await request.json();
  
  revalidatePath(path || '/');
  
  return NextResponse.json({ 
    revalidated: true, 
    path: path || '/',
    timestamp: new Date().toISOString() 
  });
}
```

環境變數新增：
```env
REVALIDATE_SECRET=your-random-secret-here
```

---

## 9. 檔案清單總覽

### 新建檔案

| 檔案 | 說明 |
|------|------|
| `components/cms/ImageSection.tsx` | 圖片區塊元件 |
| `lib/cms.ts` | CMS Supabase 查詢函數（如已存在則追加） |
| `app/api/revalidate/route.ts` | On-demand Revalidation API |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `app/(website)/page.tsx` | 替換為新首頁組裝（圖片區塊 + 商品區） |

### SQL 執行

| SQL | 說明 |
|-----|------|
| INSERT cms_banners 6 筆 | 建立 6 個 placement 的初始記錄 |

---

## 10. 測試驗證

### 10.1 無圖片狀態

初始部署時所有圖片區塊沒有圖片：
- `hero_brand`：顯示 placeholder（hideWhenEmpty=false）
- 其餘 5 個：隱藏（hideWhenEmpty=true）
- 商品區塊和 Footer 正常顯示

### 10.2 上傳圖片後

手動在 Supabase 更新一筆測試：
```sql
UPDATE cms_banners 
SET image_url = 'https://ephdzjkgpkuydpbkxnfw.supabase.co/storage/v1/object/public/cms-images/MINJIE/hero_brand/test-desktop.webp',
    image_mobile_url = 'https://ephdzjkgpkuydpbkxnfw.supabase.co/storage/v1/object/public/cms-images/minjie/hero_brand-mobile/test-mobile.webp'
WHERE placement = 'hero_brand' AND merchant_code = 'minjie';
```

確認：
- ✅ 桌面版顯示桌面圖，寬不超 1920px，高不超 900px
- ✅ 手機版顯示手機圖，寬 100%，高度按原圖比例
- ✅ 圖片水平居中
- ✅ 區塊之間無間距

### 10.3 連結測試

```sql
UPDATE cms_banners 
SET link_url = '/products'
WHERE placement = 'spring_promo' AND merchant_code = 'minjie';
```

確認：
- ✅ 點擊圖片跳轉到 /products
- ✅ 外部連結在新分頁開啟

---

## 11. 後續步驟

完成本次切版後的 TODO：

1. **CMS 管理頁面** — 在 admin.astrapath-marketing.com 新增圖片區塊管理介面
2. **圖片素材製作** — 請設計師按規格出 6 組桌面 + 手機圖片
3. **商品區塊完善** — 分類 Tabs + 篩選 + 排序（接 Medusa Collections/Tags）
4. **公告跑馬燈** — AnnouncementBar 元件（接 cms_announcements）
5. **Header / Footer** — 確認和截圖設計一致（社群 icon、付款 Logo 等）

---

*此文件為 Claude Code 執行指引。執行時請按照檔案清單逐一建立/修改，完成後跑 `npm run build` 確認無錯誤。*
