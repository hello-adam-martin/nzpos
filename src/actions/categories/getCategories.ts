'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getCategories() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  const storeId = user.app_metadata?.store_id
  if (!storeId) return { error: 'no_store' as const }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', storeId)
    .order('sort_order')

  if (error) return { error: 'server_error' as const }

  return { success: true, categories: data ?? [] }
}
