import Link from 'next/link'
import { requirePromptChainAdmin } from '@/lib/admin/guard'
import { createHumorFlavor, updateHumorFlavor, deleteHumorFlavor } from './actions'

export const dynamic = 'force-dynamic'

export default async function FlavorsPage({ searchParams }) {
  const { supabase } = await requirePromptChainAdmin()
  const params = await searchParams
  const status = (params?.status ?? '').toString()
  const message = (params?.message ?? '').toString()

  const { data: flavors, error } = await supabase
    .from('humor_flavors')
    .select('*')
    .order('id', { ascending: false })
    .limit(250)

  return (
    <section className="grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Humor Flavors</h1>
          <div className="muted small">Create, update, delete flavors and open each one to manage steps.</div>
        </div>
        <Link href="/tool/test" className="btn">Go to Test Runner</Link>
      </div>

      {status === 'success' ? <div className="alert alert-ok">Action completed.</div> : null}
      {status === 'error' ? <div className="alert alert-error">{decodeURIComponent(message || 'Flavor action failed.')}</div> : null}

      <article className="card">
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Create New Humor Flavor</h2>
        <form action={createHumorFlavor} className="grid-2">
          <label className="field">
            <span className="label">Slug</span>
            <input className="input" name="slug" required placeholder="e.g. gen-z-dark-roast" />
          </label>
          <label className="field">
            <span className="label">Description</span>
            <input className="input" name="description" placeholder="Short description" />
          </label>
          <div>
            <button type="submit" className="btn btn-primary">Create Flavor</button>
          </div>
        </form>
      </article>

      {error ? (
        <div className="alert alert-error">Failed to load humor flavors: {error.message}</div>
      ) : (
        <div className="grid">
          {(flavors || []).map((flavor) => (
            <article className="card" key={flavor.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div className="label">Flavor ID</div>
                  <div className="mono">{flavor.id}</div>
                </div>
                <Link href={`/tool/flavors/${flavor.id}/steps`} className="btn btn-primary">Manage Steps</Link>
              </div>

              <form action={updateHumorFlavor} className="grid" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={flavor.id} />
                <label className="field">
                  <span className="label">Slug</span>
                  <input className="input" name="slug" required defaultValue={flavor.slug || ''} />
                </label>
                <label className="field">
                  <span className="label">Description</span>
                  <input className="input" name="description" defaultValue={flavor.description || ''} />
                </label>
                <div className="cta-row" style={{ marginTop: 0 }}>
                  <button type="submit" className="btn">Save Flavor</button>
                </div>
              </form>

              <form action={deleteHumorFlavor} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={flavor.id} />
                <button type="submit" className="btn btn-danger">Delete Flavor</button>
              </form>
            </article>
          ))}
          {!flavors?.length ? <div className="card">No humor flavors found.</div> : null}
        </div>
      )}
    </section>
  )
}
