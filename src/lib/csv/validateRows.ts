import { parsePriceToCents } from '@/lib/money'

export type ColumnMapping = Partial<Record<
  'name' | 'sku' | 'barcode' | 'price' | 'category' | 'stock_quantity' | 'reorder_threshold',
  string
>>

export interface ProductInsert {
  name: string
  sku?: string
  barcode?: string
  price_cents: number
  stock_quantity?: number
  reorder_threshold?: number
  category_name?: string
  category_id?: string
}

export interface ValidatedRow {
  rowIndex: number
  status: 'new' | 'duplicate' | 'invalid'
  data: Record<string, string>
  productData?: ProductInsert
  errors: string[]
}

export function validateImportRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingSKUs: Set<string>,
  existingCategories: Map<string, string>
): ValidatedRow[] {
  return rows.map((row, index) => {
    const rowIndex = index + 1
    const errors: string[] = []

    // Extract fields using mapping
    const name = mapping.name ? (row[mapping.name] ?? '').trim() : ''
    const sku = mapping.sku ? (row[mapping.sku] ?? '').trim() : undefined
    const barcode = mapping.barcode ? (row[mapping.barcode] ?? '').trim() : undefined
    const priceRaw = mapping.price ? (row[mapping.price] ?? '').trim() : ''
    const categoryRaw = mapping.category ? (row[mapping.category] ?? '').trim() : undefined
    const stockRaw = mapping.stock_quantity ? (row[mapping.stock_quantity] ?? '').trim() : undefined
    const reorderRaw = mapping.reorder_threshold ? (row[mapping.reorder_threshold] ?? '').trim() : undefined

    // Validate name
    if (!name) {
      errors.push('name is required')
    }

    // Validate price
    let price_cents: number | null = null
    if (mapping.price) {
      price_cents = parsePriceToCents(priceRaw)
      if (price_cents === null) {
        errors.push('Enter a valid price (e.g. 8.99).')
      }
    } else {
      errors.push('Enter a valid price (e.g. 8.99).')
    }

    // Parse stock_quantity
    let stock_quantity: number | undefined
    if (stockRaw !== undefined && stockRaw !== '') {
      const parsed = parseInt(stockRaw, 10)
      stock_quantity = isNaN(parsed) ? 0 : Math.max(0, parsed)
    }

    // Parse reorder_threshold
    let reorder_threshold: number | undefined
    if (reorderRaw !== undefined && reorderRaw !== '') {
      const parsed = parseInt(reorderRaw, 10)
      reorder_threshold = isNaN(parsed) ? 0 : Math.max(0, parsed)
    }

    // If any validation errors, return invalid
    if (errors.length > 0) {
      return { rowIndex, status: 'invalid', data: row, errors }
    }

    // Check for duplicate SKU
    if (sku && existingSKUs.has(sku)) {
      return {
        rowIndex,
        status: 'duplicate',
        data: row,
        productData: {
          name,
          sku,
          barcode: barcode || undefined,
          price_cents: price_cents!,
          stock_quantity,
          reorder_threshold,
          category_name: categoryRaw || undefined,
        },
        errors: [],
      }
    }

    // Resolve category
    let category_id: string | undefined
    let category_name: string | undefined
    if (categoryRaw) {
      const existingId = existingCategories.get(categoryRaw.toLowerCase())
      if (existingId) {
        category_id = existingId
      } else {
        // Category doesn't exist yet — Server Action will auto-create it
        category_name = categoryRaw
      }
    }

    return {
      rowIndex,
      status: 'new',
      data: row,
      productData: {
        name,
        sku: sku || undefined,
        barcode: barcode || undefined,
        price_cents: price_cents!,
        stock_quantity,
        reorder_threshold,
        category_name,
        category_id,
      },
      errors: [],
    }
  })
}
