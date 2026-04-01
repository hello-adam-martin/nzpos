import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only at module level
vi.mock('server-only', () => ({}))

// Mock Supabase admin client
const mockSupabaseClient = {
  from: vi.fn(),
}
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => mockSupabaseClient,
}))

// Mock authenticated Xero client
const mockCreateInvoices = vi.fn()
const mockUpdateInvoice = vi.fn()
const mockCreateCreditNotes = vi.fn()
const mockXeroClient = {
  accountingApi: {
    createInvoices: mockCreateInvoices,
    updateInvoice: mockUpdateInvoice,
    createCreditNotes: mockCreateCreditNotes,
  },
}
vi.mock('../client', () => ({
  getAuthenticatedXeroClient: vi.fn(),
}))

// Mock date functions
vi.mock('../dates', () => ({
  getNZDayBoundaries: vi.fn(() => ({
    from: new Date('2026-03-31T11:00:00Z'),
    to: new Date('2026-04-01T10:59:59.999Z'),
    label: '2026-03-31',
  })),
  getNZTodayBoundaries: vi.fn(() => ({
    from: new Date('2026-04-01T11:00:00Z'),
    to: new Date('2026-04-02T01:00:00Z'),
    label: '2026-04-01',
  })),
}))

// Mock buildInvoice
vi.mock('../buildInvoice', () => ({
  buildDailyInvoice: vi.fn(() => ({ invoiceID: undefined, lineItems: [] })),
  buildCreditNote: vi.fn(() => ({ lineItems: [] })),
}))

import { getAuthenticatedXeroClient } from '../client'
import { getNZDayBoundaries, getNZTodayBoundaries } from '../dates'
import { buildDailyInvoice, buildCreditNote } from '../buildInvoice'
import { executeDailySync, executeManualSync, executeDailySyncWithRetry } from '../sync'

/**
 * Build a simple chainable Supabase query mock that resolves to `result`.
 */
function makeChain(result: unknown) {
  const self: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'lte', 'in', 'single']
  methods.forEach((m) => {
    self[m] = vi.fn(() => self)
  })
  // insert/update return a new chain
  self.insert = vi.fn(() => makeChain(result))
  self.update = vi.fn(() => makeChain(result))
  // Make it a thenable
  self.then = (resolve: (val: unknown) => unknown) =>
    Promise.resolve(result).then(resolve)
  return self
}

type OrderRow = { total_cents: number; payment_method: string; channel: string; status: string }

/**
 * Setup standard from() mock for common tables.
 *
 * @param forRetry - If true, handles multiple sync attempts (each attempt gets fresh counters)
 *   by tracking calls per invocation window rather than globally. Sync log check always
 *   returns null (no prior success), and orders always return the same data.
 */
function setupStandardMocks({
  connectionData = {
    account_code_cash: '200',
    account_code_eftpos: '201',
    account_code_online: '202',
    xero_contact_id: 'contact-abc',
  } as Record<string, string> | null,
  completedOrders = [] as OrderRow[],
  refundedOrders = [] as OrderRow[],
  existingLog = null as { xero_invoice_id: string; status: string } | null,
  logInsertData = { id: 'log-1' } as { id: string },
  forRetry = false,
} = {}) {
  if (forRetry) {
    // For retry tests: always return completedOrders on first orders call, refundedOrders on second
    // Track per-pair using a modulo approach: odd calls = completed, even calls = refunded
    let ordersCallCount = 0

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return makeChain({ data: connectionData, error: null })
      }
      if (table === 'xero_sync_log') {
        // Always return no existing log and accept inserts/updates
        return makeChain({ data: logInsertData, error: null })
      }
      if (table === 'orders') {
        ordersCallCount++
        // Odd call = completed orders, even call = refunded orders (per attempt: 2 calls each)
        if (ordersCallCount % 2 === 1) {
          return makeChain({ data: completedOrders, error: null })
        }
        return makeChain({ data: refundedOrders, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    return
  }

  let ordersCallCount = 0
  let syncLogCallCount = 0

  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === 'xero_connections') {
      return makeChain({ data: connectionData, error: null })
    }
    if (table === 'xero_sync_log') {
      syncLogCallCount++
      if (syncLogCallCount === 1) {
        return makeChain({ data: existingLog, error: null })
      }
      return makeChain({ data: logInsertData, error: null })
    }
    if (table === 'orders') {
      ordersCallCount++
      if (ordersCallCount === 1) {
        return makeChain({ data: completedOrders, error: null })
      }
      return makeChain({ data: refundedOrders, error: null })
    }
    return makeChain({ data: null, error: null })
  })
}

