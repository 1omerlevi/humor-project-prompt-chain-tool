import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requirePromptChainAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,is_superadmin,is_matrix_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (error) redirect('/login?error=profile_query')
  if (!profile) redirect('/login?error=profile_missing')

  const allowed = Boolean(profile.is_superadmin || profile.is_matrix_admin)
  if (!allowed) redirect('/login?error=forbidden')

  return { supabase, user, profile }
}
