'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePromptChainAdmin } from '@/lib/admin/guard'

function fail(path, message) {
  redirect(`${path}?status=error&message=${encodeURIComponent(message)}`)
}

export async function createHumorFlavor(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const slug = (formData.get('slug') ?? '').toString().trim()
  const description = (formData.get('description') ?? '').toString().trim()

  if (!slug) fail('/tool/flavors', 'Slug is required')

  const { error } = await supabase.from('humor_flavors').insert({
    slug,
    description: description || null,
  })
  if (error) fail('/tool/flavors', error.message || 'Failed to create flavor')

  revalidatePath('/tool')
  revalidatePath('/tool/flavors')
  revalidatePath('/tool/test')
  redirect('/tool/flavors?status=success')
}

export async function updateHumorFlavor(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const id = Number(formData.get('id'))
  const slug = (formData.get('slug') ?? '').toString().trim()
  const description = (formData.get('description') ?? '').toString().trim()

  if (!id) fail('/tool/flavors', 'Flavor id is required')
  if (!slug) fail('/tool/flavors', 'Slug is required')

  const { error } = await supabase
    .from('humor_flavors')
    .update({ slug, description: description || null })
    .eq('id', id)

  if (error) fail('/tool/flavors', error.message || 'Failed to update flavor')

  revalidatePath('/tool')
  revalidatePath('/tool/flavors')
  revalidatePath(`/tool/flavors/${id}/steps`)
  revalidatePath('/tool/test')
  redirect('/tool/flavors?status=success')
}

export async function deleteHumorFlavor(formData) {
  const { supabase } = await requirePromptChainAdmin()
  const id = Number(formData.get('id'))

  if (!id) fail('/tool/flavors', 'Flavor id is required')

  const { error } = await supabase.from('humor_flavors').delete().eq('id', id)
  if (error) fail('/tool/flavors', error.message || 'Failed to delete flavor')

  revalidatePath('/tool')
  revalidatePath('/tool/flavors')
  revalidatePath('/tool/test')
  redirect('/tool/flavors?status=success')
}