describe('aggregateDailySales (via executeDailySync)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInvoices.mockReset()
    mockUpdateInvoice.mockReset()
    mockCreateCreditNotes.mockReset()
  })

  it('aggregates sales by payment method from order data', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      completedOrders: [
        { total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' },
        { total_cents: 2000, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
        { total_cents: 500, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
      ],
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-xyz', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const result = await executeDailySync('store-1')

    expect(buildDailyInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        cashTotalCents: 1000,
        eftposTotalCents: 2500,
        onlineTotalCents: 0,
      }),
      expect.any(Object),
      undefined
    )
    expect(result.success).toBe(true)
  })

  it('filters to only completed/collected/ready orders using .in() status filter', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    const inFilterValues: string[][] = []
    let syncLogCallCount = 0

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return makeChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log') {
        syncLogCallCount++
        return makeChain({ data: syncLogCallCount === 1 ? null : { id: 'log-1' }, error: null })
      }
      if (table === 'orders') {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'gte', 'lte', 'single']
        methods.forEach((m) => {
          chain[m] = vi.fn(() => chain)
        })
        chain.in = vi.fn((field: string, values: string[]) => {
          if (field === 'status') inFilterValues.push([...values])
          return chain
        })
        chain.then = (resolve: (val: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        return chain
      }
      return makeChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-xyz', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    await executeDailySync('store-1')

    expect(inFilterValues[0]).toContain('completed')
    expect(inFilterValues[0]).toContain('collected')
    expect(inFilterValues[0]).toContain('ready')
    expect(inFilterValues[0]).not.toContain('refunded')
    expect(inFilterValues[0]).not.toContain('pending')
    expect(inFilterValues[0]).not.toContain('expired')
    expect(inFilterValues[0]).not.toContain('pending_pickup')
    expect(inFilterValues[1]).toContain('refunded')
  })

  it('returns zero for payment methods with no orders', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      completedOrders: [
        { total_cents: 1500, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
      ],
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-xyz', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    await executeDailySync('store-1')

    expect(buildDailyInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        cashTotalCents: 0,
        eftposTotalCents: 1500,
        onlineTotalCents: 0,
      }),
      expect.any(Object),
      undefined
    )
  })
})

describe('executeDailySync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInvoices.mockReset()
    mockUpdateInvoice.mockReset()
    mockCreateCreditNotes.mockReset()
  })

  it('creates pending sync log entry, calls Xero API, updates to success with invoice ID', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      completedOrders: [
        { total_cents: 5000, payment_method: 'cash', channel: 'pos', status: 'completed' },
      ],
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-123', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const result = await executeDailySync('store-1')

    expect(result.success).toBe(true)
    expect(result.invoiceNumber).toBe('NZPOS-2026-03-31')
    expect(mockCreateInvoices).toHaveBeenCalledOnce()
  })

  it('updates existing invoice when sync_log has prior success for same date (upsert)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      existingLog: { xero_invoice_id: 'existing-inv-456', status: 'success' },
      completedOrders: [
        { total_cents: 3000, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
      ],
    })

    mockUpdateInvoice.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'existing-inv-456', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const result = await executeDailySync('store-1')

    expect(buildDailyInvoice).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'existing-inv-456'
    )
    expect(mockUpdateInvoice).toHaveBeenCalledWith(
      'tenant-123',
      'existing-inv-456',
      expect.any(Object)
    )
    expect(result.success).toBe(true)
  })

  it('writes error_message to sync log on Xero API failure', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    const updatePayloads: Array<Record<string, unknown>> = []
    let syncLogCallCount = 0
    let ordersCallCount = 0

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return makeChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log') {
        syncLogCallCount++
        if (syncLogCallCount === 1) {
          return makeChain({ data: null, error: null })
        }
        // Create a chain with a captured update method
        const chain = makeChain({ data: { id: 'log-err' }, error: null })
        chain.update = vi.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'orders') {
        ordersCallCount++
        return makeChain({
          data: ordersCallCount === 1
            ? [{ total_cents: 2000, payment_method: 'cash', channel: 'pos', status: 'completed' }]
            : [],
          error: null,
        })
      }
      return makeChain({ data: null, error: null })
    })

    mockCreateInvoices.mockRejectedValueOnce(new Error('Xero API timeout'))

    const result = await executeDailySync('store-1')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Xero API timeout')
    const failureUpdate = updatePayloads.find((u) => u.status === 'failed')
    expect(failureUpdate).toBeDefined()
    expect(failureUpdate?.error_message).toBe('Xero API timeout')
  })

  it('returns early with "no sales" message when all totals are zero', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({ completedOrders: [], refundedOrders: [] })

    const result = await executeDailySync('store-1')

    expect(result.success).toBe(true)
    expect(result.message).toContain('No sales')
    expect(mockCreateInvoices).not.toHaveBeenCalled()
  })

  it('skips sync when Xero is not connected (no authenticated client)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce(null)

    const result = await executeDailySync('store-1')

    expect(result.success).toBe(false)
    expect(result.message).toContain('not connected')
    expect(mockCreateInvoices).not.toHaveBeenCalled()
  })
})

