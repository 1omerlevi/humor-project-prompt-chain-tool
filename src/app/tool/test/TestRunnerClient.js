'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  getAccessTokenForClient,
  getRecentCaptionsForFlavor,
  getRecentCaptionsForImage,
  getStudyImages,
} from './actions'

function captionText(c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  return c.content ?? c.caption ?? c.text ?? ''
}

function asArray(v) {
  if (Array.isArray(v)) return v
  if (Array.isArray(v?.captions)) return v.captions
  if (Array.isArray(v?.data)) return v.data
  if (Array.isArray(v?.items)) return v.items
  return []
}

export default function TestRunnerClient({ initialFlavors, initialImageSets }) {
  const flavors = asArray(initialFlavors)
  const imageSets = asArray(initialImageSets)

  const [selectedFlavorId, setSelectedFlavorId] = useState(flavors[0]?.id ? String(flavors[0].id) : '')
  const [selectedSetId, setSelectedSetId] = useState(imageSets[0]?.id ? String(imageSets[0].id) : '')
  const [images, setImages] = useState([])
  const [imagesError, setImagesError] = useState('')
  const [selectedImageId, setSelectedImageId] = useState('')
  const [recentCaptions, setRecentCaptions] = useState([])
  const [generatedCaptions, setGeneratedCaptions] = useState([])
  const [generationLog, setGenerationLog] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedImage = useMemo(() => images.find((img) => img.id === selectedImageId) || null, [images, selectedImageId])

  useEffect(() => {
    if (!selectedSetId) {
      queueMicrotask(() => {
        setImages([])
        setSelectedImageId('')
      })
      return
    }

    startTransition(async () => {
      setImagesError('')
      const res = await getStudyImages(selectedSetId)
      if (res?.error) {
        setImages([])
        setSelectedImageId('')
        setImagesError(res.error)
        return
      }
      const nextImages = res.images || []
      setImages(nextImages)
      setSelectedImageId((curr) => (curr && nextImages.some((i) => i.id === curr) ? curr : (nextImages[0]?.id || '')))
    })
  }, [selectedSetId])

  useEffect(() => {
    if (!selectedFlavorId || !selectedImageId) {
      queueMicrotask(() => setRecentCaptions([]))
      return
    }

    startTransition(async () => {
      const res = await getRecentCaptionsForFlavor({ humorFlavorId: selectedFlavorId, imageId: selectedImageId })
      if (res?.captions) {
        setRecentCaptions(res.captions)
        return
      }
      const fallback = await getRecentCaptionsForImage(selectedImageId)
      setRecentCaptions(fallback.captions || [])
    })
  }, [selectedFlavorId, selectedImageId])

  async function callPipeline(payload) {
    const response = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!response.ok && response.status !== 202) {
      const msg = (typeof data === 'string' && data) || data?.error || data?.message || 'Pipeline request failed'
      throw new Error(msg)
    }

    return { status: response.status, data }
  }

  async function handleGenerate() {
    if (!selectedFlavorId || !selectedImageId) {
      setError('Select a humor flavor and an image from a test set first.')
      return
    }

    setError('')
    setGeneratedCaptions([])
    setGenerationLog([])
    setStatus('Checking auth session...')

    const auth = await getAccessTokenForClient()
    if (auth?.error) {
      setStatus('')
      setError(auth.error)
      return
    }

    try {
      setStatus('Triggering caption generation...')
      let result = await callPipeline({ action: 'generate', imageId: selectedImageId, humorFlavorId: Number(selectedFlavorId) })

      let attempts = 0
      while (result.status === 202 && attempts < 12) {
        attempts += 1
        setStatus(`Waiting for captions... (attempt ${attempts}/12)`)
        await new Promise((r) => setTimeout(r, 4000))
        result = await callPipeline({ action: 'poll', imageId: selectedImageId, humorFlavorId: Number(selectedFlavorId) })
      }

      if (result.status === 202) {
        setStatus('')
        setError('Caption generation is still processing. Please retry shortly.')
        return
      }

      const captions = asArray(result.data)
      setGeneratedCaptions(captions)
      setStatus(captions.length ? 'Done: captions generated.' : 'Done: no captions returned.')

      const recent = await getRecentCaptionsForFlavor({ humorFlavorId: selectedFlavorId, imageId: selectedImageId })
      if (recent?.captions) {
        setRecentCaptions(recent.captions)
      } else {
        const fallback = await getRecentCaptionsForImage(selectedImageId)
        setRecentCaptions(fallback.captions || [])
      }

      setGenerationLog((prev) => [
        {
          imageId: selectedImageId,
          humorFlavorId: Number(selectedFlavorId),
          count: captions.length,
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 10))
    } catch (err) {
      setStatus('')
      setError(err instanceof Error ? err.message : 'Failed to generate captions')
    }
  }

  return (
    <section className="grid">
      <div>
        <h1 style={{ margin: 0 }}>Test Set Runner</h1>
        <div className="muted small">Use the REST API to generate captions for a selected image with a selected humor flavor.</div>
      </div>

      <div className="grid-3">
        <label className="field">
          <span className="label">Humor Flavor</span>
          <select className="select" value={selectedFlavorId} onChange={(e) => setSelectedFlavorId(e.target.value)}>
            {flavors.map((f) => (
              <option key={f.id} value={f.id}>{f.id} - {f.slug || f.description || 'flavor'}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Image Test Set</span>
          <select className="select" value={selectedSetId} onChange={(e) => setSelectedSetId(e.target.value)}>
            {imageSets.map((s) => (
              <option key={s.id} value={s.id}>{s.id} - {s.name || s.slug || s.description || 'study_image_set'}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Image</span>
          <select className="select" value={selectedImageId} onChange={(e) => setSelectedImageId(e.target.value)} disabled={!images.length}>
            {images.length ? images.map((img) => (
              <option key={img.id} value={img.id}>{img.id}</option>
            )) : <option value="">No images in selected set</option>}
          </select>
        </label>
      </div>

      {imagesError ? <div className="alert alert-error">{imagesError}</div> : null}

      <div className="grid-2">
        <article className="card grid">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div className="label">Selected Image</div>
              <div className="mono">{selectedImageId || 'None'}</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={!selectedImageId || !selectedFlavorId || isPending}>
              {isPending ? 'Working...' : 'Generate Captions'}
            </button>
          </div>
          {status ? <div className="alert">{status}</div> : null}
          {error ? <div className="alert alert-error">{error}</div> : null}
          {selectedImage ? (
            <div className="grid small muted">
              <div><strong>Public:</strong> {String(selectedImage.is_public)}</div>
              <div><strong>Common Use:</strong> {String(selectedImage.is_common_use)}</div>
              <div><strong>Image Description:</strong> {selectedImage.image_description || 'N/A'}</div>
              <div><strong>Additional Context:</strong> {selectedImage.additional_context || 'N/A'}</div>
            </div>
          ) : null}
        </article>

        <article className="card grid">
          <h2 style={{ margin: 0, fontSize: 18 }}>Recently Produced Captions (Selected Flavor)</h2>
          {!recentCaptions.length ? (
            <div className="muted small">No recent captions found for this flavor/image yet.</div>
          ) : (
            <div className="grid">
              {recentCaptions.map((c) => (
                <div key={c.id} className="card" style={{ padding: 10 }}>
                  <div className="small muted">{c.created_datetime_utc || 'n/a'} · image {c.image_id}</div>
                  <div style={{ marginTop: 6 }}>{captionText(c) || <span className="muted">(empty content)</span>}</div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="card grid">
        <h2 style={{ margin: 0, fontSize: 18 }}>Latest API Result</h2>
        {!generatedCaptions.length ? (
          <div className="muted small">Run generation to see immediate API captions here.</div>
        ) : (
          <div className="grid">
            {generatedCaptions.map((caption, idx) => (
              <div key={caption.id || idx} className="card" style={{ padding: 10 }}>
                <div>{captionText(caption) || JSON.stringify(caption)}</div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="card grid">
        <h2 style={{ margin: 0, fontSize: 18 }}>Run Log</h2>
        {!generationLog.length ? (
          <div className="muted small">No runs yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Flavor</th>
                  <th>Image</th>
                  <th>Caption Count</th>
                </tr>
              </thead>
              <tbody>
                {generationLog.map((row, idx) => (
                  <tr key={`${row.at}-${idx}`}>
                    <td className="small">{row.at}</td>
                    <td className="mono">{row.humorFlavorId}</td>
                    <td className="mono">{row.imageId}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
