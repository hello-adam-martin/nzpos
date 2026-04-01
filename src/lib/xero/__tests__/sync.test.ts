import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock server-only at module level
vi.mock('server-only', () => ({}))

// Mock the sleep function to run instantly in tests
vi.mock('../sync', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../sync')>()
  return mod
})

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()
const mockSupabaseClient = {
  from: mockSupabaseFrom,
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

// Helper to build a chainable Supabase mock
function buildSupabaseQueryChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn(),
  }
  // Make the chain resolve as a promise
  const withResult = {
    ...chain,
    then: (resolve: (val: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  Object.keys(chain).forEach((key) => {
    if (key !== 'then') {
      ;(chain as Record<string, ReturnType<typeof vi.fn>>)[key].mockReturnValue(withResult)
    }
  })
  return withResult
}

describe('aggregateDailySales (internal helper via executeDailySync)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates sales by payment method from order data', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    // Orders query returns cash + eftpos orders
    let callCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && callCount === 0) {
        callCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log' && callCount === 1) {
        callCount++
        return buildSupabaseQueryChain({ data: { id: 'log-1' }, error: null })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [
            { total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' },
            { total_cents: 2000, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
            { total_cents: 500, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
          ],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-xyz', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const { executeDailySync } = await import('../sync')
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

  it('filters to only completed/collected/ready orders (excludes refunded, pending, expired)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    let logCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-1' }, error: null })
      }
      if (table === 'orders') {
        // Capture the chain to inspect calls
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn((field: string, values: string[]) => {
            // Verify the 'in' filter uses correct statuses
            if (field === 'status') {
              expect(values).toContain('completed')
              expect(values).toContain('collected')
              expect(values).toContain('ready')
              expect(values).not.toContain('refunded')
              expect(values).not.toContain('pending')
              expect(values).not.toContain('expired')
              expect(values).not.toContain('pending_pickup')
            }
            return mockChain
          }),
          then: (resolve: (val: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(resolve),
        }
        mockChain.select.mockReturnValue(mockChain)
        mockChain.eq.mockReturnValue(mockChain)
        mockChain.gte.mockReturnValue(mockChain)
        mockChain.lte.mockReturnValue(mockChain)
        return mockChain
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-xyz', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const { executeDailySync } = await import('../sync')
    await executeDailySync('store-1')
  })

  it('returns zero for payment methods with no orders', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    let logCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-1' }, error: null })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [
            { total_cents: 1500, payment_method: 'eftpos', channel: 'pos', status: 'completed' },
          ],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-xyz', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const { executeDailySync } = await import('../sync')
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
  })

  it('creates pending sync log entry, calls Xero API, updates to success with invoice ID', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    const insertMock = vi.fn().mockReturnValue(
      buildSupabaseQueryChain({ data: { id: 'log-1' }, error: null })
    )
    const updateMock = vi.fn().mockReturnValue(
      buildSupabaseQueryChain({ data: null, error: null })
    )

    let logCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        // First call: check for existing log
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log' && logCallCount === 1) {
        logCallCount++
        // Second call: insert pending log
        return { insert: insertMock }
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        // Third+ calls: update log
        return { update: updateMock }
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [{ total_cents: 5000, payment_method: 'cash', channel: 'pos', status: 'completed' }],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-123', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const { executeDailySync } = await import('../sync')
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

    let logCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        // Existing successful log entry
        return buildSupabaseQueryChain({
          data: { xero_invoice_id: 'existing-inv-456', status: 'success' },
          error: null,
        })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-2' }, error: null })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [{ total_cents: 3000, payment_method: 'eftpos', channel: 'pos', status: 'completed' }],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockUpdateInvoice.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'existing-inv-456', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const { executeDailySync } = await import('../sync')
    const result = await executeDailySync('store-1')

    expect(buildDailyInvoice).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'existing-inv-456'
    )
    expect(mockUpdateInvoice).toHaveBeenCalledWith('tenant-123', 'existing-inv-456', expect.any(Object))
    expect(result.success).toBe(true)
  })

  it('writes error_message to sync log on Xero API failure', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    const updateMock = vi.fn().mockReturnValue(
      buildSupabaseQueryChain({ data: null, error: null })
    )

    let logCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log' && logCallCount === 1) {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-err' }, error: null })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return { update: updateMock }
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [{ total_cents: 2000, payment_method: 'cash', channel: 'pos', status: 'completed' }],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockRejectedValueOnce(new Error('Xero API timeout'))

    const { executeDailySync } = await import('../sync')
    const result = await executeDailySync('store-1')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Xero API timeout')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error_message: 'Xero API timeout' })
    )
  })

  it('returns early with "no sales" message when all totals are zero', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({ data: [], error: null })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    const { executeDailySync } = await import('../sync')
    const result = await executeDailySync('store-1')

    expect(result.success).toBe(true)
    expect(result.message).toContain('No sales')
    expect(mockCreateInvoices).not.toHaveBeenCalled()
  })

  it('skips sync when Xero is not connected (no authenticated client)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce(null)

    const { executeDailySync } = await import('../sync')
    const result = await executeDailySync('store-1')

    expect(result.success).toBe(false)
    expect(result.message).toContain('not connected')
    expect(mockCreateInvoices).not.toHaveBeenCalled()
  })
})

