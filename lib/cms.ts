import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ephdzjkgpkuydpbkxnfw.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

const MERCHANT = process.env.MERCHANT_CODE || 'minjie'

// Banner 查詢
export async function getBanners(placement: string) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
