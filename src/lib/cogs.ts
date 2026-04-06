/**
 * COGS (Cost of Goods Sold) calculation library.
 *
 * All functions are pure — no side effects, no I/O.
 * Plan 03 (reports UI) imports these functions for rendering.
 *
 * Monetary values are always integer cents.
 * GST is 15% tax-inclusive. Revenue is always GST-exclusive.
 */

// ─── Input Types ─────────────────────────────────────────────────────────────

/** Matches the Supabase query shape for order_items joined with orders */
export interface OrderItem {
  product_id: string | null
  product_name: string
  quantity: number
  line_total_cents: number
  gst_cents: number
}

/** Matches the Supabase query shape for products with optional category join */
export interface ProductCostData {
  id: string
  cost_price_cents: number | null
  category_id: string | null
  categories: { name: string } | null
}

// ─── Output Types ────────────────────────────────────────────────────────────

export interface CogsLineItem {
  productId: string | null
  productName: string
  sku: string | null
  categoryName: string | null
  unitsSold: number
  revenueExclGstCents: number
  costCents: number
  hasCostPrice: boolean
  marginCents: number | null
  marginPercent: number | null
}

export interface CogsCategoryGroup {
  categoryName: string
  products: CogsLineItem[]
  totalUnitsSold: number
  totalRevenueExclGstCents: number
  totalCostCents: number
  totalMarginCents: number | null
  marginPercent: number | null
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Aggregates order items with product cost data into COGS line items.
 *
 * - Items with the same product_id are merged (quantities, revenue, cost summed).
 * - Items with null product_id are grouped by product_name instead.
 * - Products without cost price data have hasCostPrice=false and null margins.
 * - Results are sorted by revenueExclGstCents descending.
 */
export function aggregateCOGS(
  items: OrderItem[],
  productCosts: ProductCostData[],
): CogsLineItem[] {
  // Build lookup map: product_id -> cost data
  const costMap = new Map<string, ProductCostData>()
  for (const cost of productCosts) {
    costMap.set(cost.id, cost)
  }

  // Accumulator keyed by product_id or product_name (for null ids)
  interface Accumulator {
    productId: string | null
    productName: string
    unitsSold: number
    revenueExclGstCents: number
    costCents: number
    hasCostPrice: boolean
    categoryName: string | null
  }

  const accMap = new Map<string, Accumulator>()

  for (const item of items) {
    const key = item.product_id ?? item.product_name
    const costData = item.product_id != null ? costMap.get(item.product_id) : undefined
    const hasCostPrice = costData?.cost_price_cents != null

    if (accMap.has(key)) {
      const acc = accMap.get(key)!
      acc.unitsSold += item.quantity
      acc.revenueExclGstCents += item.line_total_cents - item.gst_cents
      if (hasCostPrice) {
        acc.costCents += (costData!.cost_price_cents as number) * item.quantity
      }
    } else {
      const revenueExclGst = item.line_total_cents - item.gst_cents
      const costCents = hasCostPrice
        ? (costData!.cost_price_cents as number) * item.quantity
        : 0
      const categoryName = costData?.categories?.name ?? null

      accMap.set(key, {
        productId: item.product_id,
        productName: item.product_name,
        unitsSold: item.quantity,
        revenueExclGstCents: revenueExclGst,
        costCents,
        hasCostPrice,
        categoryName,
      })
    }
  }

  // Convert accumulators to CogsLineItem[]
  const result: CogsLineItem[] = []
  for (const acc of accMap.values()) {
    const marginCents = acc.hasCostPrice
      ? acc.revenueExclGstCents - acc.costCents
      : null
    const marginPercent =
      acc.hasCostPrice && acc.revenueExclGstCents > 0
        ? calculateMarginPercent(acc.revenueExclGstCents, acc.costCents)
        : null

    result.push({
      productId: acc.productId,
      productName: acc.productName,
      sku: null, // SKU not available from OrderItem — callers can hydrate if needed
      categoryName: acc.categoryName,
      unitsSold: acc.unitsSold,
      revenueExclGstCents: acc.revenueExclGstCents,
      costCents: acc.costCents,
      hasCostPrice: acc.hasCostPrice,
      marginCents,
      marginPercent,
    })
  }

  // Sort by revenueExclGstCents descending
  result.sort((a, b) => b.revenueExclGstCents - a.revenueExclGstCents)

  return result
}

/**
 * Calculates gross margin percentage.
 *
 * Formula: ((revenue - cost) / revenue) * 100
 *
 * Returns null when revenue is zero or negative to avoid division by zero.
 */
export function calculateMarginPercent(
  revenueExclGstCents: number,
  totalCostCents: number,
): number | null {
  if (revenueExclGstCents <= 0) return null
  return ((revenueExclGstCents - totalCostCents) / revenueExclGstCents) * 100
}

/**
 * Calculates the gross margin percentage for a single product given its
 * GST-inclusive selling price and cost price (both in cents).
 *
 * The sell price is converted to GST-exclusive (÷ 1.15) before calculation.
 */
export function productMarginPercent(
  priceCents: number,
  costPriceCents: number,
): number {
  const sellExclGst = priceCents / 1.15
  return ((sellExclGst - costPriceCents) / sellExclGst) * 100
}

/**
 * Groups COGS line items by category and aggregates totals per category.
 *
 * - Items with null categoryName are grouped under "Uncategorized".
 * - totalMarginCents is null if NO product in the category has a cost price.
 * - Categories are sorted alphabetically by name.
 */
export function groupByCategory(items: CogsLineItem[]): CogsCategoryGroup[] {
  const groupMap = new Map<
    string,
    {
      products: CogsLineItem[]
      totalUnitsSold: number
      totalRevenueExclGstCents: number
      totalCostCents: number
      hasAnyCostPrice: boolean
      totalMarginCents: number
    }
  >()

  for (const item of items) {
    const key = item.categoryName ?? 'Uncategorized'

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        products: [],
        totalUnitsSold: 0,
        totalRevenueExclGstCents: 0,
        totalCostCents: 0,
        hasAnyCostPrice: false,
        totalMarginCents: 0,
      })
    }

    const group = groupMap.get(key)!
    group.products.push(item)
    group.totalUnitsSold += item.unitsSold
    group.totalRevenueExclGstCents += item.revenueExclGstCents
    group.totalCostCents += item.costCents

    if (item.hasCostPrice) {
      group.hasAnyCostPrice = true
      group.totalMarginCents += item.marginCents ?? 0
    }
  }

  const result: CogsCategoryGroup[] = []
  for (const [categoryName, group] of groupMap.entries()) {
    const totalMarginCents = group.hasAnyCostPrice ? group.totalMarginCents : null
    const marginPercent =
      totalMarginCents !== null && group.totalRevenueExclGstCents > 0
        ? calculateMarginPercent(group.totalRevenueExclGstCents, group.totalCostCents)
        : null

    result.push({
      categoryName,
      products: group.products,
      totalUnitsSold: group.totalUnitsSold,
      totalRevenueExclGstCents: group.totalRevenueExclGstCents,
      totalCostCents: group.totalCostCents,
      totalMarginCents,
      marginPercent,
    })
  }

  // Sort alphabetically by category name
  result.sort((a, b) => a.categoryName.localeCompare(b.categoryName))

  return result
}

/**
 * Formats COGS line items for CSV export.
 *
 * Returns one row per product with all standard columns.
 * - Null margin_percent shows "—" (em dash)
 * - Null sku shows empty string
 * - Null margin_cents shows 0
 */
export function formatCogsCSV(
  items: CogsLineItem[],
): Array<Record<string, string | number>> {
  return items.map((item) => ({
    product_name: item.productName,
    sku: item.sku ?? '',
    category: item.categoryName ?? '',
    units_sold: item.unitsSold,
    revenue_excl_gst_cents: item.revenueExclGstCents,
    cost_cents: item.costCents,
    margin_cents: item.marginCents ?? 0,
    margin_percent:
      item.marginPercent !== null
        ? item.marginPercent.toFixed(1) + '%'
        : '—',
  }))
}
