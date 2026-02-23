import Link from 'next/link'
import { requirePromptChainAdmin } from '@/lib/admin/guard'

export const dynamic = 'force-dynamic'

export default async function ToolDashboardPage() {
  const { supabase } = await requirePromptChainAdmin()

  const [flavorsRes, stepsRes, captionsRes, setsRes] = await Promise.all([
    supabase.from('humor_flavors').select('id', { count: 'exact', head: true }),
    supabase.from('humor_flavor_steps').select('id', { count: 'exact', head: true }),
    supabase.from('captions').select('id', { count: 'exact', head: true }),
    supabase.from('study_image_sets').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Humor Flavors', value: flavorsRes.count ?? 0 },
    { label: 'Flavor Steps', value: stepsRes.count ?? 0 },
    { label: 'Captions', value: captionsRes.count ?? 0 },
    { label: 'Image Test Sets', value: setsRes.count ?? 0 },
  ]

  return (
    <section className="grid" style={{ gap: 16 }}>
      <div>
        <div className="eyebrow">WEEK 8</div>
        <h1 style={{ margin: '6px 0 8px' }}>Prompt Chain Tool</h1>
        <p className="muted" style={{ margin: 0 }}>
          Create and manage humor flavors, edit ordered flavor steps, and test caption generation on image test sets using the REST API.
        </p>
      </div>

      <div className="grid-3">
        {stats.map((stat) => (
          <article key={stat.label} className="card">
            <div className="label">{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{stat.value}</div>
          </article>
        ))}
      </div>

      <div className="grid-2">
        <article className="card">
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Manage Humor Flavors</h2>
          <p className="muted small" style={{ margin: '0 0 12px' }}>
            Create, update, delete humor flavors. Open each flavor to create/update/delete/reorder steps.
          </p>
          <Link href="/tool/flavors" className="btn btn-primary">Open Humor Flavors</Link>
        </article>

        <article className="card">
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Test Caption Generation</h2>
          <p className="muted small" style={{ margin: '0 0 12px' }}>
            Choose a humor flavor and image test set, run REST API caption generation, and read captions produced by the selected flavor.
          </p>
          <Link href="/tool/test" className="btn btn-primary">Open Test Set Runner</Link>
        </article>
      </div>
    </section>
  )
}
