import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Hoisted mocks (avoid temporal dead zone with vi.mock hoisting) ----
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

import { saveStoreNameStep } from './saveStoreNameStep'

const STORE_ID = '00000000-0000-4000-a000-000000000001'
const STAFF_ID = 'user-uuid-123'

function makeSupabaseMock({
  selectData = { setup_completed_steps: 0 },
  updateError = null,
}: {
  selectData?: { setup_completed_steps: number } | null
  updateError?: { message: string } | null
} = {}) {
  // SELECT chain: from('stores').select('setup_completed_steps').eq('id', ...).single()
  const mockSingle = vi.fn().mockResolvedValue({ data: selectData, error: null })
  const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq })

  // UPDATE chain: from('stores').update({...}).eq('id', ...)
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: updateError })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      return { select: mockSelect }
    }
    return { update: mockUpdate }
  })

  mockCreateSupabaseServerClient.mockResolvedValue({ from: mockFrom })

  return { mockUpdate, mockUpdateEq }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveStoreNameStep', () => {
  it('returns Unauthorized when not authenticated', async () => {
    mockResolveAuth.mockResolvedValue(null)

    const result = await saveStoreNameStep({ storeName: 'My Store' })
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error for empty name', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveStoreNameStep({ storeName: '' })
    expect(result).toHaveProperty('error')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error for name exceeding 100 chars', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveStoreNameStep({ storeName: 'a'.repeat(101) })
    expect(result).toHaveProperty('error')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('saves store name and sets bit 0 of setup_completed_steps', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    const { mockUpdate } = makeSupabaseMock({ selectData: { setup_completed_steps: 4 } })

    const result = await saveStoreNameStep({ storeName: 'My Awesome Store' })
    expect(result).toEqual({ success: true })

    // bit 0 OR'd: 4 | 1 = 5
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Awesome Store',
        setup_completed_steps: 5,
      })
    )
  })

  it('handles exactly 100 char name (boundary)', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveStoreNameStep({ storeName: 'a'.repeat(100) })
    expect(result).toEqual({ success: true })
  })

  it('returns error when DB update fails', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock({ updateError: { message: 'DB error' } })

    const result = await saveStoreNameStep({ storeName: 'Store Name' })
    expect(result).toHaveProperty('error')
  })
})
