'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePromptChainAdmin } from '@/lib/admin/guard'

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toNullableNumber(value) {
  const str = (value ?? '').toString().trim()
  if (!str) return null
  const n = Number(str)
  return Number.isFinite(n) ? n : null
}

function stepsPath(humorFlavorId) {
  return `/tool/flavors/${humorFlavorId}/steps`
}

function fail(humorFlavorId, message) {
  redirect(`${stepsPath(humorFlavorId)}?status=error&message=${encodeURIComponent(message)}`)
}

function baseStepPayload(formData, humorFlavorId) {
  return {
    humor_flavor_id: humorFlavorId,
    order_by: toNumber(formData.get('order_by')),
    llm_temperature: toNullableNumber(formData.get('llm_temperature')),
    llm_input_type_id: toNumber(formData.get('llm_input_type_id')),
    llm_output_type_id: toNumber(formData.get('llm_output_type_id')),
    llm_model_id: toNumber(formData.get('llm_model_id')),
    humor_flavor_step_type_id: toNumber(formData.get('humor_flavor_step_type_id')),
    llm_system_prompt: (formData.get('llm_system_prompt') ?? '').toString().trim(),
    llm_user_prompt: (formData.get('llm_user_prompt') ?? '').toString().trim(),
    description: ((formData.get('description') ?? '').toString().trim() || null),
  }
}

function validateStepPayload(payload) {
  return Boolean(
    payload.order_by &&
    payload.llm_input_type_id &&
    payload.llm_output_type_id &&
    payload.llm_model_id &&
    payload.humor_flavor_step_type_id
  )
}

function revalidateFlavorPages(humorFlavorId) {
  revalidatePath('/tool')
  revalidatePath('/tool/flavors')
  revalidatePath(stepsPath(humorFlavorId))
  revalidatePath('/tool/test')
}

export async function createHumorFlavorStep(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const humorFlavorId = toNumber(formData.get('humorFlavorId'))
  if (!humorFlavorId) fail('0', 'Missing humor flavor id')

  const payload = baseStepPayload(formData, humorFlavorId)
  if (!validateStepPayload(payload)) fail(humorFlavorId, 'Missing required numeric fields')

  const { error } = await supabase.from('humor_flavor_steps').insert(payload)
  if (error) fail(humorFlavorId, error.message || 'Failed to create step')

  revalidateFlavorPages(humorFlavorId)
  redirect(`${stepsPath(humorFlavorId)}?status=success`)
}

export async function updateHumorFlavorStep(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const stepId = toNumber(formData.get('stepId'))
  const humorFlavorId = toNumber(formData.get('humorFlavorId'))
  if (!stepId || !humorFlavorId) fail(humorFlavorId || '0', 'Missing ids')

  const payload = baseStepPayload(formData, humorFlavorId)
  delete payload.humor_flavor_id
  if (!validateStepPayload({ ...payload, humor_flavor_id: humorFlavorId })) fail(humorFlavorId, 'Missing required numeric fields')

  const { error } = await supabase
    .from('humor_flavor_steps')
    .update(payload)
    .eq('id', stepId)
    .eq('humor_flavor_id', humorFlavorId)

  if (error) fail(humorFlavorId, error.message || 'Failed to update step')

  revalidateFlavorPages(humorFlavorId)
  redirect(`${stepsPath(humorFlavorId)}?status=success`)
}

export async function deleteHumorFlavorStep(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const stepId = toNumber(formData.get('stepId'))
  const humorFlavorId = toNumber(formData.get('humorFlavorId'))
  if (!stepId || !humorFlavorId) fail(humorFlavorId || '0', 'Missing ids')

  const { error } = await supabase
    .from('humor_flavor_steps')
    .delete()
    .eq('id', stepId)
    .eq('humor_flavor_id', humorFlavorId)

  if (error) fail(humorFlavorId, error.message || 'Failed to delete step')

  revalidateFlavorPages(humorFlavorId)
  redirect(`${stepsPath(humorFlavorId)}?status=success`)
}

export async function moveHumorFlavorStep(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const stepId = toNumber(formData.get('stepId'))
  const humorFlavorId = toNumber(formData.get('humorFlavorId'))
  const direction = (formData.get('direction') ?? '').toString()

  if (!stepId || !humorFlavorId || !['up', 'down'].includes(direction)) {
    fail(humorFlavorId || '0', 'Invalid reorder request')
  }

  const { data: steps, error: stepsError } = await supabase
    .from('humor_flavor_steps')
    .select('id,order_by')
    .eq('humor_flavor_id', humorFlavorId)
    .order('order_by', { ascending: true })
    .order('id', { ascending: true })

  if (stepsError) fail(humorFlavorId, stepsError.message || 'Failed to load steps for reorder')

  const list = steps || []
  const index = list.findIndex((s) => s.id === stepId)
  if (index < 0) fail(humorFlavorId, 'Step not found')

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= list.length) {
    redirect(`${stepsPath(humorFlavorId)}?status=success`)
  }

  const current = list[index]
  const target = list[targetIndex]

  const { error: firstError } = await supabase
    .from('humor_flavor_steps')
    .update({ order_by: -9999 })
    .eq('id', current.id)
    .eq('humor_flavor_id', humorFlavorId)

  if (firstError) fail(humorFlavorId, firstError.message || 'Failed to reorder step')

  const { error: secondError } = await supabase
    .from('humor_flavor_steps')
    .update({ order_by: current.order_by })
    .eq('id', target.id)
    .eq('humor_flavor_id', humorFlavorId)

  if (secondError) fail(humorFlavorId, secondError.message || 'Failed to reorder step')

  const { error: thirdError } = await supabase
    .from('humor_flavor_steps')
    .update({ order_by: target.order_by })
    .eq('id', current.id)
    .eq('humor_flavor_id', humorFlavorId)

  if (thirdError) fail(humorFlavorId, thirdError.message || 'Failed to reorder step')

  revalidateFlavorPages(humorFlavorId)
  redirect(`${stepsPath(humorFlavorId)}?status=success`)
}
