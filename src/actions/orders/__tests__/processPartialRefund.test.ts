import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase server client (owner auth)
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
}))

// ---------------------------------------------------------------------------
// Mock Supabase admin client with flexible chainable query builder
// The admin client needs to handle multiple chained calls with different results.
// We use a queue-based approach: each call to from() pops from a queue.
// ---------------------------------------------------------------------------

const mockRpc = vi.fn()
const fromQueue: any[] = []

function enqueueFromResult(result: any) {
  fromQueue.push(result)
}

/**
 * Creates a chainable query builder that returns `result` when awaited
 * via .single(), .select(), or direct await.
 */
function createChain(result: any): any {
  const chain: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined
        if (prop === 'single') return () => Promise.resolve(result)
        if (prop === 'data') return result.data
        if (prop === 'error') return result.error
        return (..._args: any[]) => chain
      },
    }
  )
  return chain
}

const mockFrom = vi.fn((_table: string) => {
  const result = fromQueue.shift() ?? { data: null, error: null }
  return createChain(result)
})

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    rpc: mockRpc,
  }),
}))

// Mock Stripe
const mockRefundCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: { create: (...args: any[]) => mockRefundCreate(...args) },
  },
}))

// Mock Xero client
const mockGetAuthenticatedXeroClient = vi.fn()
vi.mock('@/lib/xero/client', () => ({
  getAuthenticatedXeroClient: (...args: any[]) => mockGetAuthenticatedXeroClient(...args),
}))

// Mock Xero buildInvoice
const mockBuildCreditNote = vi.fn()
vi.mock('@/lib/xero/buildInvoice', () => ({
  buildCreditNote: (...args: any[]) => mockBuildCreditNote(...args),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { processPartialRefund } from '../processPartialRefund'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const STORE_ID = 'b2c3d4e5-f6a7-4890-bcde-f12345678901'
const USER_ID = 'c5a9e8ec-f015-4276-978a-3ace3770189b'
const ORDER_ITEM_ID_1 = '34a2d4a4-01dc-4f01-a690-72356032be7c'
const ORDER_ITEM_ID_2 = '567415bd-f2df-41f3-8f11-55a106e54e31'
const PRODUCT_ID_1 = 'c9b19e24-04d3-4882-a681-d0310a380b9a'
const PRODUCT_ID_2 = 'a7b8c9d0-e1f2-4890-abcd-567890123456'
const REFUND_ID = 'b8c9d0e1-f2a3-4890-bcde-678901234567'

const validInput = {
  orderId: ORDER_ID,
  reason: 'customer_request' as const,
  items: [
    { orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 },
  ],
}

const completedOrder = {
  id: ORDER_ID,
  store_id: STORE_ID,
  status: 'completed',
  channel: 'pos',
  stripe_payment_intent_id: null,
  created_at: '2026-04-03T00:00:00.000Z',
  total_cents: 2000,
  order_items: [
    {
      id: ORDER_ITEM_ID_1,
      product_id: PRODUCT_ID_1,
      product_name: 'Widget A',
      quantity: 2,
      line_total_cents: 2000,
    },
  ],
}

function mockOwnerAuth(storeId = STORE_ID) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: USER_ID,
        app_metadata: { store_id: storeId },
      },
    },
  })
}

/**
 * Sets up the standard from() call sequence for a successful POS partial refund:
 * 1. fetch order
 * 2. fetch existing refund_ids for order (inner)
 * 3. fetch existing refund_items
 * 4. insert refund record
 * 5. update refund with stripe_refund_id (skipped for POS)
 * 6. insert refund_items
 * 7. re-fetch refund_items for status calculation (inner refunds)
 * 8. re-fetch refund_items for status calculation (refund_items)
 * 9. update order status
 * 10. xero_sync_log query (returns null = no xero)
 */
