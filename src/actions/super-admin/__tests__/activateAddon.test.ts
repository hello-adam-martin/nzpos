import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Hoisted mocks ----
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

import { activateAddon } from '../activateAddon'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value)
  }
  return fd
}

const VALID_STORE_ID = 'a0000000-0000-0000-0000-000000000001'
const SUPER_ADMIN_USER_ID = 'b0000000-0000-0000-0000-000000000002'

function setupAdminClient(storePlanData: Record<string, unknown>) {
  mockSingle.mockResolvedValue({ data: storePlanData, error: null })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockInsert.mockResolvedValue({ error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'store_plans') {
      return { select: mockSelect, update: mockUpdate }
    }
    if (table === 'super_admin_actions') {
      return { insert: mockInsert }
    }
    return {}
  })
  mockCreateSupabaseAdminClient.mockReturnValue({ from: mockFrom })
}

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

  // Default: addon is inactive (not Stripe-managed)
  setupAdminClient({
    has_xero: false,
    has_xero_manual_override: false,
    has_email_notifications: false,
    has_email_notifications_manual_override: false,
    has_custom_domain: false,
    has_custom_domain_manual_override: false,
  })
})

describe('activateAddon', () => {
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
    const fd = makeFormData({ storeId: VALID_STORE_ID, feature: 'xero' })
    const result = await activateAddon(fd)
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns Already active via Stripe when has_xero=true and manual_override=false', async () => {
    setupAdminClient({
      has_xero: true,
      has_xero_manual_override: false,
    })
    const fd = makeFormData({ storeId: VALID_STORE_ID, feature: 'xero' })
    const result = await activateAddon(fd)
    expect(result).toEqual({ error: 'Already active via Stripe subscription' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns success and sets has_xero=true + has_xero_manual_override=true when addon was inactive', async () => {
    setupAdminClient({
      has_xero: false,
      has_xero_manual_override: false,
    })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'store_plans') {
        return { select: mockSelect, update: mockUpdateFn }
      }
      if (table === 'super_admin_actions') {
        return { insert: mockInsert }
      }
      return {}
    })

    const fd = makeFormData({ storeId: VALID_STORE_ID, feature: 'xero' })
    const result = await activateAddon(fd)

    expect(result).toEqual({ success: true })
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        has_xero: true,
        has_xero_manual_override: true,
      })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('store_id', VALID_STORE_ID)
  })

  it('inserts into super_admin_actions with action=activate_addon', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'store_plans') {
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

    const fd = makeFormData({ storeId: VALID_STORE_ID, feature: 'xero' })
    await activateAddon(fd)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        super_admin_user_id: SUPER_ADMIN_USER_ID,
        action: 'activate_addon',
        store_id: VALID_STORE_ID,
        note: 'xero',
      })
    )
  })
})