describe('executeManualSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInvoices.mockReset()
    mockUpdateInvoice.mockReset()
    mockCreateCreditNotes.mockReset()
  })

  it('uses getNZTodayBoundaries for today sales window', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({ completedOrders: [], refundedOrders: [] })

    await executeManualSync('store-1')

    expect(getNZTodayBoundaries).toHaveBeenCalled()
    expect(getNZDayBoundaries).not.toHaveBeenCalled()
  })
})

describe('syncRefundsAsCreditNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInvoices.mockReset()
    mockUpdateInvoice.mockReset()
    mockCreateCreditNotes.mockReset()
  })

  it('creates credit notes for refunded orders in the sync period', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      completedOrders: [
        { total_cents: 5000, payment_method: 'cash', channel: 'pos', status: 'completed' },
      ],
      refundedOrders: [
        { total_cents: 1500, payment_method: 'eftpos', channel: 'pos', status: 'refunded' },
      ],
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-refund', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })
    mockCreateCreditNotes.mockResolvedValueOnce({
      body: { creditNotes: [{ creditNoteID: 'cn-1' }] },
    })

    await executeDailySync('store-1')

    expect(buildCreditNote).toHaveBeenCalledWith(
      1500,
      '2026-03-31',
      expect.any(Object),
      expect.any(String)
    )
    expect(mockCreateCreditNotes).toHaveBeenCalledOnce()
  })
})

describe('executeDailySyncWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInvoices.mockReset()
    mockUpdateInvoice.mockReset()
    mockCreateCreditNotes.mockReset()
  })

  it('retries up to 3 times and returns success when eventually succeeds', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValue({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      forRetry: true,
      completedOrders: [
        { total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' },
      ],
    })

    // First two calls fail, third succeeds
    mockCreateInvoices
      .mockRejectedValueOnce(new Error('Network error attempt 1'))
      .mockRejectedValueOnce(new Error('Network error attempt 2'))
      .mockResolvedValueOnce({
        body: { invoices: [{ invoiceID: 'inv-ok', invoiceNumber: 'NZPOS-2026-03-31' }] },
      })

    // Pass no-op sleepFn to skip actual delays
    const noopSleep = vi.fn().mockResolvedValue(undefined)
    const result = await executeDailySyncWithRetry('store-1', undefined, noopSleep)

    expect(result.success).toBe(true)
    expect(result.attempts).toBeGreaterThanOrEqual(2)
    expect(mockCreateInvoices).toHaveBeenCalledTimes(3)
    // Verify sleep was called with backoff values
    expect(noopSleep).toHaveBeenCalledWith(60_000)
    expect(noopSleep).toHaveBeenCalledWith(300_000)
  })

  it('increments attempt count and marks failed after 3 failures', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValue({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      forRetry: true,
      completedOrders: [
        { total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' },
      ],
    })

    mockCreateInvoices.mockRejectedValue(new Error('Persistent failure'))

    const noopSleep = vi.fn().mockResolvedValue(undefined)
    const result = await executeDailySyncWithRetry('store-1', undefined, noopSleep)

    expect(result.success).toBe(false)
    expect(result.message).toContain('Persistent failure')
    expect(result.attempts).toBe(3)
    expect(mockCreateInvoices).toHaveBeenCalledTimes(3)
  })

  it('stops retrying on success (attempt 1)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValue({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    setupStandardMocks({
      forRetry: true,
      completedOrders: [
        { total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' },
      ],
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-quick', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const noopSleep = vi.fn().mockResolvedValue(undefined)
    const result = await executeDailySyncWithRetry('store-1', undefined, noopSleep)

    expect(result.success).toBe(true)
    expect(result.attempts).toBe(1)
    expect(mockCreateInvoices).toHaveBeenCalledOnce()
    // Sleep should not be called when first attempt succeeds
    expect(noopSleep).not.toHaveBeenCalled()
  })

  it('does not retry non-retryable failures (Xero not connected)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce(null)

    const noopSleep = vi.fn().mockResolvedValue(undefined)
    const result = await executeDailySyncWithRetry('store-1', undefined, noopSleep)

    expect(result.success).toBe(false)
    expect(result.message).toContain('not connected')
    expect(result.attempts).toBe(1)
    expect(getAuthenticatedXeroClient).toHaveBeenCalledOnce()
    // No sleep on non-retryable
    expect(noopSleep).not.toHaveBeenCalled()
  })
})