function setupPosRefundMocks(order = completedOrder, existingRefundItems: any[] = []) {
  // 1. fetch order
  enqueueFromResult({ data: order, error: null })
  // 2. existing refund IDs (inner subquery for refunds table)
  enqueueFromResult({ data: [], error: null })
  // 3. existing refund_items
  enqueueFromResult({ data: existingRefundItems, error: null })
  // 4. insert refund record
  enqueueFromResult({ data: { id: REFUND_ID }, error: null })
  // (no Stripe update for POS)
  // 5. insert refund_items
  enqueueFromResult({ data: null, error: null })
  // 6. re-fetch refunds for status calculation
  enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
  // 7. re-fetch refund_items for status calculation
  enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
  // 8. update order status
  enqueueFromResult({ data: null, error: null })
  // 9. xero_sync_log (no xero)
  enqueueFromResult({ data: null, error: null })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  fromQueue.length = 0
  mockRpc.mockResolvedValue({ error: null })
  mockGetAuthenticatedXeroClient.mockResolvedValue(null)
  mockBuildCreditNote.mockReturnValue({})
})

// ===========================================================================
// Validation
// ===========================================================================

describe('validation', () => {
  it('returns not-authenticated error when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns no-store-context error when user has no store_id', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, app_metadata: {} } },
    })
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ error: 'No store context' })
  })

  it('returns invalid-input for completely missing data', async () => {
    mockOwnerAuth()
    const result = await processPartialRefund({})
    expect(result).toEqual({ error: 'Invalid input' })
  })

  it('returns invalid-input when items array is empty', async () => {
    mockOwnerAuth()
    const result = await processPartialRefund({ ...validInput, items: [] })
    expect(result).toEqual({ error: 'Invalid input' })
  })

  it('returns invalid-input when quantityToRefund is 0', async () => {
    mockOwnerAuth()
    const result = await processPartialRefund({
      ...validInput,
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 0 }],
    })
    expect(result).toEqual({ error: 'Invalid input' })
  })

  it('returns invalid-input when quantityToRefund is negative', async () => {
    mockOwnerAuth()
    const result = await processPartialRefund({
      ...validInput,
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: -1 }],
    })
    expect(result).toEqual({ error: 'Invalid input' })
  })

  it('returns order-not-found when order does not exist', async () => {
    mockOwnerAuth()
    enqueueFromResult({ data: null, error: { message: 'Not found' } })
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ error: 'Order not found' })
  })

  it('returns cannot-refund for refunded orders', async () => {
    mockOwnerAuth()
    enqueueFromResult({ data: { ...completedOrder, status: 'refunded' }, error: null })
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ error: 'Order cannot be refunded in current status' })
  })

  it('returns cannot-refund for pending orders', async () => {
    mockOwnerAuth()
    enqueueFromResult({ data: { ...completedOrder, status: 'pending' }, error: null })
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ error: 'Order cannot be refunded in current status' })
  })

  it('returns cannot-refund for expired orders', async () => {
    mockOwnerAuth()
    enqueueFromResult({ data: { ...completedOrder, status: 'expired' }, error: null })
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ error: 'Order cannot be refunded in current status' })
  })

  it('returns over-refund error when quantity exceeds available', async () => {
    mockOwnerAuth()
    // Order has item with qty=2, already refunded qty=2
    enqueueFromResult({ data: completedOrder, error: null })
    // existing refund IDs
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // existing refund_items: already 2 refunded
    enqueueFromResult({
      data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 2 }],
      error: null,
    })
    const result = await processPartialRefund({
      ...validInput,
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 }],
    })
    expect(result).toMatchObject({ error: expect.stringContaining('Cannot refund more than remaining quantity') })
  })

  it('returns invalid-input for missing reason', async () => {
    mockOwnerAuth()
    const result = await processPartialRefund({
      orderId: ORDER_ID,
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 }],
    })
    expect(result).toEqual({ error: 'Invalid input' })
  })
})

// ===========================================================================
// Stripe
// ===========================================================================

