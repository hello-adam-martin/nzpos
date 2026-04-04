'use server'
import 'server-only'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const CHUNK_SIZE = 100

// ---------------------------------------------------------------------------
// Zod schema — SEC-08 / F-6.2: runtime validation before any DB access
// ---------------------------------------------------------------------------

const ImportRowSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  price_cents: z.number().int().min(0),
  product_type: z.enum(['physical', 'service']).default('physical'), // D-09: default physical
  stock_quantity: z.number().int().min(0).optional(),
  reorder_threshold: z.number().int().min(0).optional(),
  category_name: z.string().max(100).optional(),
  category_id: z.string().uuid().optional(),
})

export type ImportRow = z.infer<typeof ImportRowSchema>

export interface ImportResult {
  success: true
  imported: number
  errors: Array<{ row: number; message: string }>
}

export async function importProducts(
  rows: unknown
): Promise<ImportResult | { error: string }> {
  // Per-row validation for D-11: reject invalid product_type per row, not per chunk
  const inputRows = rows as any[]
  if (!Array.isArray(inputRows) || inputRows.length === 0 || inputRows.length > 1000) {
    return { error: 'Invalid import data. Provide 1–1000 rows.' }
  }

  const validatedRows: z.infer<typeof ImportRowSchema>[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < inputRows.length; i++) {
    const result = ImportRowSchema.safeParse(inputRows[i])
    if (result.success) {
      validatedRows.push(result.data)
    } else {
      const fieldErrors = result.error.flatten().fieldErrors
      const msg = fieldErrors.product_type
        ? "Invalid product type \u2014 must be 'physical' or 'service'. Row skipped."
        : `Invalid data: ${result.error.issues.map(i => i.message).join(', ')}. Row skipped.`
      errors.push({ row: i + 1, message: msg })
    }
  }

  if (validatedRows.length === 0) {
    return { error: 'No valid rows to import.' }
  }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'Store not found' }

  // D-10: Auto-create categories that don't exist yet
  // Collect unique category names needing creation (those with category_name but no category_id)
  const categoryNamesNeeded = new Set<string>()
  for (const row of validatedRows) {
    if (row.category_name && !row.category_id) {
      categoryNamesNeeded.add(row.category_name)
    }
  }

  // Build name -> id mapping for auto-created categories
  const categoryIdByName = new Map<string, string>()

  if (categoryNamesNeeded.size > 0) {
    // Fetch existing categories for this store (case-insensitive lookup)
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId)

    if (existingCategories) {
      for (const cat of existingCategories) {
        categoryIdByName.set(cat.name.toLowerCase(), cat.id)
      }
    }

    // Get max sort_order for sequential assignment
    const { data: maxSortRow } = await supabase
      .from('categories')
      .select('sort_order')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    let nextSortOrder = maxSortRow ? maxSortRow.sort_order + 1 : 0

    // Insert categories that don't already exist
    for (const categoryName of categoryNamesNeeded) {
      if (categoryIdByName.has(categoryName.toLowerCase())) continue

      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert({
          store_id: storeId,
          name: categoryName,
          sort_order: nextSortOrder,
        })
        .select('id, name')
        .single()

      if (!catError && newCat) {
        categoryIdByName.set(categoryName.toLowerCase(), newCat.id)
        nextSortOrder++
      }
    }
  }

  // Prepare insert rows: resolve category_id for auto-created categories
  const insertRows = validatedRows.map((row) => {
    let category_id = row.category_id
    if (!category_id && row.category_name) {
      category_id = categoryIdByName.get(row.category_name.toLowerCase())
    }

    const isService = row.product_type === 'service'
    return {
      store_id: storeId,
      name: row.name,
      sku: row.sku ?? null,
      barcode: row.barcode ?? null,
      price_cents: row.price_cents,
      product_type: row.product_type,
      stock_quantity: isService ? 0 : (row.stock_quantity ?? 0),       // D-10
      reorder_threshold: isService ? 0 : (row.reorder_threshold ?? 0), // D-10
      category_id: category_id ?? null,
      is_active: true,
    }
  })

  // Batch insert in chunks of CHUNK_SIZE
  let totalImported = 0

  for (let i = 0; i < insertRows.length; i += CHUNK_SIZE) {
    const chunk = insertRows.slice(i, i + CHUNK_SIZE)
    const { data, error: insertError } = await supabase
      .from('products')
      .insert(chunk)
      .select('id')

    if (insertError) {
      // Record generic error per row — do not expose raw DB error to client
      console.error(`[importProducts] DB error on chunk starting at row ${i + 1}:`, insertError)
      for (let j = 0; j < chunk.length; j++) {
        errors.push({
          row: i + j + 1,
          message: 'Failed to import row',
        })
      }
    } else {
      totalImported += data?.length ?? chunk.length
    }
  }

  revalidatePath('/admin/products')

  return {
    success: true,
    imported: totalImported,
    errors,
  }
}
