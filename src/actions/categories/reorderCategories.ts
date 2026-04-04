'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ReorderCategoriesSchema } from '@/schemas/category'
import { revalidatePath } from 'next/cache'

export async function reorderCategories(input: {
  categories: Array<{ id: string; sort_order: number }>
}) {
  const parsed = ReorderCategoriesSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()

  // Update sort_order for each category (categories are small ~10, no batch needed)
  for (const { id, sort_order } of parsed.data.categories) {
    const { error } = await supabase
      .from('categories')
      .update({ sort_order })
      .eq('id', id)

    if (error) {
      console.error('[reorderCategories] Update error for id=%s:', id, error)
      return { error: { _form: ['Failed to reorder categories. Please try again.'] } }
    }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