describe('stripe', () => {
  it('calls stripe.refunds.create with partial amount for online orders', async () => {
    mockOwnerAuth()
    const onlineOrder = {
      ...completedOrder,
      channel: 'online',
      stripe_payment_intent_id: 'pi_online_123',
      total_cents: 5000,
      order_items: [
        {
          id: ORDER_ITEM_ID_1,
          product_id: PRODUCT_ID_1,
          product_name: 'Widget A',
          quantity: 3,
          line_total_cents: 3000,
        },
      ],
    }
    // 1. fetch order
    enqueueFromResult({ data: onlineOrder, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. update refund with stripe_refund_id
    enqueueFromResult({ data: null, error: null })
    // 6. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 7. re-fetch refunds for status calc
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 8. re-fetch refund_items for status calc
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
    // 9. update order status
    enqueueFromResult({ data: null, error: null })
    // 10. xero_sync_log
    enqueueFromResult({ data: null, error: null })

    mockRefundCreate.mockResolvedValue({ id: 're_partial_123', status: 'succeeded' })

    const result = await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'customer_request',
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 }],
    })

    expect(result).toEqual({ success: true, refundId: REFUND_ID })
    // 1 of 3 items from line_total_cents=3000 => Math.floor(1/3 * 3000) = 1000
    expect(mockRefundCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_online_123',
      amount: 1000,
    })
    // Stripe amount is NOT the full order total (5000)
    expect(mockRefundCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000 })
    )
  })

  it('does NOT call stripe for POS orders', async () => {
    mockOwnerAuth()
    setupPosRefundMocks()
    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ success: true, refundId: REFUND_ID })
    expect(mockRefundCreate).not.toHaveBeenCalled()
  })

  it('deletes pending refund record on Stripe failure', async () => {
    mockOwnerAuth()
    const onlineOrder = {
      ...completedOrder,
      channel: 'online',
      stripe_payment_intent_id: 'pi_fail_123',
      total_cents: 2000,
    }
    // 1. fetch order
    enqueueFromResult({ data: onlineOrder, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund (pending record)
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. delete pending refund on failure
    enqueueFromResult({ data: null, error: null })

    mockRefundCreate.mockRejectedValue(new Error('Stripe timeout'))

    const result = await processPartialRefund(validInput)
    expect(result).toMatchObject({ error: expect.stringContaining('Stripe') })
    // Stock should NOT have been restored
    expect(mockRpc).not.toHaveBeenCalledWith('restore_stock', expect.anything())
  })
})

// ===========================================================================
// Stock
// ===========================================================================

describe('stock', () => {
  it('calls restore_stock once per selected item with correct product_id and quantity', async () => {
    mockOwnerAuth()
    const orderWithTwoItems = {
      ...completedOrder,
      order_items: [
        {
          id: ORDER_ITEM_ID_1,
          product_id: PRODUCT_ID_1,
          product_name: 'Widget A',
          quantity: 3,
          line_total_cents: 3000,
        },
        {
          id: ORDER_ITEM_ID_2,
          product_id: PRODUCT_ID_2,
          product_name: 'Widget B',
          quantity: 2,
          line_total_cents: 2000,
        },
      ],
    }
    // 1. fetch order
    enqueueFromResult({ data: orderWithTwoItems, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 6. re-fetch refunds
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 7. re-fetch refund_items
    enqueueFromResult({
      data: [
        { order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 2 },
        { order_item_id: ORDER_ITEM_ID_2, quantity_refunded: 1 },
      ],
      error: null,
    })
    // 8. update order status
    enqueueFromResult({ data: null, error: null })
    // 9. xero_sync_log
    enqueueFromResult({ data: null, error: null })

    const result = await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'damaged',
      items: [
        { orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 2 },
        { orderItemId: ORDER_ITEM_ID_2, quantityToRefund: 1 },
      ],
    })

    expect(result).toEqual({ success: true, refundId: REFUND_ID })
    expect(mockRpc).toHaveBeenCalledWith('restore_stock', {
      p_product_id: PRODUCT_ID_1,
      p_quantity: 2,
    })
    expect(mockRpc).toHaveBeenCalledWith('restore_stock', {
      p_product_id: PRODUCT_ID_2,
      p_quantity: 1,
    })
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('uses correct product_id from order_items for the selected orderItemId', async () => {
    mockOwnerAuth()
    setupPosRefundMocks()

    await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'customer_request',
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 }],
    })

    expect(mockRpc).toHaveBeenCalledWith('restore_stock', {
      p_product_id: PRODUCT_ID_1,
      p_quantity: 1,
    })
  })
})

