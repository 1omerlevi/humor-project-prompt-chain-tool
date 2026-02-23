import Link from 'next/link'
import { requirePromptChainAdmin } from '@/lib/admin/guard'
import {
  createHumorFlavorStep,
  deleteHumorFlavorStep,
  moveHumorFlavorStep,
  updateHumorFlavorStep,
} from './actions'

export const dynamic = 'force-dynamic'

function optionLabel(row) {
  return row?.name || row?.slug || row?.description || `id=${row?.id}`
}

export default async function FlavorStepsPage({ params, searchParams }) {
  const { supabase } = await requirePromptChainAdmin()
  const routeParams = await params
  const queryParams = await searchParams
  const humorFlavorId = Number(routeParams?.id)

  if (!humorFlavorId) {
    return <div className="alert alert-error">Invalid humor flavor id.</div>
  }

  const [
    { data: flavor, error: flavorError },
    { data: steps, error: stepsError },
    { data: stepTypes },
    { data: inputTypes },
    { data: outputTypes },
    { data: models },
  ] = await Promise.all([
    supabase.from('humor_flavors').select('*').eq('id', humorFlavorId).maybeSingle(),
    supabase.from('humor_flavor_steps').select('*').eq('humor_flavor_id', humorFlavorId).order('order_by', { ascending: true }).order('id', { ascending: true }),
    supabase.from('humor_flavor_step_types').select('*').order('id', { ascending: true }),
    supabase.from('llm_input_types').select('*').order('id', { ascending: true }),
    supabase.from('llm_output_types').select('*').order('id', { ascending: true }),
    supabase.from('llm_models').select('*').order('id', { ascending: true }),
  ])

  const status = (queryParams?.status ?? '').toString()
  const message = (queryParams?.message ?? '').toString()

  return (
    <section className="grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Flavor Steps</h1>
          <div className="muted small">
            Flavor ID: <span className="mono">{humorFlavorId}</span>
            {flavor?.slug ? <> · Slug: <span className="mono">{flavor.slug}</span></> : null}
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: 0 }}>
          <Link href="/tool/flavors" className="btn">Back to Flavors</Link>
          <Link href="/tool/test" className="btn btn-primary">Test This Flavor</Link>
        </div>
      </div>

      {status === 'success' ? <div className="alert alert-ok">Action completed.</div> : null}
      {status === 'error' ? <div className="alert alert-error">{decodeURIComponent(message || 'Step action failed.')}</div> : null}
      {flavorError ? <div className="alert alert-error">Failed loading flavor: {flavorError.message}</div> : null}

      <article className="card">
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Create Humor Flavor Step</h2>
        <form action={createHumorFlavorStep} className="grid">
          <input type="hidden" name="humorFlavorId" value={humorFlavorId} />
          <div className="grid-2">
            <label className="field"><span className="label">Order</span><input className="input" name="order_by" type="number" defaultValue={1} required /></label>
            <label className="field"><span className="label">Temperature (optional)</span><input className="input" name="llm_temperature" type="number" step="0.1" /></label>
          </div>
          <div className="grid-3">
            <label className="field"><span className="label">Input Type</span><select className="select" name="llm_input_type_id" required>{(inputTypes || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
            <label className="field"><span className="label">Output Type</span><select className="select" name="llm_output_type_id" required>{(outputTypes || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
            <label className="field"><span className="label">Model</span><select className="select" name="llm_model_id" required>{(models || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
            <label className="field"><span className="label">Step Type</span><select className="select" name="humor_flavor_step_type_id" required>{(stepTypes || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
          </div>
          <label className="field"><span className="label">System Prompt</span><textarea className="textarea" name="llm_system_prompt" required rows={4} /></label>
          <label className="field"><span className="label">User Prompt</span><textarea className="textarea" name="llm_user_prompt" required rows={4} /></label>
          <label className="field"><span className="label">Description (optional)</span><input className="input" name="description" /></label>
          <div><button type="submit" className="btn btn-primary">Create Step</button></div>
        </form>
      </article>

      {stepsError ? (
        <div className="alert alert-error">Failed to load steps: {stepsError.message}</div>
      ) : !steps?.length ? (
        <div className="card">No steps found for this flavor.</div>
      ) : (
        <div className="grid">
          {steps.map((step, idx) => (
            <article className="card" key={step.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div className="label">Step ID</div>
                  <div className="mono">{step.id}</div>
                </div>
                <div className="cta-row" style={{ marginTop: 0 }}>
                  <form action={moveHumorFlavorStep}>
                    <input type="hidden" name="stepId" value={step.id} />
                    <input type="hidden" name="humorFlavorId" value={humorFlavorId} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" className="btn" disabled={idx === 0}>Move Up</button>
                  </form>
                  <form action={moveHumorFlavorStep}>
                    <input type="hidden" name="stepId" value={step.id} />
                    <input type="hidden" name="humorFlavorId" value={humorFlavorId} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" className="btn" disabled={idx === steps.length - 1}>Move Down</button>
                  </form>
                </div>
              </div>

              <form action={updateHumorFlavorStep} className="grid" style={{ marginTop: 10 }}>
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="humorFlavorId" value={humorFlavorId} />
                <div className="grid-2">
                  <label className="field"><span className="label">Order</span><input className="input" name="order_by" type="number" defaultValue={step.order_by ?? 1} required /></label>
                  <label className="field"><span className="label">Temperature (optional)</span><input className="input" name="llm_temperature" type="number" step="0.1" defaultValue={step.llm_temperature ?? ''} /></label>
                </div>
                <div className="grid-3">
                  <label className="field"><span className="label">Input Type</span><select className="select" name="llm_input_type_id" required defaultValue={step.llm_input_type_id ?? ''}>{(inputTypes || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
                  <label className="field"><span className="label">Output Type</span><select className="select" name="llm_output_type_id" required defaultValue={step.llm_output_type_id ?? ''}>{(outputTypes || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
                  <label className="field"><span className="label">Model</span><select className="select" name="llm_model_id" required defaultValue={step.llm_model_id ?? ''}>{(models || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
                  <label className="field"><span className="label">Step Type</span><select className="select" name="humor_flavor_step_type_id" required defaultValue={step.humor_flavor_step_type_id ?? ''}>{(stepTypes || []).map((r) => <option key={r.id} value={r.id}>{r.id} - {optionLabel(r)}</option>)}</select></label>
                </div>
                <label className="field"><span className="label">System Prompt</span><textarea className="textarea" name="llm_system_prompt" rows={4} required defaultValue={step.llm_system_prompt ?? ''} /></label>
                <label className="field"><span className="label">User Prompt</span><textarea className="textarea" name="llm_user_prompt" rows={4} required defaultValue={step.llm_user_prompt ?? ''} /></label>
                <label className="field"><span className="label">Description (optional)</span><input className="input" name="description" defaultValue={step.description ?? ''} /></label>
                <div className="cta-row" style={{ marginTop: 0 }}><button type="submit" className="btn">Save Step</button></div>
              </form>

              <form action={deleteHumorFlavorStep} style={{ marginTop: 8 }}>
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="humorFlavorId" value={humorFlavorId} />
                <button type="submit" className="btn btn-danger">Delete Step</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
