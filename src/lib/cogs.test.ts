import { describe, it, expect } from 'vitest'
import {
  aggregateCOGS,
  calculateMarginPercent,
  productMarginPercent,
  groupByCategory,
  formatCogsCSV,
} from './cogs'
import type { OrderItem, ProductCostData } from './cogs'

// ─── aggregateCOGS ───────────────────────────────────────────────────────────

describe('aggregateCOGS', () => {
  it('Test 1: single item with cost price returns correct revenue excl GST, cost, margin, margin%', () => {
    const items: OrderItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget',
        quantity: 2,
        line_total_cents: 2300,
        gst_cents: 300,
      },
    ]
    const productCosts: ProductCostData[] = [
      {
        id: 'p1',
        cost_price_cents: 800,
        category_id: null,
        categories: null,
      },
    ]
    const result = aggregateCOGS(items, productCosts)
    expect(result).toHaveLength(1)
    const item = result[0]
    expect(item.revenueExclGstCents).toBe(2000)
    expect(item.costCents).toBe(1600)
    expect(item.marginCents).toBe(400)
    expect(item.marginPercent).toBeCloseTo(20.0, 5)
    expect(item.hasCostPrice).toBe(true)
  })

  it('Test 2: item with NULL cost_price_cents has hasCostPrice=false, marginCents=null, marginPercent=null', () => {
    const items: OrderItem[] = [
      {
        product_id: 'p2',
        product_name: 'Mystery Item',
        quantity: 1,
        line_total_cents: 1150,
        gst_cents: 150,
      },
    ]
    const productCosts: ProductCostData[] = [
      {
        id: 'p2',
        cost_price_cents: null,
        category_id: null,
        categories: null,
      },
    ]
    const result = aggregateCOGS(items, productCosts)
    expect(result).toHaveLength(1)
    const item = result[0]
    expect(item.hasCostPrice).toBe(false)
    expect(item.marginCents).toBeNull()
    expect(item.marginPercent).toBeNull()
  })

  it('Test 3: multiple items for same product_id are aggregated (summed quantities, revenue, cost)', () => {
    const items: OrderItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget',
        quantity: 1,
        line_total_cents: 1150,
        gst_cents: 150,
      },
      {
        product_id: 'p1',
        product_name: 'Widget',
        quantity: 2,
        line_total_cents: 2300,
        gst_cents: 300,
      },
    ]
    const productCosts: ProductCostData[] = [
      {
        id: 'p1',
        cost_price_cents: 500,
        category_id: null,
        categories: null,
      },
    ]
    const result = aggregateCOGS(items, productCosts)
    expect(result).toHaveLength(1)
    const item = result[0]
    expect(item.unitsSold).toBe(3)
    expect(item.revenueExclGstCents).toBe(3000)
    expect(item.costCents).toBe(1500)
  })

  it('Test 4: items with null product_id use product_name as grouping key', () => {
    const items: OrderItem[] = [
      {
        product_id: null,
        product_name: 'Custom Item',
        quantity: 1,
        line_total_cents: 575,
        gst_cents: 75,
      },
      {
        product_id: null,
        product_name: 'Custom Item',
        quantity: 1,
        line_total_cents: 575,
        gst_cents: 75,
      },
    ]
    const productCosts: ProductCostData[] = []
    const result = aggregateCOGS(items, productCosts)
    expect(result).toHaveLength(1)
    expect(result[0].unitsSold).toBe(2)
    expect(result[0].revenueExclGstCents).toBe(1000)
  })

  it('Test 5: results sorted by revenueExclGstCents descending', () => {
    const items: OrderItem[] = [
      {
        product_id: 'p1',
        product_name: 'Cheap',
        quantity: 1,
        line_total_cents: 230,
        gst_cents: 30,
      },
      {
        product_id: 'p2',
        product_name: 'Expensive',
        quantity: 1,
        line_total_cents: 2300,
        gst_cents: 300,
      },
    ]
    const productCosts: ProductCostData[] = []
    const result = aggregateCOGS(items, productCosts)
    expect(result[0].productId).toBe('p2')
    expect(result[1].productId).toBe('p1')
  })

  it('Test 6: empty items array returns empty array', () => {
    const result = aggregateCOGS([], [])
    expect(result).toHaveLength(0)
    expect(Array.isArray(result)).toBe(true)
  })
})

// ─── calculateMarginPercent ──────────────────────────────────────────────────

describe('calculateMarginPercent', () => {
  it('Test 7: normal case: (2000 - 1600) / 2000 * 100 = 20.0', () => {
    const result = calculateMarginPercent(2000, 1600)
    expect(result).toBeCloseTo(20.0, 5)
  })

  it('Test 8: zero revenue returns null', () => {
    expect(calculateMarginPercent(0, 500)).toBeNull()
  })

  it('Test 9: negative margin returns negative percentage', () => {
    // cost > revenue => negative margin
    const result = calculateMarginPercent(1000, 1200)
    expect(result).toBeCloseTo(-20.0, 5)
  })
})

// ─── productMarginPercent ────────────────────────────────────────────────────