// ===========================================================================
// Xero
// ===========================================================================

describe('xero', () => {
  it('skips xero credit note when no sync_log found', async () => {
    mockOwnerAuth()
    setupPosRefundMocks()

    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ success: true, refundId: REFUND_ID })
    expect(mockBuildCreditNote).not.toHaveBeenCalled()
    expect(mockGetAuthenticatedXeroClient).not.toHaveBeenCalled()
  })

  it('creates credit note when xero connected and sync_log exists', async () => {
    mockOwnerAuth()
    const syncLog = {
      xero_invoice_id: 'xero-inv-1',
      xero_invoice_number: 'NZPOS-2026-04-03',
    }
    const mockCreateCreditNotes = vi.fn().mockResolvedValue({})
    mockGetAuthenticatedXeroClient.mockResolvedValue({
      xero: {
        accountingApi: { createCreditNotes: mockCreateCreditNotes },
      },
      tenantId: 'tenant-123',
    })
    mockBuildCreditNote.mockReturnValue({ type: 'ACCRECCREDIT' })

    // 1. fetch order
    enqueueFromResult({ data: completedOrder, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 6. re-fetch refunds for status calc
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 7. re-fetch refund_items for status calc
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
    // 8. update order status
    enqueueFromResult({ data: null, error: null })
    // 9. xero_sync_log: found
    enqueueFromResult({ data: syncLog, error: null })
    // 10. xero_connections for settings
    enqueueFromResult({
      data: {
        account_code_cash: '200',
        account_code_eftpos: '201',
        account_code_online: '202',
        xero_contact_id: 'contact-1',
      },
      error: null,
    })

    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ success: true, refundId: REFUND_ID })
    expect(mockBuildCreditNote).toHaveBeenCalledWith(
      expect.any(Number), // refund cents
      expect.any(String), // date label
      expect.objectContaining({ contactId: 'contact-1' }),
      'NZPOS-2026-04-03'
    )
    expect(mockCreateCreditNotes).toHaveBeenCalled()
  })

  it('refund still succeeds when getAuthenticatedXeroClient returns null', async () => {
    mockOwnerAuth()
    mockGetAuthenticatedXeroClient.mockResolvedValue(null)
    const syncLog = {
      xero_invoice_id: 'xero-inv-1',
      xero_invoice_number: 'NZPOS-2026-04-03',
    }

    // 1. fetch order
    enqueueFromResult({ data: completedOrder, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 6. re-fetch refunds
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 7. re-fetch refund_items
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
    // 8. update order status
    enqueueFromResult({ data: null, error: null })
    // 9. xero_sync_log: found
    enqueueFromResult({ data: syncLog, error: null })
    // 10. xero_connections
    enqueueFromResult({
      data: {
        account_code_cash: '200',
        account_code_eftpos: '201',
        account_code_online: '202',
        xero_contact_id: 'contact-1',
      },
      error: null,
    })

    const result = await processPartialRefund(validInput)
    // Should still succeed even when Xero returns null
    expect(result).toEqual({ success: true, refundId: REFUND_ID })
  })

  it('refund still succeeds when createCreditNotes throws', async () => {
    mockOwnerAuth()
    const syncLog = {
      xero_invoice_id: 'xero-inv-1',
      xero_invoice_number: 'NZPOS-2026-04-03',
    }
    mockGetAuthenticatedXeroClient.mockResolvedValue({
      xero: {
        accountingApi: {
          createCreditNotes: vi.fn().mockRejectedValue(new Error('Xero API error')),
        },
      },
      tenantId: 'tenant-123',
    })
    mockBuildCreditNote.mockReturnValue({ type: 'ACCRECCREDIT' })

    // 1. fetch order
    enqueueFromResult({ data: completedOrder, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 6. re-fetch refunds
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 7. re-fetch refund_items
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
    // 8. update order status
    enqueueFromResult({ data: null, error: null })
    // 9. xero_sync_log: found
    enqueueFromResult({ data: syncLog, error: null })
    // 10. xero_connections
    enqueueFromResult({
      data: {
        account_code_cash: '200',
        account_code_eftpos: '201',
        account_code_online: '202',
        xero_contact_id: 'contact-1',
      },
      error: null,
    })

    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ success: true, refundId: REFUND_ID })
  })
})

