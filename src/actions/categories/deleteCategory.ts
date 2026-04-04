'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DeleteCategorySchema } from '@/schemas/category'
import { revalidatePath } from 'next/cache'

export async function deleteCategory(input: { id: string }) {
  const parsed = DeleteCategorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()

  // Guard: check if any products use this category
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', parsed.data.id)

  if (countError) {
    console.error('[deleteCategory] Count error:', countError)
    return { error: { _form: ['Could not check category products. Please try again.'] } }
  }

  if (count && count > 0) {
    return { error: { _form: ['Move or remove all products from this category first.'] } }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', parsed.data.id)

  if (error) {
    console.error('[deleteCategory] Delete error:', error)
    return { error: { _form: ['Failed to delete category. Please try again.'] } }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
