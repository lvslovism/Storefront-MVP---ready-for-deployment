// ═══════════════════════════════════════════════════════════════
// app/(website)/search/page.tsx
// 搜尋頁（Client Component — 即時搜尋）
// 施工說明書 v2.1 Phase 2 Step 15
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getProducts, type Product } from '@/lib/medusa';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

interface SearchPost {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  read_time: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'posts'>('products');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // 初始載入所有商品
  useEffect(() => {
    getProducts({ limit: 100 }).then(({ products }) => {
      setAllProducts(products);
    }).catch(console.error);

    // 從 URL 讀取 query
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setQuery(q);

    inputRef.current?.focus();
  }, []);

  // Debounced search
  const doSearch = useCallback((keyword: string) => {
    if (!keyword.trim()) {
      setProducts([]);
      setPosts([]);
      return;
    }

    setLoading(true);
    const kw = keyword.toLowerCase();

    // 前端篩選商品
    const matched = allProducts.filter(p =>
      p.title.toLowerCase().includes(kw) ||
      p.description?.toLowerCase().includes(kw) ||
      p.subtitle?.toLowerCase().includes(kw)
    );
    setProducts(matched);

    // 搜尋文章（透過 API route 或直接 fetch）
    fetch(`/api/search/posts?q=${encodeURIComponent(keyword)}`)
      .then(res => res.ok ? res.json() : { posts: [] })
      .then(data => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [allProducts]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const hasResults = products.length > 0 || posts.length > 0;
  const isSearching = query.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto px-5 py-16">
      {/* Breadcrumb */}
      <nav className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <a href="/" className="hover:text-gold transition-colors">首頁</a>
        <span className="mx-2">›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>搜尋</span>
      </nav>

      {/* Search Box */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋商品或文章..."
            className="w-full px-6 py-4 rounded-full text-sm bg-transparent outline-none"
            style={{
              border: '1px solid rgba(212,175,55,0.3)',
              color: 'rgba(255,255,255,0.9)',
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="rgba(212,175,55,0.5)"
                viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {isSearching && (
        <>
          {/* Tabs */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab('products')}
              className="text-sm px-5 py-2 rounded-full transition-all"
              style={{
                background: activeTab === 'products'
                  ? 'linear-gradient(135deg, #D4AF37, #B8962E)' : 'transparent',
                color: activeTab === 'products' ? '#000' : 'rgba(255,255,255,0.5)',
                border: activeTab === 'products' ? 'none' : '1px solid rgba(212,175,55,0.2)',
              }}>
              商品（{products.length}）
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className="text-sm px-5 py-2 rounded-full transition-all"
              style={{
                background: activeTab === 'posts'
                  ? 'linear-gradient(135deg, #D4AF37, #B8962E)' : 'transparent',
                color: activeTab === 'posts' ? '#000' : 'rgba(255,255,255,0.5)',
                border: activeTab === 'posts' ? 'none' : '1px solid rgba(212,175,55,0.2)',
              }}>
              文章（{posts.length}）
            </button>
          </div>

          {/* Product Results */}
          {activeTab === 'products' && (
            <div>
              {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    找不到符合「{query}」的商品
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Post Results */}
          {activeTab === 'posts' && (
            <div>
              {posts.length > 0 ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {posts.map((p) => (
                    <Link key={p.slug} href={`/blog/${p.slug}`}
                      className="block p-5 rounded-xl group transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(212,175,55,0.1)',
                      }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.7)' }}>
                          {p.category}
                        </span>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {p.read_time} 分鐘
                        </span>
                      </div>
                      <h3 className="text-sm font-medium group-hover:text-gold transition-colors"
                        style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {p.title}
                      </h3>
                      {p.excerpt && (
                        <p className="text-xs mt-1 line-clamp-2"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {p.excerpt}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    找不到符合「{query}」的文章
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty State / Hot Searches */}
      {!isSearching && (
        <div className="text-center py-12">
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            熱門搜尋
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['益生菌', '膠原蛋白', '酵素', '孕媽咪', '598'].map((kw) => (
              <button key={kw}
                onClick={() => setQuery(kw)}
                className="text-sm px-4 py-2 rounded-full transition-colors"
                style={{
                  border: '1px solid rgba(212,175,55,0.2)',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
