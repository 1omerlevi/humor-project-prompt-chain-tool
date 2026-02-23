'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePromptChainAdmin } from '@/lib/admin/guard'

function normalizeCaptions(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    image_id: row.image_id,
    humor_flavor_id: row.humor_flavor_id,
    content: row.content,
    created_datetime_utc: row.created_datetime_utc,
  }))
}

export async function getTestRunnerData() {
  const { supabase } = await requirePromptChainAdmin()

  const [flavorsRes, setsRes] = await Promise.all([
    supabase.from('humor_flavors').select('id,slug,description').order('id', { ascending: false }).limit(300),
    supabase.from('study_image_sets').select('*').order('id', { ascending: false }).limit(150),
  ])

  return {
    flavors: flavorsRes.data || [],
    imageSets: setsRes.data || [],
    flavorsError: flavorsRes.error?.message || null,
    imageSetsError: setsRes.error?.message || null,
  }
}

export async function getStudyImages(studyImageSetId) {
  const { supabase } = await requirePromptChainAdmin()
  const setId = Number(studyImageSetId)
  if (!setId) return { error: 'Invalid study image set id' }

  const { data: mappings, error: mappingsError } = await supabase
    .from('study_image_set_image_mappings')
    .select('image_id')
    .eq('study_image_set_id', setId)
    .limit(500)

  if (mappingsError) return { error: mappingsError.message }

  const imageIds = [...new Set((mappings || []).map((r) => r.image_id).filter(Boolean))]
  if (!imageIds.length) return { images: [] }

  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('id,created_datetime_utc,is_public,is_common_use,profile_id,image_description,additional_context,celebrity_recognition')
    .in('id', imageIds)
    .order('created_datetime_utc', { ascending: false })

  if (imagesError) return { error: imagesError.message }

  return { images: images || [] }
}

export async function getRecentCaptionsForFlavor({ humorFlavorId, imageId }) {
  const { supabase } = await requirePromptChainAdmin()
  const flavorId = Number(humorFlavorId)
  if (!flavorId) return { error: 'Invalid humor flavor id' }

  let query = supabase
    .from('captions')
    .select('id,image_id,humor_flavor_id,content,created_datetime_utc')
    .eq('humor_flavor_id', flavorId)
    .order('created_datetime_utc', { ascending: false })
    .limit(20)

  if (imageId) query = query.eq('image_id', imageId)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { captions: normalizeCaptions(data) }
}

export async function getRecentCaptionsForImage(imageId) {
  const { supabase } = await requirePromptChainAdmin()
  if (!imageId) return { captions: [] }

  const { data, error } = await supabase
    .from('captions')
    .select('id,image_id,humor_flavor_id,content,created_datetime_utc')
    .eq('image_id', imageId)
    .order('created_datetime_utc', { ascending: false })
    .limit(20)

  if (error) return { error: error.message }
  return { captions: normalizeCaptions(data) }
}

export async function getAccessTokenForClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_superadmin,is_matrix_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return { error: profileError.message }
  if (!profile || !(profile.is_superadmin || profile.is_matrix_admin)) {
    return { error: 'Forbidden' }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { error: 'Missing auth access token' }

  return { accessToken: session.access_token }
}