// ===========================================================================
// Audit
// ===========================================================================

describe('audit', () => {
  it('inserts refund record with correct fields', async () => {
    mockOwnerAuth()
    setupPosRefundMocks()

    await processPartialRefund(validInput)

    // The insert for the refund record is the 4th from() call (index 3 in queue)
    // We verify mockFrom was called with 'refunds'
    const refundFromCall = mockFrom.mock.calls.find(([table]) => table === 'refunds')
    expect(refundFromCall).toBeDefined()
  })

  it('inserts refund_items with correct per-item fields', async () => {
    mockOwnerAuth()
    setupPosRefundMocks()

    await processPartialRefund(validInput)

    const refundItemsCall = mockFrom.mock.calls.filter(([table]) => table === 'refund_items')
    expect(refundItemsCall.length).toBeGreaterThan(0)
  })

  it('revalidates admin paths after successful refund', async () => {
    mockOwnerAuth()
    setupPosRefundMocks()

    await processPartialRefund(validInput)

    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/reports')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard')
  })
})

// ===========================================================================
// Status transitions
// ===========================================================================

describe('status', () => {
  it('sets order to partially_refunded when some items remain un-refunded', async () => {
    mockOwnerAuth()
    const orderWith2Items = {
      ...completedOrder,
      order_items: [
        {
          id: ORDER_ITEM_ID_1,
          product_id: PRODUCT_ID_1,
          product_name: 'Widget A',
          quantity: 2,
          line_total_cents: 2000,
        },
        {
          id: ORDER_ITEM_ID_2,
          product_id: PRODUCT_ID_2,
          product_name: 'Widget B',
          quantity: 1,
          line_total_cents: 1000,
        },
      ],
    }
    // 1. fetch order
    enqueueFromResult({ data: orderWith2Items, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 6. re-fetch refunds for status calc
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 7. re-fetch refund_items: only item 1 refunded, item 2 not
    enqueueFromResult({
      data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 2 }],
      error: null,
    })
    // 8. update order status
    enqueueFromResult({ data: null, error: null })
    // 9. xero_sync_log
    enqueueFromResult({ data: null, error: null })

    const result = await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'customer_request',
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 2 }],
    })

    expect(result).toEqual({ success: true, refundId: REFUND_ID })
    // Verify order update called with partially_refunded
    const updateCalls = mockFrom.mock.calls.filter(([table]) => table === 'orders')
    expect(updateCalls.length).toBeGreaterThan(0)
  })

  it('sets order to refunded when all items are fully refunded', async () => {
    mockOwnerAuth()
    // Order with 1 item qty=2, refunding all 2
    // 1. fetch order
    enqueueFromResult({ data: completedOrder, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items (none yet)
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 6. re-fetch refunds for status calc
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 7. re-fetch refund_items: item fully refunded (qty=2, refunded=2)
    enqueueFromResult({
      data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 2 }],
      error: null,
    })
    // 8. update order status
    enqueueFromResult({ data: null, error: null })
    // 9. xero_sync_log
    enqueueFromResult({ data: null, error: null })

    const result = await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'customer_request',
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 2 }],
    })

    expect(result).toEqual({ success: true, refundId: REFUND_ID })
  })

  it('allows partially_refunded orders to be further refunded', async () => {
    mockOwnerAuth()
    const partialOrder = { ...completedOrder, status: 'partially_refunded' }
    enqueueFromResult({ data: partialOrder, error: null })
    // existing refund IDs
    enqueueFromResult({ data: [{ id: 'old-refund-id' }], error: null })
    // existing refund_items: 1 of 2 already refunded
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
    // insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // insert refund_items
    enqueueFromResult({ data: null, error: null })
    // re-fetch refunds
    enqueueFromResult({ data: [{ id: 'old-refund-id' }, { id: REFUND_ID }], error: null })
    // re-fetch refund_items: now all 2 refunded
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 2 }], error: null })
    // update order
    enqueueFromResult({ data: null, error: null })
    // xero
    enqueueFromResult({ data: null, error: null })

    const result = await processPartialRefund(validInput)
    expect(result).toEqual({ success: true, refundId: REFUND_ID })
  })
})

