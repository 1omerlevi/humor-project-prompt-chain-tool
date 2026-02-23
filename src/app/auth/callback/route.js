import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const origin = url.origin

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`)

  const supabase = await createClient()
  await supabase.auth.exchangeCodeForSession(code)

  return NextResponse.redirect(`${origin}/tool`)
}
