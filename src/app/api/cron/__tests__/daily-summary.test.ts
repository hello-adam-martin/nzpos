import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

// Mock sendEmail
const mockSendEmail = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// Mock DailySummaryEmail — just needs to return something React-like
const mockDailySummaryEmail = vi.fn().mockReturnValue(null)
vi.mock('@/emails/DailySummaryEmail', () => ({
  DailySummaryEmail: (props: unknown) => mockDailySummaryEmail(props),
}))

// Mock date-fns-tz to control timezone calculations
vi.mock('date-fns-tz', () => ({
  toZonedTime: (date: Date) => date,
  fromZonedTime: (date: Date) => date,
}))

// ---------------------------------------------------------------------------
// Supabase mock — chainable builder that dispatches by table name
// ---------------------------------------------------------------------------

type QueryResult<T> = { data: T | null; error: null }

// Per-table response registry
const tableResponses: Record<string, QueryResult<unknown>> = {}

function setTableResponse<T>(table: string, data: T) {
  tableResponses[table] = { data, error: null }
}

function makeChain(tableName: string) {
  // Create a chainable proxy that resolves with the table's registered data
  const resolve = () => tableResponses[tableName] ?? { data: null, error: null }

  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'gte', 'lt', 'not', 'filter', 'limit', 'single']
  for (const m of methods) {
    chain[m] = vi.fn((..._args: unknown[]) => {
      // 'single' is a terminal that returns the resolved promise-like object
      if (m === 'single') return Promise.resolve(resolve())
      // other methods return the same chain (for chaining) but also thenable
      return Object.assign(Promise.resolve(resolve()), chain)
    })
  }
  return chain
}

const mockFrom = vi.fn((table: string) => makeChain(table))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: mockFrom }),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildRequest(secret: string) {
  return new NextRequest('http://localhost/api/cron/daily-summary', {
    headers: { Authorization: `Bearer ${secret}` },
  })
}

const VALID_SECRET = 'test-cron-secret'

const MOCK_STORE = { id: 'store-1', name: 'Test Store', address: '1 Main St', phone: '09 000 0000' }

const MOCK_ORDERS = [
  { id: 'order-1', total_cents: 1500, payment_method: 'eftpos' },
  { id: 'order-2', total_cents: 2000, payment_method: 'cash' },
  { id: 'order-3', total_cents: 3500, payment_method: 'stripe' },
]

const MOCK_ORDER_ITEMS = [
  {
    product_id: 'prod-1',
    quantity: 3,
    line_total_cents: 4500,
    products: { name: 'Widget A' },
    orders: { store_id: 'store-1', status: 'completed', created_at: '2026-04-01T00:00:00Z' },
  },
  {
    product_id: 'prod-2',
    quantity: 1,
    line_total_cents: 2000,
    products: { name: 'Widget B' },
    orders: { store_id: 'store-1', status: 'completed', created_at: '2026-04-01T00:00:00Z' },
  },
]

