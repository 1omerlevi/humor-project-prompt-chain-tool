import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import { requirePromptChainAdmin } from '@/lib/admin/guard'

export const dynamic = 'force-dynamic'

export default async function ToolLayout({ children }) {
  const { user, profile } = await requirePromptChainAdmin()

  return (
    <main className="app-shell" style={{ display: 'block' }}>
      <div className="top-nav">
        <div>
          <div className="eyebrow">PROMPT CHAIN TOOL</div>
          <div className="small muted">{user.email} · {profile.is_superadmin ? 'superadmin' : 'matrix admin'}</div>
        </div>
        <ThemeToggle />
      </div>
      <div className="top-nav" style={{ marginTop: 0 }}>
        <div className="links">
          <Link href="/tool">Dashboard</Link>
          <Link href="/tool/flavors">Humor Flavors</Link>
          <Link href="/tool/test">Test Set Runner</Link>
        </div>
        <div className="links">
          <a href="/auth/logout">Logout</a>
        </div>
      </div>
      <div className="panel" style={{ width: 'min(1200px, 100%)', margin: '0 auto' }}>{children}</div>
    </main>
  )
}
