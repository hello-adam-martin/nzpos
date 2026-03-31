'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function deactivateProduct(id: string) {
  // Validate id is a UUID
  const idParsed = z.string().uuid().safeParse(id)
  if (!idParsed.success) {
    return { error: { _form: ['Invalid product ID'] } }
  }

  const supabase = await createSupabaseServerClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: { _form: ['Not authenticated'] } }
  }

  const { error: dbError } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', idParsed.data)

  if (dbError) {
    return { error: { _form: [dbError.message] } }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
