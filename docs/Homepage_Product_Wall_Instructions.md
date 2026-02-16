# 首頁商品展示設定 — Claude Code 指令

> 日期：2026-02-16
> 執行模式：**全自動，不要停下來問任何問題，遇到錯誤記錄後繼續，全部做完才輸出報告**

---

## 概覽

新增「首頁商品展示設定」功能，讓管理員透過 CMS 控制首頁商品牆（精選商品下方的區塊）的顯示方式。

DB table `cms_homepage_product_settings` 已建好，包含欄位：
- `show_product_wall` (boolean) — 是否顯示
- `wall_title` (varchar) — 標題
- `wall_subtitle` (varchar) — 英文副標
- `wall_source` (varchar) — 'all' 或 'exclude_featured'
- `wall_max_items` (int) — 最多顯示幾個，0=不限
- `wall_columns_mobile` (int) — 手機欄數 1-3
- `wall_columns_desktop` (int) — 桌機欄數 2-6
- `show_view_all_button` (boolean) — 是否顯示「查看全部」按鈕
- `view_all_text` (varchar) — 按鈕文字
- `view_all_url` (varchar) — 按鈕連結

---

# Part 1：CMS（O:\Projects\cms-admin）

## 任務 1：新增 API Route

在 `app/api/homepage-settings/route.ts` 建立新的 API route：

### GET — 讀取設定

```typescript
// GET /api/homepage-settings?merchant_code=minjie
// 從 cms_homepage_product_settings 讀取
// 用 service_role key
// 如果沒有資料，回傳預設值
```

回傳結構：
```json
{
  "show_product_wall": true,
  "wall_title": "嚴選商品",
  "wall_subtitle": "OUR PRODUCTS",
  "wall_source": "exclude_featured",
  "wall_max_items": 12,
  "wall_columns_mobile": 2,
  "wall_columns_desktop": 4,
  "show_view_all_button": true,
  "view_all_text": "查看全部商品",
  "view_all_url": "/products"
}
```

### POST — 儲存設定

```typescript
// POST /api/homepage-settings
// body: { merchant_code, ...settings }
// UPSERT into cms_homepage_product_settings
// 用 service_role key
// 儲存成功後 revalidate Storefront（呼叫 revalidateStorefront(['/'])）
```

**參考現有的 API route 寫法**（如 `app/api/products/route.ts` 或 `app/api/announcements/route.ts`），保持一致的錯誤處理和回傳格式。

**確認 revalidateStorefront 函式的 import 路徑和用法：**
```bash
grep -rn "revalidateStorefront" app/api/ lib/ --include="*.ts" | head -5
```

## 任務 2：CMS 商品管理頁面新增設定區塊

在 `app/s/[token]/products/page.tsx` 中，在現有的「精選商品」和「所有商品」Tabs **上方或下方**，新增一個「首頁展示設定」區塊。

**建議放在頁面頂部（Tab 上方）**，因為這是全域設定，不屬於任何一個 Tab。

### UI 設計

