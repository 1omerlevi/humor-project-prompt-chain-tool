import { NextResponse } from 'next/server'
import { createClient } from './src/lib/supabase/middleware'

export async function middleware(request) {
  const { supabase, response } = createClient(request)

  if (request.nextUrl.pathname.startsWith('/tool')) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/tool/:path*'],
}
