import Link from 'next/link'

export default async function LoginPage({ searchParams }) {
  const params = await searchParams
  const error = (params?.error ?? '').toString()

  const messages = {
    oauth: 'Google OAuth login failed. Please try again.',
    forbidden: 'This tool is only available to superadmins or matrix admins.',
    profile_query: 'Could not load your profile permissions.',
    profile_missing: 'No profile record found for your account.',
    missing_code: 'Missing auth callback code. Please try logging in again.',
  }

  return (
    <main className="app-shell">
      <div className="panel" style={{ maxWidth: 680 }}>
        <div className="eyebrow">PROMPT CHAIN TOOL</div>
        <h1 style={{ marginTop: 4 }}>Login</h1>
        <p>Use Google OAuth to access the prompt chain tool. Access requires <code>profiles.is_superadmin</code> or <code>profiles.is_matrix_admin</code>.</p>
        {error ? <div className="alert alert-error">{messages[error] || 'Login error.'}</div> : null}
        <div className="cta-row">
          <a href="/auth/login" className="btn btn-primary">Continue with Google</a>
          <Link href="/" className="btn">Back Home</Link>
        </div>
      </div>
    </main>
  )
}