```tsx
{/* 首頁商品展示設定 — 可折疊面板 */}
<details className="mb-6 border border-[#333] rounded-lg overflow-hidden">
  <summary className="px-4 py-3 bg-[#1a1a1a] cursor-pointer flex items-center justify-between text-sm font-medium text-white hover:bg-[#222]">
    <span>⚙️ 首頁商品展示設定</span>
    <span className="text-xs text-gray-500">點擊展開</span>
  </summary>
  
  <div className="p-4 space-y-4 bg-[#111]">
    
    {/* 商品牆開關 */}
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">
        顯示商品牆（精選商品下方）
      </label>
      <button
        onClick={() => setSettings(s => ({ ...s, show_product_wall: !s.show_product_wall }))}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          settings.show_product_wall ? 'bg-[#D4AF37]' : 'bg-gray-600'
        }`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          settings.show_product_wall ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>

    {/* 以下只在 show_product_wall = true 時顯示 */}
    {settings.show_product_wall && (
      <div className="space-y-3 pt-2 border-t border-[#333]">
        
        {/* 標題 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">標題</label>
            <input
              value={settings.wall_title}
              onChange={e => setSettings(s => ({ ...s, wall_title: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
              placeholder="嚴選商品"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">英文副標</label>
            <input
              value={settings.wall_subtitle}
              onChange={e => setSettings(s => ({ ...s, wall_subtitle: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
              placeholder="OUR PRODUCTS"
            />
          </div>
        </div>

        {/* 資料來源 + 數量上限 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">資料來源</label>
            <select
              value={settings.wall_source}
              onChange={e => setSettings(s => ({ ...s, wall_source: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="exclude_featured">排除精選商品的其餘</option>
              <option value="all">全部商品</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">最多顯示（0=不限）</label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.wall_max_items}
              onChange={e => setSettings(s => ({ ...s, wall_max_items: parseInt(e.target.value) || 0 }))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
            />
          </div>
        </div>

        {/* 欄數設定 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">手機版欄數</label>
            <select
              value={settings.wall_columns_mobile}
              onChange={e => setSettings(s => ({ ...s, wall_columns_mobile: parseInt(e.target.value) }))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="1">1 欄</option>
              <option value="2">2 欄</option>
              <option value="3">3 欄</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">桌機版欄數</label>
            <select
              value={settings.wall_columns_desktop}
              onChange={e => setSettings(s => ({ ...s, wall_columns_desktop: parseInt(e.target.value) }))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="2">2 欄</option>
              <option value="3">3 欄</option>
              <option value="4">4 欄</option>
              <option value="5">5 欄</option>
              <option value="6">6 欄</option>
            </select>
          </div>
        </div>

        {/* 查看全部按鈕 */}
        <div className="pt-2 border-t border-[#333] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">「查看全部」按鈕</label>
            <button
              onClick={() => setSettings(s => ({ ...s, show_view_all_button: !s.show_view_all_button }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.show_view_all_button ? 'bg-[#D4AF37]' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.show_view_all_button ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          {settings.show_view_all_button && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">按鈕文字</label>
                <input
                  value={settings.view_all_text}
                  onChange={e => setSettings(s => ({ ...s, view_all_text: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">連結</label>
                <input
                  value={settings.view_all_url}
                  onChange={e => setSettings(s => ({ ...s, view_all_url: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* 儲存按鈕 */}
        <div className="pt-2">
          <button
            onClick={saveHomepageSettings}
            className="px-4 py-2 bg-[#D4AF37] text-black text-sm font-medium rounded hover:bg-[#C4A030] transition-colors"
          >
            儲存展示設定
          </button>
        </div>
      </div>
    )}
  </div>
</details>
```

### State 和資料載入

```typescript
// 預設值
const defaultSettings = {
  show_product_wall: true,
  wall_title: '嚴選商品',
  wall_subtitle: 'OUR PRODUCTS',
  wall_source: 'exclude_featured',
  wall_max_items: 12,
  wall_columns_mobile: 2,
  wall_columns_desktop: 4,
  show_view_all_button: true,
  view_all_text: '查看全部商品',
  view_all_url: '/products',
};

const [settings, setSettings] = useState(defaultSettings);

// 頁面載入時讀取設定
useEffect(() => {
  fetch('/api/homepage-settings?merchant_code=minjie')
    .then(res => res.json())
    .then(data => {
      if (data && !data.error) {
        setSettings({ ...defaultSettings, ...data });
      }
    })
    .catch(console.error);
}, []);

// 儲存
const saveHomepageSettings = async () => {
  try {
    const res = await fetch('/api/homepage-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_code: 'minjie', ...settings }),
    });
    const data = await res.json();
    if (data.error) {
      alert('儲存失敗：' + data.error);
    } else {
      alert('展示設定已儲存');
    }
  } catch (err) {
    alert('儲存失敗');
  }
};
```

## 任務 3：Build CMS

```bash
cd "O:\Projects\cms-admin"
npm run build
```

---

# Part 2：Storefront（O:\Projects\Storefront-MVP---ready-for-deployment）

## 任務 4：lib/cms.ts 新增查詢函式

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
grep -n "getProductSortOrder\|supabase" lib/cms.ts | head -10
```

在 `lib/cms.ts` 新增：

```typescript
export async function getHomepageProductSettings(merchantCode: string = 'minjie') {
  const { data, error } = await supabase
    .from('cms_homepage_product_settings')
    .select('*')
    .eq('merchant_code', merchantCode)
    .single();
  
  if (error || !data) {
    // 回傳預設值
    return {
      show_product_wall: true,
      wall_title: '嚴選商品',
      wall_subtitle: 'OUR PRODUCTS',
      wall_source: 'exclude_featured',
      wall_max_items: 12,
      wall_columns_mobile: 2,
      wall_columns_desktop: 4,
      show_view_all_button: true,
      view_all_text: '查看全部商品',
      view_all_url: '/products',
    };
  }
  
  return data;
}
```

## 任務 5：修改首頁 page.tsx

找到首頁：
```bash
cat app/\(website\)/page.tsx | head -30
grep -n "嚴選商品\|OUR PRODUCTS\|MORE PRODUCTS\|remainingProducts\|sortedRemaining\|product.*wall" app/\(website\)/page.tsx
```

### 5.1 引入 getHomepageProductSettings

```typescript
import { getHomepageProductSettings } from '@/lib/cms';
```

### 5.2 在資料取得的 Promise.all 中加入

```typescript
const [homepageSettings, ...其他] = await Promise.all([
  getHomepageProductSettings(),
  // ... 其他已有的查詢
]);
```

### 5.3 修改區塊 B（現在的「嚴選商品（剩餘）」）

找到現在的區塊 B（上次新增的「更多商品」→「嚴選商品」區塊），用設定值控制：

```tsx
{/* 區塊 9: 商品牆 — 由 CMS 設定控制 */}
{homepageSettings.show_product_wall && sortedRemaining.length > 0 && (
  <section className="max-w-7xl mx-auto px-5 py-16">
    {/* 標題 */}
    <div className="text-center mb-10">
      <p className="text-xs tracking-[4px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
        ─── {homepageSettings.wall_subtitle} ───
      </p>
      <h2 className="text-2xl font-light tracking-[2px] gold-text">
        {homepageSettings.wall_title}
      </h2>
    </div>
    
    {/* 商品網格 — 用設定的欄數 */}
    <div className={`flex flex-wrap justify-center gap-4 md:gap-6`}>
      {displayProducts.map((product) => (
        <div
          key={product.id}
          className={getColumnClass(homepageSettings.wall_columns_mobile, homepageSettings.wall_columns_desktop)}
          style={{ maxWidth: '300px' }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>

    {/* 查看全部按鈕 */}
    {homepageSettings.show_view_all_button && (
      <div className="text-center mt-10">
        <a
          href={homepageSettings.view_all_url}
          className="inline-block border border-[#D4AF37]/30 text-[#D4AF37] px-8 py-3 text-sm tracking-wider hover:bg-[#D4AF37]/10 transition-colors rounded"
        >
          {homepageSettings.view_all_text}
        </a>
      </div>
    )}
  </section>
)}
```

### 5.4 商品牆的資料邏輯

```typescript
// 商品牆的商品列表
let wallProducts = homepageSettings.wall_source === 'exclude_featured'
  ? allProducts.filter(p => !featuredProductIdSet.has(p.id))
  : [...allProducts];

// 套用 CMS 排序（跟 /products 頁面一樣的邏輯）
if (sortOrder && sortOrder.length > 0) {
  const sortMap = new Map(
    sortOrder.map(s => [s.product_id, { sort_order: s.sort_order, is_pinned: s.is_pinned }])
  );
  const withSort = wallProducts.filter(p => sortMap.has(p.id));
  const withoutSort = wallProducts.filter(p => !sortMap.has(p.id));
  withSort.sort((a, b) => {
    const sa = sortMap.get(a.id)!;
    const sb = sortMap.get(b.id)!;
    if (sa.is_pinned && !sb.is_pinned) return -1;
    if (!sa.is_pinned && sb.is_pinned) return 1;
    return sa.sort_order - sb.sort_order;
  });
  wallProducts = [...withSort, ...withoutSort];
}

// 數量上限
const displayProducts = homepageSettings.wall_max_items > 0
  ? wallProducts.slice(0, homepageSettings.wall_max_items)
  : wallProducts;
```

### 5.5 動態欄數的 CSS class 生成

新增一個 helper function：

```typescript
function getColumnClass(mobile: number, desktop: number): string {
  // 手機版寬度
  const mobileWidths: Record<number, string> = {
    1: 'w-[calc(100%-0px)]',
    2: 'w-[calc(50%-8px)]',
    3: 'w-[calc(33.333%-11px)]',
  };
  
  // 桌機版寬度
  const desktopWidths: Record<number, string> = {
    2: 'lg:w-[calc(50%-12px)]',
    3: 'lg:w-[calc(33.333%-16px)]',
    4: 'lg:w-[calc(25%-18px)]',
    5: 'lg:w-[calc(20%-19px)]',
    6: 'lg:w-[calc(16.666%-20px)]',
  };
  
  const mobileClass = mobileWidths[mobile] || mobileWidths[2];
  const desktopClass = desktopWidths[desktop] || desktopWidths[4];
  
  return `${mobileClass} ${desktopClass}`;
}
```

**注意：** 這個函式可以放在 page.tsx 頂部，或者放在 utils 裡。

### 5.6 確認沒有重複的商品區塊

如果之前的「嚴選商品（剩餘）」區塊還在（硬編碼的），確保它被替換為上述由設定控制的版本，不要出現兩個。

搜尋確認：
```bash
grep -n "sortedRemaining\|remainingProducts\|MORE PRODUCTS\|更多商品" app/\(website\)/page.tsx
```

## 任務 6：Build Storefront

```bash
cd "O:\Projects\Storefront-MVP---ready-for-deployment"
npm run build
```

---

## 開發規範提醒

1. **Supabase 查詢用 anon key**（Storefront 端），service_role key（CMS API 端）
2. **CMS 儲存後 revalidate Storefront**：`revalidateStorefront(['/'])`
3. **找到現有的 revalidateStorefront 用法照抄**，不要自己寫新的
4. **不動精選商品 Tab 的任何邏輯**
5. **不動 /products 頁面**
6. **Storefront 的 Tailwind class 不能用動態字串拼接**（如 `grid-cols-${n}`），必須用完整的 class 或 inline style 或預定義 map
7. **getHomepageProductSettings 查詢失敗時回傳預設值**，不能讓首頁掛掉

---

## 完成後輸出報告

```
=== 首頁商品展示設定完成 ===

Part 1 — CMS：
1. API Route: [新增的檔案路徑]
2. 設定 UI: [修改的檔案]
3. Build: ✅/❌

Part 2 — Storefront：
4. lib/cms.ts: getHomepageProductSettings() [新增]
5. 首頁 page.tsx: 商品牆由設定控制 [修改]
6. Build: ✅/❌

待人工處理：
- CMS: git commit + push + vercel --prod
- Storefront: git commit + push
```