const MOCK_LOW_STOCK = [
  { name: 'Widget A', stock_quantity: 2, reorder_threshold: 5 },
  { name: 'Widget C', stock_quantity: 0, reorder_threshold: 3 },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/daily-summary', () => {
  let originalCronSecret: string | undefined
  let originalFounderEmail: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    originalCronSecret = process.env.CRON_SECRET
    originalFounderEmail = process.env.FOUNDER_EMAIL
    process.env.CRON_SECRET = VALID_SECRET
    process.env.FOUNDER_EMAIL = 'founder@example.com'
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret
    process.env.FOUNDER_EMAIL = originalFounderEmail
  })

  it('rejects unauthorized request with wrong CRON_SECRET', async () => {
    const { GET } = await import('../daily-summary/route')
    const req = buildRequest('wrong-secret')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const text = await res.text()
    expect(text).toBe('Unauthorized')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 500 when FOUNDER_EMAIL is not set', async () => {
    delete process.env.FOUNDER_EMAIL
    const { GET } = await import('../daily-summary/route')
    const req = buildRequest(VALID_SECRET)
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('FOUNDER_EMAIL')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends daily summary with correct sales data', async () => {
    setTableResponse('stores', MOCK_STORE)
    setTableResponse('orders', MOCK_ORDERS)
    setTableResponse('order_items', MOCK_ORDER_ITEMS)
    setTableResponse('products', [])

    const { GET } = await import('../daily-summary/route')
    const req = buildRequest(VALID_SECRET)
    const res = await GET(req)
    expect(res.status).toBe(200)

    expect(mockSendEmail).toHaveBeenCalledOnce()
    const sendEmailCall = mockSendEmail.mock.calls[0][0] as {
      to: string
      subject: string
      react: unknown
    }
    expect(sendEmailCall.to).toBe('founder@example.com')
    expect(sendEmailCall.subject).toContain('Daily summary')

    expect(mockDailySummaryEmail).toHaveBeenCalledOnce()
    const emailProps = mockDailySummaryEmail.mock.calls[0][0] as {
      totalSales: number
      totalRevenueCents: number
      revenueByMethod: { method: string; amountCents: number }[]
      lowStockItems: unknown[]
    }
    expect(emailProps.totalSales).toBe(3)
    expect(emailProps.totalRevenueCents).toBe(7000)

    // Revenue by method: EFTPOS=1500, Cash=2000, Online=3500
    const methods = emailProps.revenueByMethod.map(m => m.method)
    expect(methods).toContain('EFTPOS')
    expect(methods).toContain('Cash')
    expect(methods).toContain('Online')
    const eftpos = emailProps.revenueByMethod.find(m => m.method === 'EFTPOS')
    expect(eftpos?.amountCents).toBe(1500)
    const online = emailProps.revenueByMethod.find(m => m.method === 'Online')
    expect(online?.amountCents).toBe(3500)

    const body = await res.json()
    expect(body.totalSales).toBe(3)
    expect(body.sent).toBe(true)
  })

  it('sends zero-sale summary even when there are no sales', async () => {
    setTableResponse('stores', MOCK_STORE)
    setTableResponse('orders', [])
    setTableResponse('order_items', [])
    setTableResponse('products', [])

    const { GET } = await import('../daily-summary/route')
    const req = buildRequest(VALID_SECRET)
    const res = await GET(req)
    expect(res.status).toBe(200)

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockDailySummaryEmail).toHaveBeenCalledOnce()
    const emailProps = mockDailySummaryEmail.mock.calls[0][0] as {
      totalSales: number
      totalRevenueCents: number
      topProducts: unknown[]
    }
    expect(emailProps.totalSales).toBe(0)
    expect(emailProps.totalRevenueCents).toBe(0)
    expect(emailProps.topProducts).toHaveLength(0)
  })

  it('populates lowStockItems correctly from products at or below threshold', async () => {
    setTableResponse('stores', MOCK_STORE)
    setTableResponse('orders', MOCK_ORDERS)
    setTableResponse('order_items', MOCK_ORDER_ITEMS)
    setTableResponse('products', MOCK_LOW_STOCK)

    const { GET } = await import('../daily-summary/route')
    const req = buildRequest(VALID_SECRET)
    const res = await GET(req)
    expect(res.status).toBe(200)

    expect(mockDailySummaryEmail).toHaveBeenCalledOnce()
    const emailProps = mockDailySummaryEmail.mock.calls[0][0] as {
      lowStockItems: { name: string; currentStock: number; reorderThreshold: number }[]
    }
    expect(emailProps.lowStockItems).toHaveLength(2)
    const widgetA = emailProps.lowStockItems.find(i => i.name === 'Widget A')
    expect(widgetA?.currentStock).toBe(2)
    expect(widgetA?.reorderThreshold).toBe(5)

    const body = await res.json()
    expect(body.lowStockCount).toBe(2)
  })

  it('sends empty lowStockItems when all products are above threshold', async () => {
    const aboveThreshold = [
      { name: 'Well-stocked Item', stock_quantity: 20, reorder_threshold: 5 },
    ]
    setTableResponse('stores', MOCK_STORE)
    setTableResponse('orders', MOCK_ORDERS)
    setTableResponse('order_items', MOCK_ORDER_ITEMS)
    setTableResponse('products', aboveThreshold)

    const { GET } = await import('../daily-summary/route')
    const req = buildRequest(VALID_SECRET)
    const res = await GET(req)
    expect(res.status).toBe(200)

    expect(mockDailySummaryEmail).toHaveBeenCalledOnce()
    const emailProps = mockDailySummaryEmail.mock.calls[0][0] as {
      lowStockItems: unknown[]
    }
    // stock_quantity 20 > reorder_threshold 5 — should be filtered out
    expect(emailProps.lowStockItems).toHaveLength(0)

    const body = await res.json()
    expect(body.lowStockCount).toBe(0)
  })
})
