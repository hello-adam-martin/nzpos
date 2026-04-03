'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { UpdateProductSchema } from '@/schemas/product'
import { parsePriceToCents } from '@/lib/money'

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: { _form: ['Not authenticated'] } }
  }

  // Extract and coerce form fields — all optional for partial update
  const raw: Record<string, unknown> = {}

  const name = formData.get('name') as string | null
  if (name !== null && name !== '') raw.name = name

  const sku = formData.get('sku') as string | null
  if (sku !== null) raw.sku = sku || undefined

  const barcode = formData.get('barcode') as string | null
  if (barcode !== null) raw.barcode = barcode || undefined

  const priceDollars = formData.get('price_dollars') as string | null
  const rawPriceCents = formData.get('price_cents')
  if (priceDollars !== null) {
    const parsed = parsePriceToCents(priceDollars)
    if (parsed === null) {
      return { error: { price_cents: ['Invalid price format'] } }
    }
    raw.price_cents = parsed
  } else if (rawPriceCents !== null) {
    raw.price_cents = Number(rawPriceCents)
  }

  const categoryId = formData.get('category_id') as string | null
  if (categoryId !== null) raw.category_id = categoryId || undefined

  const stockQuantity = formData.get('stock_quantity')
  if (stockQuantity !== null && stockQuantity !== '') raw.stock_quantity = Number(stockQuantity)

  const reorderThreshold = formData.get('reorder_threshold')
  if (reorderThreshold !== null && reorderThreshold !== '') raw.reorder_threshold = Number(reorderThreshold)

  const imageUrl = formData.get('image_url') as string | null
  if (imageUrl !== null) raw.image_url = imageUrl || undefined

  const parsed = UpdateProductSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { error: dbError } = await supabase
    .from('products')
    .update(parsed.data)
    .eq('id', id)

  if (dbError) {
    // Unique constraint violation on SKU (PostgreSQL error code 23505)
    if (dbError.code === '23505' && dbError.message.includes('sku')) {
      return { error: { sku: ['This SKU is already in use.'] } }
    }
    console.error('[updateProduct] DB error:', dbError)
    return { error: { _form: ['Failed to update product'] } }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