describe('productMarginPercent', () => {
  it('Test 10: price_cents=1150, cost_price_cents=500 => sell excl GST = 1000, margin = 50.0%', () => {
    const result = productMarginPercent(1150, 500)
    expect(result).toBeCloseTo(50.0, 5)
  })

  it('Test 11: price_cents=1150, cost_price_cents=1000 => margin = 0.0%', () => {
    // sell excl GST = 1150/1.15 = 1000
    // margin = (1000 - 1000) / 1000 * 100 = 0.0
    const result = productMarginPercent(1150, 1000)
    expect(result).toBeCloseTo(0.0, 5)
  })
})

// ─── groupByCategory ─────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  it('Test 12: groups items by categoryName, aggregates totals per category', () => {
    const items = aggregateCOGS(
      [
        {
          product_id: 'p1',
          product_name: 'Widget A',
          quantity: 2,
          line_total_cents: 2300,
          gst_cents: 300,
        },
        {
          product_id: 'p2',
          product_name: 'Widget B',
          quantity: 1,
          line_total_cents: 1150,
          gst_cents: 150,
        },
      ],
      [
        {
          id: 'p1',
          cost_price_cents: 500,
          category_id: 'cat1',
          categories: { name: 'Widgets' },
        },
        {
          id: 'p2',
          cost_price_cents: 300,
          category_id: 'cat1',
          categories: { name: 'Widgets' },
        },
      ],
    )
    const groups = groupByCategory(items)
    expect(groups).toHaveLength(1)
    const widgets = groups[0]
    expect(widgets.categoryName).toBe('Widgets')
    expect(widgets.totalUnitsSold).toBe(3)
    expect(widgets.totalRevenueExclGstCents).toBe(3000)
    expect(widgets.totalCostCents).toBe(1300) // 500*2 + 300*1
    expect(widgets.totalMarginCents).toBe(1700)
  })

  it('Test 13: items with null categoryName grouped under "Uncategorized"', () => {
    const items = aggregateCOGS(
      [
        {
          product_id: 'p1',
          product_name: 'No Category',
          quantity: 1,
          line_total_cents: 1150,
          gst_cents: 150,
        },
      ],
      [
        {
          id: 'p1',
          cost_price_cents: 400,
          category_id: null,
          categories: null,
        },
      ],
    )
    const groups = groupByCategory(items)
    expect(groups).toHaveLength(1)
    expect(groups[0].categoryName).toBe('Uncategorized')
  })

  it('Test 14: category with all null-cost products has totalMarginCents=null', () => {
    const items = aggregateCOGS(
      [
        {
          product_id: 'p1',
          product_name: 'No Cost',
          quantity: 1,
          line_total_cents: 1150,
          gst_cents: 150,
        },
      ],
      [
        {
          id: 'p1',
          cost_price_cents: null,
          category_id: 'cat1',
          categories: { name: 'No Cost Category' },
        },
      ],
    )
    const groups = groupByCategory(items)
    expect(groups).toHaveLength(1)
    expect(groups[0].totalMarginCents).toBeNull()
  })
})

// ─── formatCogsCSV ───────────────────────────────────────────────────────────

describe('formatCogsCSV', () => {
  it('Test 15: returns array with all required column keys', () => {
    const items = aggregateCOGS(
      [
        {
          product_id: 'p1',
          product_name: 'Test Product',
          quantity: 1,
          line_total_cents: 1150,
          gst_cents: 150,
        },
      ],
      [
        {
          id: 'p1',
          cost_price_cents: 400,
          category_id: 'cat1',
          categories: { name: 'Test' },
        },
      ],
    )
    const csv = formatCogsCSV(items)
    expect(csv).toHaveLength(1)
    const row = csv[0]
    expect(row).toHaveProperty('product_name')
    expect(row).toHaveProperty('sku')
    expect(row).toHaveProperty('category')
    expect(row).toHaveProperty('units_sold')
    expect(row).toHaveProperty('revenue_excl_gst_cents')
    expect(row).toHaveProperty('cost_cents')
    expect(row).toHaveProperty('margin_cents')
    expect(row).toHaveProperty('margin_percent')
  })

  it('Test 16: null margin shows "—" for margin_percent', () => {
    const items = aggregateCOGS(
      [
        {
          product_id: 'p1',
          product_name: 'No Cost',
          quantity: 1,
          line_total_cents: 1150,
          gst_cents: 150,
        },
      ],
      [
        {
          id: 'p1',
          cost_price_cents: null,
          category_id: null,
          categories: null,
        },
      ],
    )
    const csv = formatCogsCSV(items)
    expect(csv[0].margin_percent).toBe('—')
  })

  it('Test 17: null sku shows empty string', () => {
    const items = aggregateCOGS(
      [
        {
          product_id: 'p1',
          product_name: 'No SKU',
          quantity: 1,
          line_total_cents: 1150,
          gst_cents: 150,
        },
      ],
      [
        {
          id: 'p1',
          cost_price_cents: 400,
          category_id: null,
          categories: null,
        },
      ],
    )
    const csv = formatCogsCSV(items)
    expect(csv[0].sku).toBe('')
  })
})
