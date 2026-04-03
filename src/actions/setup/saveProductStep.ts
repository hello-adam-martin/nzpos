'use server'
import 'server-only'
import { z } from 'zod'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const SaveProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  priceCents: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
})

export async function saveProductStep(input: {
  name?: string
  priceCents?: number
  categoryId?: string
  imageUrl?: string
}): Promise<{ success: true } | { error: string }> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const parsed = SaveProductSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()

  // If name provided, create the product
  if (parsed.data.name) {
    const { error: insertError } = await supabase.from('products').insert({
      name: parsed.data.name,
      price_cents: parsed.data.priceCents ?? 0,
      category_id: parsed.data.categoryId ?? null,
      image_url: parsed.data.imageUrl ?? null,
      store_id: auth.store_id,
      is_active: true,
      stock_quantity: 0,
    })

    if (insertError) {
      return { error: insertError.message }
    }
  }

  // Read current setup_completed_steps to OR with bit 2
  const { data: current } = await supabase
    .from('stores')
    .select('setup_completed_steps')
    .eq('id', auth.store_id)
    .single()

  const currentSteps = current?.setup_completed_steps ?? 0
  const newSteps = currentSteps | 4 // set bit 2

  const { error: dbError } = await supabase
    .from('stores')
    .update({ setup_completed_steps: newSteps })
    .eq('id', auth.store_id)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
}
