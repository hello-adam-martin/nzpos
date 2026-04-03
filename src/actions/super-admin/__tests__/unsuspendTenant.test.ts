import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Hoisted mocks ----
const {
  mockGetUser,
  mockCreateSupabaseServerClient,
  mockFrom,
  mockUpdate,
  mockInsert,
  mockCreateSupabaseAdminClient,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockFrom = vi.fn()
  const mockCreateSupabaseAdminClient = vi.fn()
  const mockRevalidatePath = vi.fn()
  return {
    mockGetUser,
    mockCreateSupabaseServerClient,
    mockFrom,
    mockUpdate,
    mockInsert,
    mockCreateSupabaseAdminClient,
    mockRevalidatePath,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { unsuspendTenant } from '../unsuspendTenant'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value)
  }
  return fd
}

const VALID_STORE_ID = 'a0000000-0000-0000-0000-000000000001'
const SUPER_ADMIN_USER_ID = 'b0000000-0000-0000-0000-000000000002'

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

  // Default: admin client
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockInsert.mockResolvedValue({ error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'stores') {
      return { update: mockUpdate }
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

describe('unsuspendTenant', () => {
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
    const fd = makeFormData({ storeId: VALID_STORE_ID })
    const result = await unsuspendTenant(fd)
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns success and updates stores with is_active=true, suspended_at=null, suspension_reason=null', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return { update: mockUpdateFn }
      }
      if (table === 'super_admin_actions') {
        return { insert: mockInsert }
      }
      return {}
    })

    const fd = makeFormData({ storeId: VALID_STORE_ID })
    const result = await unsuspendTenant(fd)

    expect(result).toEqual({ success: true })
    expect(mockUpdateFn).toHaveBeenCalledWith({
      is_active: true,
      suspended_at: null,
      suspension_reason: null,
    })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', VALID_STORE_ID)
  })

  it('inserts into super_admin_actions with action=unsuspend', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return { update: vi.fn().mockReturnValue({ eq: mockUpdateEq }) }
      }
      if (table === 'super_admin_actions') {
        return { insert: mockInsert }
      }
      return {}
    })

    const fd = makeFormData({ storeId: VALID_STORE_ID, reason: 'Issue resolved' })
    await unsuspendTenant(fd)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        super_admin_user_id: SUPER_ADMIN_USER_ID,
        action: 'unsuspend',
        store_id: VALID_STORE_ID,
      })
    )
  })
})
