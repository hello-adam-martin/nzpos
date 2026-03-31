'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CreateCategorySchema } from '@/schemas/category'
import { revalidatePath } from 'next/cache'

export async function createCategory(input: { name: string }) {
  const parsed = CreateCategorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()

  // Get current user for store_id from JWT app_metadata
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: { _form: ['Not authenticated'] } }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: { _form: ['Store not found'] } }

  // Calculate next sort_order (max existing + 1)
  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = maxRow ? maxRow.sort_order + 1 : 0

  const { data: category, error: insertError } = await supabase
    .from('categories')
    .insert({
      store_id: storeId,
      name: parsed.data.name,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (insertError || !category) {
    return { error: { _form: [insertError?.message ?? 'Failed to create category'] } }
  }

  revalidatePath('/admin/products')
  return { success: true, category }
}
