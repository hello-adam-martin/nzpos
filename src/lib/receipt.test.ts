import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildReceiptData, type ReceiptData, type ReceiptLineItem } from './receipt'
import type { CartItem } from './cart'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockStore = {
  name: 'Test Supplies Store',
  address: '123 Main Street, Wellington 6011',
  phone: '04 555 1234',
  gst_number: '123-456-789',
}

const mockStoreNullFields = {
  name: 'Minimal Store',
  address: null,
  phone: null,
  gst_number: null,
}

const mockCartItems: CartItem[] = [
  {
    productId: 'prod-abc-123',
    productName: 'Widget A',
    unitPriceCents: 1000,
    quantity: 2,
    discountCents: 100,
    lineTotalCents: 1900,
    gstCents: 248, // 13% of 1900 (15/115 * 1900 ≈ 248)
  },
  {
    productId: 'prod-def-456',
    productName: 'Gadget B',
    unitPriceCents: 500,
    quantity: 1,
    discountCents: 0,
    lineTotalCents: 500,
    gstCents: 65,
  },
]

const mockTotals = {
  subtotalCents: 2400,
  gstCents: 313,
  totalCents: 2400,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildReceiptData', () => {
  const FIXED_DATE = '2026-04-02T10:00:00.000Z'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_DATE))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Test 1: returns object with all required fields', () => {
    const result = buildReceiptData({
      orderId: 'order-uuid-001',
      store: mockStore,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'eftpos',
    })

    expect(result).toMatchObject({
      orderId: 'order-uuid-001',
      storeName: 'Test Supplies Store',
      storeAddress: '123 Main Street, Wellington 6011',
      storePhone: '04 555 1234',
      gstNumber: '123-456-789',
      completedAt: FIXED_DATE,
      staffName: 'Jane Smith',
      subtotalCents: 2400,
      gstCents: 313,
      totalCents: 2400,
      paymentMethod: 'eftpos',
    })
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('Test 2: maps cart items to ReceiptLineItem[] with correct fields', () => {
    const result = buildReceiptData({
      orderId: 'order-uuid-002',
      store: mockStore,
      staffName: 'Bob Jones',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'cash',
      cashTenderedCents: 3000,
      changeDueCents: 600,
    })

    expect(result.items).toHaveLength(2)

    const firstItem: ReceiptLineItem = result.items[0]
    expect(firstItem.productId).toBe('prod-abc-123')
    expect(firstItem.productName).toBe('Widget A')
    expect(firstItem.quantity).toBe(2)
    expect(firstItem.unitPriceCents).toBe(1000)
    expect(firstItem.discountCents).toBe(100)
    expect(firstItem.lineTotalCents).toBe(1900)
    expect(firstItem.gstCents).toBe(248)

    const secondItem: ReceiptLineItem = result.items[1]
    expect(secondItem.productId).toBe('prod-def-456')
    expect(secondItem.productName).toBe('Gadget B')
    expect(secondItem.quantity).toBe(1)
    expect(secondItem.unitPriceCents).toBe(500)
    expect(secondItem.discountCents).toBe(0)
    expect(secondItem.lineTotalCents).toBe(500)
    expect(secondItem.gstCents).toBe(65)
  })

  it('Test 3: includes optional cash fields only when provided', () => {
    const withoutCash = buildReceiptData({
      orderId: 'order-uuid-003',
      store: mockStore,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'eftpos',
    })
    expect(withoutCash.cashTenderedCents).toBeUndefined()
    expect(withoutCash.changeDueCents).toBeUndefined()

    const withCash = buildReceiptData({
      orderId: 'order-uuid-004',
      store: mockStore,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'cash',
      cashTenderedCents: 3000,
      changeDueCents: 600,
    })
    expect(withCash.cashTenderedCents).toBe(3000)
    expect(withCash.changeDueCents).toBe(600)
  })

  it('Test 4: includes customerEmail only when provided', () => {
    const withoutEmail = buildReceiptData({
      orderId: 'order-uuid-005',
      store: mockStore,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'eftpos',
    })
    expect(withoutEmail.customerEmail).toBeUndefined()

    const withEmail = buildReceiptData({
      orderId: 'order-uuid-006',
      store: mockStore,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'eftpos',
      customerEmail: 'customer@example.com',
    })
    expect(withEmail.customerEmail).toBe('customer@example.com')
  })

  it('Test 5: ReceiptData serialises to JSON and deserialises without data loss (round-trip)', () => {
    const original = buildReceiptData({
      orderId: 'order-uuid-007',
      store: mockStore,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'cash',
      cashTenderedCents: 3000,
      changeDueCents: 600,
      customerEmail: 'test@example.com',
    })

    const serialised = JSON.stringify(original)
    const deserialised: ReceiptData = JSON.parse(serialised)

    expect(deserialised.orderId).toBe(original.orderId)
    expect(deserialised.storeName).toBe(original.storeName)
    expect(deserialised.storeAddress).toBe(original.storeAddress)
    expect(deserialised.storePhone).toBe(original.storePhone)
    expect(deserialised.gstNumber).toBe(original.gstNumber)
    expect(deserialised.completedAt).toBe(original.completedAt)
    expect(deserialised.staffName).toBe(original.staffName)
    expect(deserialised.items).toHaveLength(original.items.length)
    expect(deserialised.items[0]).toEqual(original.items[0])
    expect(deserialised.items[1]).toEqual(original.items[1])
    expect(deserialised.subtotalCents).toBe(original.subtotalCents)
    expect(deserialised.gstCents).toBe(original.gstCents)
    expect(deserialised.totalCents).toBe(original.totalCents)
    expect(deserialised.paymentMethod).toBe(original.paymentMethod)
    expect(deserialised.cashTenderedCents).toBe(original.cashTenderedCents)
    expect(deserialised.changeDueCents).toBe(original.changeDueCents)
    expect(deserialised.customerEmail).toBe(original.customerEmail)
  })

  it('Test 6: handles null store fields by defaulting to empty string', () => {
    const result = buildReceiptData({
      orderId: 'order-uuid-008',
      store: mockStoreNullFields,
      staffName: 'Jane Smith',
      items: mockCartItems,
      totals: mockTotals,
      paymentMethod: 'eftpos',
    })

    expect(result.storeName).toBe('Minimal Store')
    expect(result.storeAddress).toBe('')
    expect(result.storePhone).toBe('')
    expect(result.gstNumber).toBe('')
  })
})
