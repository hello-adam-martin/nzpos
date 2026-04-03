import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockResolveAuth,
  mockFrom,
  mockCreateSupabaseServerClient,
} = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockResolveAuth = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  return {
    mockResolveAuth,
    mockFrom,
    mockCreateSupabaseServerClient,
  }
})

vi.mock('@/lib/resolveAuth', () => ({
  resolveAuth: mockResolveAuth,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('server-only', () => ({}))

import { saveProductStep } from './saveProductStep'

const STORE_ID = '00000000-0000-4000-a000-000000000001'
const STAFF_ID = 'user-uuid-123'

function makeSupabaseMock({
  selectData = { setup_completed_steps: 0 },
  updateError = null,
  insertError = null,
}: {
  selectData?: { setup_completed_steps: number } | null
  updateError?: { message: string } | null
  insertError?: { message: string } | null
} = {}) {
  // Products insert chain: from('products').insert({...})
  const mockInsert = vi.fn().mockResolvedValue({ error: insertError })

  // Stores SELECT chain: from('stores').select(...).eq(...).single()
  const mockSingle = vi.fn().mockResolvedValue({ data: selectData, error: null })
  const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq })

  // Stores UPDATE chain: from('stores').update({...}).eq(...)
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: updateError })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

  // Track stores call count separately from products calls
  let storesCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'products') {
      return { insert: mockInsert }
    }
    // stores table
    storesCallCount++
    if (storesCallCount === 1) {
      return { select: mockSelect }
    }
    return { update: mockUpdate }
  })

  mockCreateSupabaseServerClient.mockResolvedValue({ from: mockFrom })

  return { mockInsert, mockUpdate, mockUpdateEq }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveProductStep', () => {
  it('returns Unauthorized when not authenticated', async () => {
    mockResolveAuth.mockResolvedValue(null)

    const result = await saveProductStep({})
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('sets bit 2 and returns success when no fields provided (full skip)', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    const { mockInsert, mockUpdate } = makeSupabaseMock()

    const result = await saveProductStep({})
    expect(result).toEqual({ success: true })

    // No product insert
    expect(mockInsert).not.toHaveBeenCalled()
    // setup_completed_steps gets bit 2
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        setup_completed_steps: 4, // 0 | 4
      })
    )
  })

  it('creates product and sets bit 2 when name provided', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    const { mockInsert, mockUpdate } = makeSupabaseMock({ selectData: { setup_completed_steps: 3 } })

    const result = await saveProductStep({
      name: 'Surface Spray',
      priceCents: 899,
    })
    expect(result).toEqual({ success: true })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Surface Spray',
        price_cents: 899,
        store_id: STORE_ID,
        is_active: true,
        stock_quantity: 0,
      })
    )
    // bit 2 OR'd: 3 | 4 = 7
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        setup_completed_steps: 7,
      })
    )
  })

  it('returns error for invalid priceCents (negative)', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveProductStep({ name: 'Test', priceCents: -1 })
    expect(result).toHaveProperty('error')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error for name exceeding 200 chars', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveProductStep({ name: 'a'.repeat(201) })
    expect(result).toHaveProperty('error')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error when product insert fails', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock({ insertError: { message: 'DB error' } })

    const result = await saveProductStep({ name: 'Test Product' })
    expect(result).toHaveProperty('error')
  })
})
