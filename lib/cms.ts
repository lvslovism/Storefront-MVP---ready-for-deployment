import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ephdzjkgpkuydpbkxnfw.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  })
}

const MERCHANT = process.env.MERCHANT_CODE || 'minjie'

// Banner 查詢
export async function getBanners(placement: string) {
  const now = new Date().toISOString()
  const { data, error } = await getSupabase()
    .from('cms_banners')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('placement', placement)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('sort_order', { ascending: true })

  if (error) console.error('[CMS] getBanners error:', error)
  return data || []
}

// 頁面區塊查詢
export async function getSection(page: string, sectionKey: string) {
  const { data, error } = await getSupabase()
    .from('cms_sections')
    .select('content')
    .eq('merchant_code', MERCHANT)
    .eq('page', page)
    .eq('section_key', sectionKey)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[CMS] getSection error:', error)
  }
  return data?.content || null
}

// 所有頁面區塊（一次查完）
export async function getAllSections(page: string) {
  const { data, error } = await getSupabase()
    .from('cms_sections')
    .select('section_key, content')
    .eq('merchant_code', MERCHANT)
    .eq('page', page)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) console.error('[CMS] getAllSections error:', error)

  const sections: Record<string, any> = {}
  data?.forEach(row => {
    sections[row.section_key] = row.content
  })
  return sections
}

// 公告查詢
export async function getAnnouncements() {
  const now = new Date().toISOString()
  const { data, error } = await getSupabase()
    .from('cms_announcements')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('sort_order', { ascending: true })

  if (error) console.error('[CMS] getAnnouncements error:', error)
  return data || []
}

// 推薦商品 ID 查詢
export async function getFeaturedProductIds(placement: string) {
  const { data, error } = await getSupabase()
    .from('cms_featured_products')
    .select('product_id')
    .eq('merchant_code', MERCHANT)
    .eq('placement', placement)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) console.error('[CMS] getFeaturedProductIds error:', error)
  return data?.map(d => d.product_id) || []
}

// 促銷活動查詢
export async function getCampaigns() {
  const now = new Date().toISOString()
  const { data, error } = await getSupabase()
    .from('cms_campaigns')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('sort_order', { ascending: true })

  if (error) console.error('[CMS] getCampaigns error:', error)
  return data || []
}

// LINE Bot 固定回覆查詢
export async function getBotReply(triggerKey: string) {
  const { data, error } = await getSupabase()
    .from('cms_bot_replies')
    .select('reply_type, reply_content')
    .eq('merchant_code', MERCHANT)
    .eq('trigger_key', triggerKey)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[CMS] getBotReply error:', error)
  }
  return data || null
}

// Supabase Storage 圖片 URL
export function getCmsImageUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/cms-assets/${path}`
}

// ═══════════════════════════════════════════════════════════════
// MINJIE STUDIO — lib/cms.ts 新增函式
// 施工說明書 v2.1 Phase 1 Step 2
// 使用方式：將以下內容貼到現有 lib/cms.ts 檔案底部
// ═══════════════════════════════════════════════════════════════

// ============ 文章 API ============

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  category: string
  tags: string[]
  cover_image: string | null
  og_image: string | null
  seo_title: string | null
  seo_description: string | null
  related_product_ids: string[]
  related_post_slugs: string[]
  is_featured: boolean
  published_at: string
  read_time: number
  created_at: string
  updated_at: string
}

/** 取得已發布文章列表 */
export async function getPosts(params?: {
  category?: string
  limit?: number
  offset?: number
}): Promise<{ posts: Post[]; count: number }> {
  let query = getSupabase()
    .from('cms_posts')
    .select('*', { count: 'exact' })
    .eq('merchant_code', MERCHANT)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (params?.category) {
    query = query.eq('category', params.category)
  }
  if (params?.limit) {
    query = query.limit(params.limit)
  }
  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
  }

  const { data, error, count } = await query

  if (error) console.error('[CMS] getPosts error:', error)
  return { posts: (data as Post[]) || [], count: count || 0 }
}

/** 取得單篇文章 by slug */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await getSupabase()
    .from('cms_posts')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[CMS] getPostBySlug error:', error)
  }
  return (data as Post) || null
}

/** 取得所有已發布文章的 slug（用於 generateStaticParams） */
export async function getAllPostSlugs(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('cms_posts')
    .select('slug')
    .eq('merchant_code', MERCHANT)
    .eq('is_published', true)

  if (error) console.error('[CMS] getAllPostSlugs error:', error)
  return data?.map(d => d.slug) || []
}

/** 取得精選文章 */
export async function getFeaturedPosts(limit: number = 3): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from('cms_posts')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) console.error('[CMS] getFeaturedPosts error:', error)
  return (data as Post[]) || []
}

/** 搜尋文章 */
export async function searchPosts(keyword: string): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from('cms_posts')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('is_published', true)
    .or(`title.ilike.%${keyword}%,excerpt.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .order('published_at', { ascending: false })
    .limit(20)

  if (error) console.error('[CMS] searchPosts error:', error)
  return (data as Post[]) || []
}

// ============ 活動 API（單一活動 by slug） ============

/** 取得單一活動 by slug */
export async function getCampaignBySlug(slug: string) {
  const now = new Date().toISOString()
  const { data, error } = await getSupabase()
    .from('cms_campaigns')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('slug', slug)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[CMS] getCampaignBySlug error:', error)
  }
  return data || null
}

// ============ 商品評價 API ============

export interface Review {
  id: string
  product_handle: string
  rating: number
  reviewer_name: string
  review_text: string | null
  is_verified: boolean
  created_at: string
}

/** 取得商品評價 */
export async function getProductReviews(productHandle: string): Promise<{
  reviews: Review[]
  avgRating: number
  count: number
}> {
  const { data, error } = await getSupabase()
    .from('cms_reviews')
    .select('*')
    .eq('merchant_code', MERCHANT)
    .eq('product_handle', productHandle)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) console.error('[CMS] getProductReviews error:', error)

  const reviews = (data as Review[]) || []
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return { reviews, avgRating, count: reviews.length }
}

// ============ 首頁圖片區塊 API ============

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
  merchantCode: string = MERCHANT
): Promise<CmsBanner | null> {
  const now = new Date().toISOString();

  const { data, error } = await getSupabase()
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
  merchantCode: string = MERCHANT
): Promise<CmsBanner[]> {
  const now = new Date().toISOString();

  const { data, error } = await getSupabase()
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
  merchantCode: string = MERCHANT
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

  const { data, error } = await getSupabase()
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