describe('executeManualSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses getNZTodayBoundaries for today sales window', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    let logCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-manual' }, error: null })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({ data: [], error: null })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    const { executeManualSync } = await import('../sync')
    await executeManualSync('store-1')

    expect(getNZTodayBoundaries).toHaveBeenCalled()
    expect(getNZDayBoundaries).not.toHaveBeenCalled()
  })
})

describe('syncRefundsAsCreditNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates credit notes for refunded orders', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValueOnce({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    let logCallCount = 0
    let ordersCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 0) {
        logCallCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-refund' }, error: null })
      }
      if (table === 'orders') {
        ordersCallCount++
        if (ordersCallCount === 1) {
          // Completed orders (zero totals so we still proceed to refund check)
          return buildSupabaseQueryChain({ data: [], error: null })
        }
        if (ordersCallCount === 2) {
          // Refunded orders
          return buildSupabaseQueryChain({
            data: [{ total_cents: 1500, payment_method: 'eftpos', channel: 'pos', status: 'refunded' }],
            error: null,
          })
        }
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-refund', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })
    mockCreateCreditNotes.mockResolvedValueOnce({
      body: { creditNotes: [{ creditNoteID: 'cn-1', creditNoteNumber: 'NZPOS-CN-2026-03-31' }] },
    })

    const { executeDailySync } = await import('../sync')
    // Provide some sales so we don't early-return on "no sales"
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
          data: {
            account_code_cash: '200',
            account_code_eftpos: '201',
            account_code_online: '202',
            xero_contact_id: 'contact-abc',
          },
          error: null,
        })
      }
      if (table === 'xero_sync_log' && logCallCount === 2) {
        logCallCount++
        return buildSupabaseQueryChain({ data: null, error: null })
      }
      if (table === 'xero_sync_log') {
        logCallCount++
        return buildSupabaseQueryChain({ data: { id: 'log-refund-2' }, error: null })
      }
      if (table === 'orders') {
        ordersCallCount++
        if (ordersCallCount === 3) {
          // Completed orders
          return buildSupabaseQueryChain({
            data: [{ total_cents: 5000, payment_method: 'cash', channel: 'pos', status: 'completed' }],
            error: null,
          })
        }
        // Refunded orders
        return buildSupabaseQueryChain({
          data: [{ total_cents: 1500, payment_method: 'eftpos', channel: 'pos', status: 'refunded' }],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    await executeDailySync('store-1')

    expect(buildCreditNote).toHaveBeenCalledWith(1500, '2026-03-31', expect.any(Object), expect.any(String))
    expect(mockCreateCreditNotes).toHaveBeenCalledOnce()
  })
})

