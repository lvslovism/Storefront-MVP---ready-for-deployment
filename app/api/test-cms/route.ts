import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from('cms_sections')
    .select('section_key, page')
    .eq('merchant_code', 'minjie')
    .limit(5)

  return NextResponse.json({
    url,
    hasKey: !!key,
    keyLength: key.length,
    keyPrefix: key.substring(0, 20),
    data,
    error,
  })
}
