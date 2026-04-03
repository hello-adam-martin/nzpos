import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockResolveAuth,
  mockFrom,
  mockUpdate,
  mockEq,
  mockCreateSupabaseServerClient,
} = vi.hoisted(() => {
  const mockEq = vi.fn()
  const mockUpdate = vi.fn()
  const mockFrom = vi.fn()
  const mockResolveAuth = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  return {
    mockResolveAuth,
    mockFrom,
    mockUpdate,
    mockEq,
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

import { dismissWizard } from './dismissWizard'

const STORE_ID = '00000000-0000-4000-a000-000000000001'
const STAFF_ID = 'user-uuid-123'

function makeSupabaseMock({ updateError = null }: { updateError?: { message: string } | null } = {}) {
  mockEq.mockResolvedValue({ error: updateError })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
  mockCreateSupabaseServerClient.mockResolvedValue({ from: mockFrom })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dismissWizard', () => {
  it('returns Unauthorized when not authenticated', async () => {
    mockResolveAuth.mockResolvedValue(null)
    makeSupabaseMock()

    const result = await dismissWizard()
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('sets setup_wizard_dismissed = true and returns success', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock()

    const result = await dismissWizard()
    expect(result).toEqual({ success: true })

    expect(mockUpdate).toHaveBeenCalledWith({ setup_wizard_dismissed: true })
    expect(mockEq).toHaveBeenCalledWith('id', STORE_ID)
  })

  it('returns error when DB update fails', async () => {
    mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
    makeSupabaseMock({ updateError: { message: 'DB error' } })

    const result = await dismissWizard()
    expect(result).toHaveProperty('error')
  })
})
