// ═══════════════════════════════════════════════════════════════
// app/api/search/posts/route.ts
// 文章搜尋 API（供 search page client-side 呼叫）
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { searchPosts } from '@/lib/cms';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const posts = await searchPosts(q.trim());
    // 只回傳必要欄位，避免暴露完整 content
    const simplified = posts.map(p => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      read_time: p.read_time,
    }));
    return NextResponse.json({ posts: simplified });
  } catch (error) {
    console.error('[API] search/posts error:', error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}
