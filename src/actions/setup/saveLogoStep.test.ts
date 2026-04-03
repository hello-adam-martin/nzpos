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

import { saveLogoStep } from './saveLogoStep'

const STORE_ID = '00000000-0000-4000-a000-000000000001'
const STAFF_ID = 'user-uuid-123'

function makeSupabaseMock({
  selectData = { setup_completed_steps: 0 },
  updateError = null,
}: {
  selectData?: { setup_completed_steps: number } | null
  updateError?: { message: string } | null
} = {}) {
  // SELECT chain: from('stores').select(...).eq(...).single()
  const mockSingle = vi.fn().mockResolvedValue({ data: selectData, error: null })
  const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq })

  // UPDATE chain: from('stores').update({...}).eq(...)
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

describe('saveLogoStep', () => {
  it('returns Unauthorized when not authenticated', async () => {
    mockResolveAuth.mockResolvedValue(null)

    const result = await saveLogoStep({ logoUrl: null, primaryColor: null })
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error for invalid URL', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveLogoStep({ logoUrl: 'not-a-url', primaryColor: null })
    expect(result).toHaveProperty('error')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error for invalid hex color', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await saveLogoStep({
      logoUrl: null,
      primaryColor: 'red',
    })
    expect(result).toHaveProperty('error')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('saves logo URL and primary color and sets bit 1', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    const { mockUpdate } = makeSupabaseMock({ selectData: { setup_completed_steps: 1 } })

    const result = await saveLogoStep({
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#1E293B',
    })
    expect(result).toEqual({ success: true })

    // bit 1 OR'd: 1 | 2 = 3
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        logo_url: 'https://example.com/logo.png',
        primary_color: '#1E293B',
        setup_completed_steps: 3,
      })
    )
  })

  it('accepts null logoUrl and null primaryColor (skip case)', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    const { mockUpdate } = makeSupabaseMock()

    const result = await saveLogoStep({ logoUrl: null, primaryColor: null })
    expect(result).toEqual({ success: true })
    // Still sets bit 1
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        setup_completed_steps: 2, // 0 | 2
      })
    )
  })

  it('returns error when DB update fails', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock({ updateError: { message: 'DB error' } })

    const result = await saveLogoStep({ logoUrl: null, primaryColor: null })
    expect(result).toHaveProperty('error')
  })
})