describe('executeDailySyncWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock sleep to be instant
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries up to 3 times on failure and returns success if eventually succeeds', async () => {
    // First two calls fail, third succeeds
    vi.mocked(getAuthenticatedXeroClient)
      .mockResolvedValueOnce({
        xero: mockXeroClient as never,
        tenantId: 'tenant-123',
      })
      .mockResolvedValueOnce({
        xero: mockXeroClient as never,
        tenantId: 'tenant-123',
      })
      .mockResolvedValueOnce({
        xero: mockXeroClient as never,
        tenantId: 'tenant-123',
      })

    let callNum = 0
    const makeFromMock = () => {
      callNum++
      return (table: string) => {
        if (table === 'xero_connections') {
          return buildSupabaseQueryChain({
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
          return buildSupabaseQueryChain({ data: { id: `log-${callNum}` }, error: null })
        }
        if (table === 'orders') {
          return buildSupabaseQueryChain({
            data: [{ total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' }],
            error: null,
          })
        }
        return buildSupabaseQueryChain({ data: null, error: null })
      }
    }

    mockSupabaseFrom.mockImplementation(makeFromMock())

    mockCreateInvoices
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        body: { invoices: [{ invoiceID: 'inv-ok', invoiceNumber: 'NZPOS-2026-03-31' }] },
      })

    const { executeDailySyncWithRetry } = await import('../sync')

    // We need to handle the sleep calls - use Promise.resolve to bypass
    const resultPromise = executeDailySyncWithRetry('store-1')
    // Advance all timers to skip backoff delays
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.success).toBe(true)
    expect(result.attempts).toBeGreaterThanOrEqual(1)
  })

  it('marks status as failed with error_message after 3 failures', async () => {
    vi.mocked(getAuthenticatedXeroClient)
      .mockResolvedValue({
        xero: mockXeroClient as never,
        tenantId: 'tenant-123',
      })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
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
        return buildSupabaseQueryChain({ data: { id: 'log-fail' }, error: null })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [{ total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' }],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockRejectedValue(new Error('Persistent failure'))

    const { executeDailySyncWithRetry } = await import('../sync')

    const resultPromise = executeDailySyncWithRetry('store-1')
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.message).toContain('Persistent failure')
    expect(result.attempts).toBe(3)
  })

  it('stops retrying on success', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValue({
      xero: mockXeroClient as never,
      tenantId: 'tenant-123',
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'xero_connections') {
        return buildSupabaseQueryChain({
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
        return buildSupabaseQueryChain({ data: { id: 'log-ok' }, error: null })
      }
      if (table === 'orders') {
        return buildSupabaseQueryChain({
          data: [{ total_cents: 1000, payment_method: 'cash', channel: 'pos', status: 'completed' }],
          error: null,
        })
      }
      return buildSupabaseQueryChain({ data: null, error: null })
    })

    mockCreateInvoices.mockResolvedValueOnce({
      body: { invoices: [{ invoiceID: 'inv-quick', invoiceNumber: 'NZPOS-2026-03-31' }] },
    })

    const { executeDailySyncWithRetry } = await import('../sync')
    const result = await executeDailySyncWithRetry('store-1')

    expect(result.success).toBe(true)
    expect(result.attempts).toBe(1)
    // Should not call createInvoices more than once
    expect(mockCreateInvoices).toHaveBeenCalledOnce()
  })

  it('does not retry non-retryable failures (Xero not connected)', async () => {
    vi.mocked(getAuthenticatedXeroClient).mockResolvedValue(null)

    const { executeDailySyncWithRetry } = await import('../sync')
    const result = await executeDailySyncWithRetry('store-1')

    expect(result.success).toBe(false)
    expect(result.message).toContain('not connected')
    expect(result.attempts).toBe(1)
    // Should only call getAuthenticatedXeroClient once, no retries
    expect(getAuthenticatedXeroClient).toHaveBeenCalledOnce()
  })
})
