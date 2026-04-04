'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CreateProductSchema } from '@/schemas/product'
import { parsePriceToCents } from '@/lib/money'

export async function createProduct(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  // Verify auth and extract store_id from JWT app_metadata
  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { error: { _form: ['Not authenticated'] } }
  }

  // Extract and coerce form fields
  const priceDollars = formData.get('price_dollars') as string | null
  const rawPriceCents = formData.get('price_cents')

  let priceCents: number
  if (priceDollars !== null) {
    const parsed = parsePriceToCents(priceDollars)
    if (parsed === null) {
      return { error: { price_cents: ['Invalid price format'] } }
    }
    priceCents = parsed
  } else {
    priceCents = Number(rawPriceCents)
  }

  const categoryId = formData.get('category_id') as string | null
  const stockQuantity = formData.get('stock_quantity')
  const reorderThreshold = formData.get('reorder_threshold')
  const imageUrl = formData.get('image_url') as string | null
  const productType = formData.get('product_type') as string | null

  const raw = {
    name: formData.get('name') as string,
    sku: formData.get('sku') as string | undefined || undefined,
    barcode: formData.get('barcode') as string | undefined || undefined,
    price_cents: priceCents,
    category_id: categoryId || undefined,
    product_type: productType || undefined,
    stock_quantity: stockQuantity ? Number(stockQuantity) : undefined,
    reorder_threshold: reorderThreshold ? Number(reorderThreshold) : undefined,
    image_url: imageUrl || undefined,
  }

  const parsed = CreateProductSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Only include product_type in insert if explicitly provided by the form.
  // When omitted, the DB column default ('physical') applies.
  // This avoids PGRST204 if PostgREST schema cache hasn't refreshed yet.
  const insertData: Record<string, unknown> = { ...parsed.data, store_id: storeId }
  if (!productType) {
    delete insertData.product_type
  }

  const { error: dbError } = await supabase
    .from('products')
    .insert(insertData)

  if (dbError) {
    // Unique constraint violation on SKU (PostgreSQL error code 23505)
    if (dbError.code === '23505' && dbError.message.includes('sku')) {
      return { error: { sku: ['This SKU is already in use.'] } }
    }
    console.error('[createProduct] DB error:', dbError)
    return { error: { _form: ['Failed to create product'] } }
  }

  revalidatePath('/admin/products')
  return { success: true }
}
