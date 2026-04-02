import { describe, it, expect, vi } from 'vitest'
import { render } from '@react-email/render'
import React from 'react'
import type { ReceiptData } from '@/lib/receipt'

// Mock server-only to no-op so imports don't throw in test environment
vi.mock('server-only', () => ({}))

// Import email templates
import { OnlineReceiptEmail } from '@/emails/OnlineReceiptEmail'
import { PosReceiptEmail } from '@/emails/PosReceiptEmail'
import { PickupReadyEmail } from '@/emails/PickupReadyEmail'
import { DailySummaryEmail } from '@/emails/DailySummaryEmail'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const testReceipt: ReceiptData = {
  orderId: 'ord-abc123-test-uuid',
  storeName: "Adam's Supplies NZ",
  storeAddress: '123 Main St, Wellington 6011',
  storePhone: '04 123 4567',
  gstNumber: '123-456-789',
  completedAt: '2026-04-01T10:30:00.000Z',
  staffName: 'Alex',
  items: [
    {
      productId: 'prod-1',
      productName: 'Safety Gloves',
      quantity: 2,
      unitPriceCents: 1500,
      discountCents: 0,
      lineTotalCents: 3000,
      gstCents: 391,
    },
    {
      productId: 'prod-2',
      productName: 'High-Vis Vest',
      quantity: 1,
      unitPriceCents: 4999,
      discountCents: 500,
      lineTotalCents: 4499,
      gstCents: 587,
    },
    {
      productId: 'prod-3',
      productName: 'Work Boots',
      quantity: 1,
      unitPriceCents: 12000,
      discountCents: 0,
      lineTotalCents: 12000,
      gstCents: 1565,
    },
  ],
  subtotalCents: 17108,
  gstCents: 2230,
  totalCents: 17108,
  paymentMethod: 'eftpos',
}

// ---------------------------------------------------------------------------
// OnlineReceiptEmail
// ---------------------------------------------------------------------------

describe('OnlineReceiptEmail', () => {
  it('renders HTML containing "Thanks for your order"', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    expect(html).toContain('Thanks for your order')
  })

  it('renders the store name', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    // Apostrophes are HTML-encoded in rendered email output
    expect(html).toContain("Adam&#x27;s Supplies NZ")
  })

  it('renders each item name', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    expect(html).toContain('Safety Gloves')
    expect(html).toContain('High-Vis Vest')
    expect(html).toContain('Work Boots')
  })

  it('renders GST amount', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    expect(html).toContain('GST (15%)')
  })

  it('renders total amount', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    expect(html).toContain('Total')
    expect(html).toContain('$171.08')
  })

  it('renders payment method', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    expect(html).toContain('EFTPOS')
  })

  it('renders discount row for discounted items', async () => {
    const html = await render(React.createElement(OnlineReceiptEmail, { receipt: testReceipt }))
    // High-Vis Vest has discountCents = 500
    expect(html).toContain('Discount')
  })
})

// ---------------------------------------------------------------------------
// PosReceiptEmail
// ---------------------------------------------------------------------------

describe('PosReceiptEmail', () => {
  it('renders HTML containing "Here\'s your receipt"', async () => {
    const html = await render(React.createElement(PosReceiptEmail, { receipt: testReceipt }))
    // Apostrophes are HTML-encoded in rendered email output
    expect(html).toContain("Here&#x27;s your receipt")
  })

  it('renders the store name', async () => {
    const html = await render(React.createElement(PosReceiptEmail, { receipt: testReceipt }))
    // Apostrophes are HTML-encoded in rendered email output
    expect(html).toContain("Adam&#x27;s Supplies NZ")
  })

  it('renders item names and payment method', async () => {
    const html = await render(React.createElement(PosReceiptEmail, { receipt: testReceipt }))
    expect(html).toContain('Safety Gloves')
    expect(html).toContain('EFTPOS')
  })
})

// ---------------------------------------------------------------------------
// PickupReadyEmail
// ---------------------------------------------------------------------------

