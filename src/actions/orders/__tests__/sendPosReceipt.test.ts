import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/headers
const mockGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}))

// Mock jose jwtVerify
const mockJwtVerify = vi.fn()
vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}))

// Mock sendEmail
const mockSendEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// Mock PosReceiptEmail
vi.mock('@/emails/PosReceiptEmail', () => ({
  PosReceiptEmail: (props: unknown) => props,
}))

// ---------------------------------------------------------------------------
// Supabase admin mock with chainable query builder
// ---------------------------------------------------------------------------

type ChainResult = { data: unknown; error: unknown }

function buildChain(resultFn: () => Promise<ChainResult>) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.single = vi.fn(resultFn)
  chain.update = vi.fn(self)
  return chain
}

// We track sequential `from` calls
const mockFromSequence: Array<() => Promise<ChainResult>> = []
let fromCallIdx = 0

const mockFrom = vi.fn((_table: string) => {
  const resultFn = mockFromSequence[fromCallIdx++] ?? (() => Promise.resolve({ data: null, error: null }))
  return buildChain(resultFn)
})

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => mockFrom(table),
  }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { sendPosReceipt } from '../sendPosReceipt'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ORDER_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const VALID_EMAIL = 'customer@example.com'
const STORE_ID = 'store-uuid-1234'

function mockStaffAuth() {
  mockGet.mockReturnValue({ value: 'valid-staff-token' })
  mockJwtVerify.mockResolvedValue({
    payload: { store_id: STORE_ID, staff_id: 'staff-1', role: 'staff' },
  })
}

function mockNoAuth() {
  mockGet.mockReturnValue(undefined)
}

const sampleReceipt = {
  orderId: VALID_ORDER_ID,
  storeName: 'Test Store',
  storeAddress: '1 Main St',
  storePhone: '09 000 0000',
  gstNumber: '123-456-789',
  completedAt: new Date().toISOString(),
  staffName: 'Alice',
  items: [],
  subtotalCents: 1000,
  gstCents: 130,
  totalCents: 1000,
  paymentMethod: 'eftpos' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  fromCallIdx = 0
  mockFromSequence.length = 0
  mockSendEmail.mockResolvedValue({ success: true })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendPosReceipt', () => {
  it('returns error when not authenticated', async () => {
    mockNoAuth()

    const result = await sendPosReceipt({ orderId: VALID_ORDER_ID, email: VALID_EMAIL })

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when input is invalid (missing email)', async () => {
    mockStaffAuth()

    const result = await sendPosReceipt({ orderId: VALID_ORDER_ID })

    expect(result).toEqual({ error: 'Invalid input' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when input is invalid (bad email format)', async () => {
    mockStaffAuth()

    const result = await sendPosReceipt({ orderId: VALID_ORDER_ID, email: 'not-an-email' })

    expect(result).toEqual({ error: 'Invalid input' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when order is not found', async () => {
    mockStaffAuth()
    // First from call: orders.select — returns not found
    mockFromSequence.push(() => Promise.resolve({ data: null, error: { message: 'not found' } }))

    const result = await sendPosReceipt({ orderId: VALID_ORDER_ID, email: VALID_EMAIL })

    expect(result).toEqual({ error: 'Order not found' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when order has no receipt_data', async () => {
    mockStaffAuth()
    // First from call: orders.select — order exists but no receipt_data
    mockFromSequence.push(() =>
      Promise.resolve({ data: { id: VALID_ORDER_ID, receipt_data: null, store_id: STORE_ID }, error: null })
    )

    const result = await sendPosReceipt({ orderId: VALID_ORDER_ID, email: VALID_EMAIL })

    expect(result).toEqual({ error: 'No receipt data available' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('calls sendEmail with correct to address and subject when order has receipt_data', async () => {
    mockStaffAuth()
    // First from call: orders.select — returns order with receipt_data
    mockFromSequence.push(() =>
      Promise.resolve({
        data: { id: VALID_ORDER_ID, receipt_data: sampleReceipt, store_id: STORE_ID },
        error: null,
      })
    )
    // Second from call: orders.update (customer_email) — returns success
    mockFromSequence.push(() => Promise.resolve({ data: null, error: null }))

    const result = await sendPosReceipt({ orderId: VALID_ORDER_ID, email: VALID_EMAIL })

    expect(result).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const callArgs = mockSendEmail.mock.calls[0][0]
    expect(callArgs.to).toBe(VALID_EMAIL)
    expect(callArgs.subject).toContain('Test Store')
  })

  it('updates customer_email on the order when sending receipt', async () => {
    mockStaffAuth()
    mockFromSequence.push(() =>
      Promise.resolve({
        data: { id: VALID_ORDER_ID, receipt_data: sampleReceipt, store_id: STORE_ID },
        error: null,
      })
    )
    mockFromSequence.push(() => Promise.resolve({ data: null, error: null }))

    await sendPosReceipt({ orderId: VALID_ORDER_ID, email: VALID_EMAIL })

    // Verify mockFrom was called at least twice (select + update)
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })
})
