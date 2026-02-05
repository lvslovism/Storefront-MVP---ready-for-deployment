'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Collection {
  id: string;
  title: string;
  handle: string;
}

interface ProductFilterProps {
  collections: Collection[];
}

export default function ProductFilter({ collections }: ProductFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCollection = searchParams.get('collection') || '';
  const currentSort = searchParams.get('sort') || '';

  const handleCollectionChange = (handle: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (handle) {
      params.set('collection', handle);
    } else {
      params.delete('collection');
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

  // 排除「全系列商品」
  const displayCollections = collections.filter(c => c.handle !== 'all-product');

  return (
    <div className="mb-10">
      {/* 分類標籤 */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button
          onClick={() => handleCollectionChange('')}
          className="px-5 py-2 rounded-full text-sm transition-all duration-300"
          style={{
            background: !currentCollection ? '#D4AF37' : 'transparent',
            color: !currentCollection ? '#000' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${!currentCollection ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
            fontWeight: !currentCollection ? 600 : 400,
          }}
        >
          全部商品
        </button>
        {displayCollections.map((col) => (
          <button
            key={col.id}
            onClick={() => handleCollectionChange(col.handle)}
            className="px-5 py-2 rounded-full text-sm transition-all duration-300"
            style={{
              background: currentCollection === col.handle ? '#D4AF37' : 'transparent',
              color: currentCollection === col.handle ? '#000' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${currentCollection === col.handle ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
              fontWeight: currentCollection === col.handle ? 600 : 400,
            }}
          >
            {col.title}
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