describe('PickupReadyEmail', () => {
  const pickupProps = {
    orderItems: [
      { productName: 'Safety Gloves', quantity: 2 },
      { productName: 'High-Vis Vest', quantity: 1 },
    ],
    storeName: "Adam's Supplies NZ",
    storeAddress: '123 Main St, Wellington 6011',
    storePhone: '04 123 4567',
    openingHours: 'Mon–Fri 8am–6pm, Sat 9am–4pm',
    orderNumber: 'ORD-ABC123',
  }

  it('renders "Your order is ready"', async () => {
    const html = await render(React.createElement(PickupReadyEmail, pickupProps))
    expect(html).toContain('Your order is ready')
  })

  it('renders "Ready for pickup" status pill', async () => {
    const html = await render(React.createElement(PickupReadyEmail, pickupProps))
    expect(html).toContain('Ready for pickup')
  })

  it('renders store address', async () => {
    const html = await render(React.createElement(PickupReadyEmail, pickupProps))
    expect(html).toContain('123 Main St, Wellington 6011')
  })

  it('renders store phone', async () => {
    const html = await render(React.createElement(PickupReadyEmail, pickupProps))
    expect(html).toContain('04 123 4567')
  })

  it('renders opening hours', async () => {
    const html = await render(React.createElement(PickupReadyEmail, pickupProps))
    expect(html).toContain('Mon–Fri 8am–6pm, Sat 9am–4pm')
  })

  it('renders item names (no prices)', async () => {
    const html = await render(React.createElement(PickupReadyEmail, pickupProps))
    expect(html).toContain('Safety Gloves')
    expect(html).toContain('High-Vis Vest')
  })
})

// ---------------------------------------------------------------------------
// DailySummaryEmail
// ---------------------------------------------------------------------------

const baseDailyProps = {
  storeName: "Adam's Supplies NZ",
  storeAddress: '123 Main St, Wellington 6011',
  storePhone: '04 123 4567',
  date: '1 April 2026',
  totalSales: 15,
  totalRevenueCents: 185000,
  totalGstCents: 24130,
  revenueByMethod: [
    { method: 'EFTPOS', amountCents: 120000 },
    { method: 'Cash', amountCents: 40000 },
    { method: 'Online', amountCents: 25000 },
  ],
  topProducts: [
    { rank: 1, name: 'Safety Gloves', quantity: 12, revenueCents: 36000 },
    { rank: 2, name: 'High-Vis Vest', quantity: 8, revenueCents: 40000 },
    { rank: 3, name: 'Work Boots', quantity: 5, revenueCents: 60000 },
  ],
  lowStockItems: [],
}

describe('DailySummaryEmail with sales', () => {
  it('renders "Yesterday at a glance"', async () => {
    const html = await render(React.createElement(DailySummaryEmail, baseDailyProps))
    expect(html).toContain('Yesterday at a glance')
  })

  it('renders the date', async () => {
    const html = await render(React.createElement(DailySummaryEmail, baseDailyProps))
    expect(html).toContain('1 April 2026')
  })

  it('renders revenue amounts', async () => {
    const html = await render(React.createElement(DailySummaryEmail, baseDailyProps))
    expect(html).toContain('$1,850.00') // totalRevenueCents = 185000
    expect(html).toContain('$241.30')   // totalGstCents = 24130
  })

  it('renders top product names', async () => {
    const html = await render(React.createElement(DailySummaryEmail, baseDailyProps))
    expect(html).toContain('Safety Gloves')
    expect(html).toContain('High-Vis Vest')
    expect(html).toContain('Work Boots')
  })

  it('does NOT contain "No sales yesterday" when there are sales', async () => {
    const html = await render(React.createElement(DailySummaryEmail, baseDailyProps))
    expect(html).not.toContain('No sales yesterday')
  })
})

describe('DailySummaryEmail with zero sales', () => {
  const zeroSalesProps = {
    ...baseDailyProps,
    totalSales: 0,
    totalRevenueCents: 0,
    totalGstCents: 0,
    revenueByMethod: [],
    topProducts: [],
  }

  it('renders "No sales yesterday. The system is working."', async () => {
    const html = await render(React.createElement(DailySummaryEmail, zeroSalesProps))
    expect(html).toContain('No sales yesterday. The system is working.')
  })
})

describe('DailySummaryEmail with low stock', () => {
  const lowStockProps = {
    ...baseDailyProps,
    lowStockItems: [
      { name: 'Safety Gloves', currentStock: 3, reorderThreshold: 10 },
      { name: 'Work Boots', currentStock: 1, reorderThreshold: 5 },
    ],
  }

  it('renders "Low stock" section with product names', async () => {
    const html = await render(React.createElement(DailySummaryEmail, lowStockProps))
    expect(html).toContain('Low stock')
    expect(html).toContain('Safety Gloves')
    expect(html).toContain('Work Boots')
  })

  it('renders current stock and reorder thresholds', async () => {
    const html = await render(React.createElement(DailySummaryEmail, lowStockProps))
    expect(html).toContain('3') // currentStock for Safety Gloves
    expect(html).toContain('10') // reorderThreshold for Safety Gloves
  })
})

describe('DailySummaryEmail without low stock', () => {
  it('does NOT render "Low stock" section when lowStockItems is empty', async () => {
    const html = await render(React.createElement(DailySummaryEmail, baseDailyProps))
    // lowStockItems = [] so section should not be rendered
    expect(html).not.toContain('Low stock')
  })
})
