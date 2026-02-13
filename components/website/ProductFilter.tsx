'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface NavCategory {
  id: string;
  label: string;
  slug: string;
  icon_url: string | null;
}

interface ProductFilterProps {
  categories: NavCategory[];
}

export default function ProductFilter({ categories }: ProductFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || '';

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort) {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }
    router.push(`/products?${params.toString()}`);
  };

  // 選中狀態樣式
  const selectedStyle = {
    background: 'rgba(212, 175, 55, 0.15)',
    color: '#D4AF37',
    border: '1px solid #D4AF37',
    fontWeight: 600,
  };

  // 未選中狀態樣式
  const unselectedStyle = {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    fontWeight: 400,
  };

  return (
    <div className="mb-10">
      {/* 分類標籤 */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {/* 固定的「全部商品」按鈕 */}
        <button
          onClick={() => handleCategoryChange('')}
          className="px-5 py-2 rounded-full text-sm transition-all duration-300"
          style={!currentCategory ? selectedStyle : unselectedStyle}
        >
          全部商品
        </button>
        {/* CMS 分類標籤 */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.slug)}
            className="px-5 py-2 rounded-full text-sm transition-all duration-300"
            style={currentCategory === cat.slug ? selectedStyle : unselectedStyle}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 排序 */}
      <div className="flex justify-end">
        <select
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="text-sm px-4 py-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: '#111',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(212,175,55,0.2)',
            outline: 'none',
          }}
        >
          <option value="">預設排序</option>
          <option value="price_asc">價格：低 → 高</option>
          <option value="price_desc">價格：高 → 低</option>
          <option value="newest">最新上架</option>
        </select>
      </div>
    </div>
  );
}
