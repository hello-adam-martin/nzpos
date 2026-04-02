import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

// Mock next/headers (required by resolveAuth -> cookies())
const mockGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}))

// Mock jose jwtVerify
const mockJwtVerify = vi.fn()
vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}))

// Mock resolveStaffAuth
const mockResolveStaffAuth = vi.fn()
vi.mock('@/lib/resolveAuth', () => ({
  resolveStaffAuth: () => mockResolveStaffAuth(),
}))

// Mock Supabase admin client with chainable query builder
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockGt = vi.fn()
const mockOrder = vi.fn()

function resetChain() {
  const terminal = vi.fn()
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ eq: mockEq, in: mockIn })
  mockIn.mockReturnValue({ gt: mockGt })
  mockGt.mockReturnValue({ order: mockOrder })
  mockOrder.mockReturnValue(terminal())
  return terminal
}

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  }),
}))

// Mock NextRequest
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { GET } from '../new-orders/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(since?: string) {
  const url = since
    ? `http://localhost/api/pos/new-orders?since=${encodeURIComponent(since)}`
    : 'http://localhost/api/pos/new-orders'
  return new NextRequest(url)
}

const validStaff = { store_id: 'store-123', staff_id: 'staff-456', role: 'staff' }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/pos/new-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockResolveStaffAuth.mockResolvedValue(null)

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns orders with id, totalCents, createdAt fields', async () => {
    mockResolveStaffAuth.mockResolvedValue(validStaff)

    const fakeOrders = [
      { id: 'order-1', total_cents: 2500, created_at: '2026-04-02T10:00:00Z' },
      { id: 'order-2', total_cents: 4999, created_at: '2026-04-02T09:30:00Z' },
    ]

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: fakeOrders, error: null }),
            }),
          }),
        }),
      }),
    })

    const req = makeRequest('2026-04-02T09:00:00Z')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orders).toHaveLength(2)
    expect(body.orders[0]).toMatchObject({
      id: 'order-1',
      totalCents: 2500,
      createdAt: '2026-04-02T10:00:00Z',
    })
    expect(body.orders[1]).toMatchObject({
      id: 'order-2',
      totalCents: 4999,
      createdAt: '2026-04-02T09:30:00Z',
    })
  })

  it('filters by channel = online and status in (pending_pickup, ready)', async () => {
    mockResolveStaffAuth.mockResolvedValue(validStaff)

    const mockEqFn = vi.fn()
    const mockInFn = vi.fn()
    const mockGtFn = vi.fn()
    const mockOrderFn = vi.fn().mockResolvedValue({ data: [], error: null })

    mockInFn.mockReturnValue({ gt: mockGtFn })
    mockGtFn.mockReturnValue({ order: mockOrderFn })
    mockEqFn.mockImplementation((_col: string, _val: string) => ({
      eq: mockEqFn,
      in: mockInFn,
    }))

    mockSelect.mockReturnValue({ eq: mockEqFn })

    const req = makeRequest()
    await GET(req)

    // Verify channel filter
    expect(mockEqFn).toHaveBeenCalledWith('channel', 'online')
    // Verify status filter
    expect(mockInFn).toHaveBeenCalledWith('status', ['pending_pickup', 'ready'])
  })

  it('uses since query param for gt filter', async () => {
    mockResolveStaffAuth.mockResolvedValue(validStaff)

    const since = '2026-04-01T00:00:00Z'
    let capturedSince: string | undefined

    const mockGtFn = vi.fn().mockImplementation((col: string, val: string) => {
      if (col === 'created_at') capturedSince = val
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            gt: mockGtFn,
          }),
        }),
      }),
    })

    const req = makeRequest(since)
    await GET(req)

    expect(capturedSince).toBe(since)
  })

  it('returns serverTime ISO string', async () => {
    mockResolveStaffAuth.mockResolvedValue(validStaff)

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })

    const req = makeRequest()
    const res = await GET(req)
    const body = await res.json()

    expect(body.serverTime).toBeDefined()
    expect(() => new Date(body.serverTime)).not.toThrow()
    expect(new Date(body.serverTime).toISOString()).toBe(body.serverTime)
  })

  it('returns empty array and serverTime on Supabase error (graceful degradation)', async () => {
    mockResolveStaffAuth.mockResolvedValue(validStaff)

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      }),
    })

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orders).toEqual([])
    expect(body.serverTime).toBeDefined()
  })
})
