import { requirePromptChainAdmin } from '@/lib/admin/guard'
import TestRunnerClient from './TestRunnerClient'
import { getTestRunnerData } from './actions'

export const dynamic = 'force-dynamic'

export default async function TestRunnerPage() {
  await requirePromptChainAdmin()
  const data = await getTestRunnerData()

  return (
    <section className="grid">
      {data.flavorsError ? <div className="alert alert-error">Failed loading humor flavors: {data.flavorsError}</div> : null}
      {data.imageSetsError ? <div className="alert alert-error">Failed loading image test sets: {data.imageSetsError}</div> : null}
      <TestRunnerClient initialFlavors={data.flavors} initialImageSets={data.imageSets} />
    </section>
  )
}
