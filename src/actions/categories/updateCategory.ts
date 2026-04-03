'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { UpdateCategorySchema } from '@/schemas/category'
import { revalidatePath } from 'next/cache'

export async function updateCategory(input: { id: string; name: string }) {
  const parsed = UpdateCategorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('categories')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
