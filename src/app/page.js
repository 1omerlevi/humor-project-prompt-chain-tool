import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin,is_matrix_admin')
      .eq('id', user.id)
      .maybeSingle()
    isAdmin = Boolean(profile?.is_superadmin || profile?.is_matrix_admin)
  }

  return (
    <main className="app-shell">
      <div className="hero-card">
        <div className="eyebrow">ASSIGNMENT #8</div>
        <h1>Prompt Chain Tool</h1>
        <p>
          Manage humor flavors, manage ordered flavor steps, and test caption generation using image test sets.
        </p>
        <div className="cta-row">
          {user ? (
            <>
              <Link href={isAdmin ? '/tool' : '/login?error=forbidden'} className="btn btn-primary">Open Tool</Link>
              <a href="/auth/logout" className="btn">Logout</a>
            </>
          ) : (
            <>
              <a href="/auth/login" className="btn btn-primary">Login with Google</a>
              <Link href="/login" className="btn">Login Page</Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
