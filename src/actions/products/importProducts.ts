'use server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const CHUNK_SIZE = 100

export interface ImportRow {
  name: string
  sku?: string
  barcode?: string
  price_cents: number
  stock_quantity?: number
  reorder_threshold?: number
  category_name?: string
  category_id?: string
}

export interface ImportResult {
  success: true
  imported: number
  errors: Array<{ row: number; message: string }>
}

export async function importProducts(
  rows: ImportRow[]
): Promise<ImportResult | { error: string }> {
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
  for (const row of rows) {
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
  const insertRows = rows.map((row) => {
    let category_id = row.category_id
    if (!category_id && row.category_name) {
      category_id = categoryIdByName.get(row.category_name.toLowerCase())
    }

    return {
      store_id: storeId,
      name: row.name,
      sku: row.sku ?? null,
      barcode: row.barcode ?? null,
      price_cents: row.price_cents,
      stock_quantity: row.stock_quantity ?? 0,
      reorder_threshold: row.reorder_threshold ?? 0,
      category_id: category_id ?? null,
      is_active: true,
    }
  })

  // Batch insert in chunks of CHUNK_SIZE
  let totalImported = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < insertRows.length; i += CHUNK_SIZE) {
    const chunk = insertRows.slice(i, i + CHUNK_SIZE)
    const { data, error: insertError } = await supabase
      .from('products')
      .insert(chunk)
      .select('id')

    if (insertError) {
      // Record error for each row in the chunk
      for (let j = 0; j < chunk.length; j++) {
        errors.push({
          row: i + j + 1,
          message: insertError.message,
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
