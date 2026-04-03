import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Hoisted mocks (avoid temporal dead zone with vi.mock hoisting) ----
const {
  mockGetUser,
  mockCreateSupabaseServerClient,
  mockFrom,
  mockSelect,
  mockEq,
  mockSingle,
  mockUpdate,
  mockInsert,
  mockCreateSupabaseAdminClient,
  mockInvalidateCachedStoreId,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockFrom = vi.fn()
  const mockCreateSupabaseAdminClient = vi.fn()
  const mockInvalidateCachedStoreId = vi.fn()
  const mockRevalidatePath = vi.fn()
  return {
    mockGetUser,
    mockCreateSupabaseServerClient,
    mockFrom,
    mockSelect,
    mockEq,
    mockSingle,
    mockUpdate,
    mockInsert,
    mockCreateSupabaseAdminClient,
    mockInvalidateCachedStoreId,
    mockRevalidatePath,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient,
}))

vi.mock('@/lib/tenantCache', () => ({
  invalidateCachedStoreId: mockInvalidateCachedStoreId,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { suspendTenant } from '../suspendTenant'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value)
  }
  return fd
}

const VALID_STORE_ID = 'a0000000-0000-0000-0000-000000000001'
const SUPER_ADMIN_USER_ID = 'b0000000-0000-0000-0000-000000000002'
const STORE_SLUG = 'test-store'

beforeEach(() => {
  vi.clearAllMocks()

  // Default: super admin auth
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: SUPER_ADMIN_USER_ID,
        app_metadata: { is_super_admin: true },
      },
    },
    error: null,
  })
  mockCreateSupabaseServerClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
  })

  // Default: admin client from chain
  mockSingle.mockResolvedValue({ data: { slug: STORE_SLUG }, error: null })
  mockEq.mockReturnValue({ single: mockSingle, error: null })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockResolvedValue({ error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'stores') {
      return {
        select: mockSelect,
        update: mockUpdate,
      }
    }
    if (table === 'super_admin_actions') {
      return { insert: mockInsert }
    }
    return {}
  })
  mockCreateSupabaseAdminClient.mockReturnValue({
    from: mockFrom,
  })
})

describe('suspendTenant', () => {
  it('returns Unauthorized when user is not super admin', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'other-user',
          app_metadata: { is_super_admin: false },
        },
      },
      error: null,
    })
    const fd = makeFormData({ storeId: VALID_STORE_ID, reason: 'Violation of ToS' })
    const result = await suspendTenant(fd)
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns Invalid input when storeId is not a UUID', async () => {
    const fd = makeFormData({ storeId: 'not-a-uuid', reason: 'Violation of ToS' })
    const result = await suspendTenant(fd)
    expect(result).toEqual({ error: 'Invalid input' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns Invalid input when reason is empty', async () => {
    const fd = makeFormData({ storeId: VALID_STORE_ID, reason: '' })
    const result = await suspendTenant(fd)
    expect(result).toEqual({ error: 'Invalid input' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns success and updates stores with is_active=false, suspended_at, suspension_reason', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return { select: mockSelect, update: mockUpdateFn }
      }
      if (table === 'super_admin_actions') {
        return { insert: mockInsert }
      }
      return {}
    })

    const fd = makeFormData({ storeId: VALID_STORE_ID, reason: 'Violation of ToS' })
    const result = await suspendTenant(fd)

    expect(result).toEqual({ success: true })
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        suspension_reason: 'Violation of ToS',
      })
    )
    // suspended_at should be set (ISO timestamp)
    const updateCall = mockUpdateFn.mock.calls[0][0]
    expect(updateCall.suspended_at).toBeDefined()
    expect(mockUpdateEq).toHaveBeenCalledWith('id', VALID_STORE_ID)
  })

  it('inserts into super_admin_actions with action=suspend', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return {
          select: mockSelect,
          update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
        }
      }
      if (table === 'super_admin_actions') {
        return { insert: mockInsert }
      }
      return {}
    })

    const fd = makeFormData({ storeId: VALID_STORE_ID, reason: 'Fraud detected' })
    await suspendTenant(fd)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        super_admin_user_id: SUPER_ADMIN_USER_ID,
        action: 'suspend',
        store_id: VALID_STORE_ID,
        note: 'Fraud detected',
      })
    )
  })

  it('calls invalidateCachedStoreId with the store slug', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return {
          select: mockSelect,
          update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
        }
      }
      if (table === 'super_admin_actions') {
        return { insert: mockInsert }
      }
      return {}
    })

    const fd = makeFormData({ storeId: VALID_STORE_ID, reason: 'Violation of ToS' })
    await suspendTenant(fd)

    expect(mockInvalidateCachedStoreId).toHaveBeenCalledWith(STORE_SLUG)
  })
})
