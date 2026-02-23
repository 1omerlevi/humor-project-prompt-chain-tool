import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const supabase = await createClient()
  const origin = new URL(request.url).origin

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  return NextResponse.redirect(data.url)
}
