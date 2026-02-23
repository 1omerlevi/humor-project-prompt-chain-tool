import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = 'https://api.almostcrackd.ai'
export const runtime = 'nodejs'
export const maxDuration = 300

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function msgFrom(v, fallback = 'Pipeline request failed') {
  if (!v) return fallback
  if (typeof v === 'string' && v.trim()) return v
  if (typeof v?.message === 'string' && v.message.trim()) return v.message
  if (typeof v?.error === 'string' && v.error.trim()) return v.error
  return fallback
}

function isTimeoutError(error) {
  const msg = msgFrom(error, '').toLowerCase()
  return error?.name === 'AbortError' || msg.includes('timed out') || msg.includes('aborted')
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('Request timed out'), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

async function getAccessToken() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { error: 'Missing auth access token', status: 401 }
  return { token: session.access_token }
}

async function proxy(path, body, token, timeoutMs) {
  const res = await fetchWithTimeout(
    `${BASE_URL}${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    timeoutMs
  )

  const raw = await res.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }
  return { res, raw, data }
}

function asCaptionArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.captions)) return payload.captions
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function processingLike(status, data, raw) {
  const msg = msgFrom(data, raw).toLowerCase()
  return (
    status === 202 || status === 429 || status === 502 || status === 503 || status === 504 ||
    data === true || raw === 'true' || data?.processing === true ||
    msg.includes('processing') || msg.includes('queued') || msg.includes('still processing') ||
    msg.includes('timed out') || msg.includes('cloudfront')
  )
}

async function generateCaptions({ imageId, humorFlavorId }, token, timeoutMs = 45000) {
  const body = humorFlavorId ? { imageId, humorFlavorId } : { imageId }
  let first = await proxy('/pipeline/generate-captions', body, token, timeoutMs)

  if (!first.res.ok && humorFlavorId) {
    const m = msgFrom(first.data, first.raw).toLowerCase()
    if (m.includes('unexpected') || m.includes('invalid') || m.includes('schema') || m.includes('body')) {
      first = await proxy('/pipeline/generate-captions', { imageId }, token, timeoutMs)
    }
  }

  const captions = asCaptionArray(first.data)
  if (first.res.ok && captions.length > 0) return { done: true, captions }
  if (processingLike(first.res.status, first.data, first.raw) || (first.res.ok && captions.length === 0)) {
    return { done: false, processing: true, message: 'Caption generation is still processing.' }
  }

  return {
    done: false,
    processing: false,
    error: msgFrom(first.data, first.raw || 'Failed to generate captions'),
    status: first.res.status || 500,
  }
}

export async function POST(request) {
  try {
    const auth = await getAccessToken()
    if (auth.error) return jsonError(auth.error, auth.status)

    let payload
    try {
      payload = await request.json()
    } catch {
      return jsonError('Invalid JSON body')
    }

    const action = payload?.action
    if (action !== 'generate' && action !== 'poll') {
      return jsonError('Unsupported action. Use generate/poll.')
    }

    const imageId = (payload?.imageId ?? '').toString().trim()
    const humorFlavorIdRaw = (payload?.humorFlavorId ?? '').toString().trim()
    const humorFlavorId = humorFlavorIdRaw ? Number(humorFlavorIdRaw) : null
    if (!imageId) return jsonError('Missing imageId')

    try {
      const result = await generateCaptions({ imageId, humorFlavorId }, auth.token, action === 'poll' ? 30000 : 45000)
      if (result.done) return NextResponse.json(result.captions)
      if (result.processing) {
        return NextResponse.json({ processing: true, message: result.message }, { status: 202 })
      }
      return jsonError(result.error, result.status)
    } catch (error) {
      if (isTimeoutError(error)) {
        return NextResponse.json({ processing: true, message: 'Caption generation is still processing.' }, { status: 202 })
      }
      return jsonError(msgFrom(error, 'Unexpected pipeline error'), 500)
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ processing: true, message: 'Caption generation is still processing.' }, { status: 202 })
    }
    return jsonError(msgFrom(error, 'Unexpected pipeline error'), 500)
  }
}