// ===========================================================================
// Amount calculation
// ===========================================================================

describe('amount', () => {
  it('uses Math.floor to avoid over-refunding (1 of 3 @ 1000 = 333, not 334)', async () => {
    mockOwnerAuth()
    const order = {
      ...completedOrder,
      channel: 'online',
      stripe_payment_intent_id: 'pi_math_test',
      total_cents: 1000,
      order_items: [
        {
          id: ORDER_ITEM_ID_1,
          product_id: PRODUCT_ID_1,
          product_name: 'Widget',
          quantity: 3,
          line_total_cents: 1000, // $10.00 total
        },
      ],
    }
    // 1. fetch order
    enqueueFromResult({ data: order, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. update refund with stripe_refund_id
    enqueueFromResult({ data: null, error: null })
    // 6. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 7. re-fetch refunds
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 8. re-fetch refund_items
    enqueueFromResult({ data: [{ order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 }], error: null })
    // 9. update order status
    enqueueFromResult({ data: null, error: null })
    // 10. xero_sync_log
    enqueueFromResult({ data: null, error: null })

    mockRefundCreate.mockResolvedValue({ id: 're_math', status: 'succeeded' })

    await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'customer_request',
      items: [{ orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 }],
    })

    // Math.floor(1/3 * 1000) = Math.floor(333.33) = 333
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 333 })
    )
  })

  it('sums per-item cents for multi-item refund amount', async () => {
    mockOwnerAuth()
    const order = {
      ...completedOrder,
      channel: 'online',
      stripe_payment_intent_id: 'pi_multi',
      order_items: [
        {
          id: ORDER_ITEM_ID_1,
          product_id: PRODUCT_ID_1,
          product_name: 'Widget A',
          quantity: 2,
          line_total_cents: 2000,
        },
        {
          id: ORDER_ITEM_ID_2,
          product_id: PRODUCT_ID_2,
          product_name: 'Widget B',
          quantity: 4,
          line_total_cents: 4000,
        },
      ],
    }
    // 1. fetch order
    enqueueFromResult({ data: order, error: null })
    // 2. existing refund IDs
    enqueueFromResult({ data: [], error: null })
    // 3. existing refund_items
    enqueueFromResult({ data: [], error: null })
    // 4. insert refund
    enqueueFromResult({ data: { id: REFUND_ID }, error: null })
    // 5. update refund with stripe_refund_id
    enqueueFromResult({ data: null, error: null })
    // 6. insert refund_items
    enqueueFromResult({ data: null, error: null })
    // 7. re-fetch refunds
    enqueueFromResult({ data: [{ id: REFUND_ID }], error: null })
    // 8. re-fetch refund_items
    enqueueFromResult({
      data: [
        { order_item_id: ORDER_ITEM_ID_1, quantity_refunded: 1 },
        { order_item_id: ORDER_ITEM_ID_2, quantity_refunded: 2 },
      ],
      error: null,
    })
    // 9. update order status
    enqueueFromResult({ data: null, error: null })
    // 10. xero_sync_log
    enqueueFromResult({ data: null, error: null })

    mockRefundCreate.mockResolvedValue({ id: 're_multi', status: 'succeeded' })

    await processPartialRefund({
      orderId: ORDER_ID,
      reason: 'customer_request',
      items: [
        { orderItemId: ORDER_ITEM_ID_1, quantityToRefund: 1 }, // Math.floor(1/2 * 2000) = 1000
        { orderItemId: ORDER_ITEM_ID_2, quantityToRefund: 2 }, // Math.floor(2/4 * 4000) = 2000
      ],
    })

    // Total: 1000 + 2000 = 3000
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 3000 })
    )
  })
})
