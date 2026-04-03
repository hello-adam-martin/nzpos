import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Hoisted mocks (avoid temporal dead zone with vi.mock hoisting) ----
const {
  mockCreateSupabaseServerClient,
  mockCreateSupabaseAdminClient,
} = vi.hoisted(() => {
  const mockCreateSupabaseServerClient = vi.fn()
  const mockCreateSupabaseAdminClient = vi.fn()
  return {
    mockCreateSupabaseServerClient,
    mockCreateSupabaseAdminClient,
  }
})

// Mock server-only to no-op so it doesn't throw in test environment
vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient,
}))

import { requireFeature } from '@/lib/requireFeature'

// Helper to create a mock Supabase server client with a user
function makeServerClient(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

// Helper to create a mock admin client for DB fallback
function makeAdminClient(planRow: Record<string, boolean> | null) {
  const single = vi.fn().mockResolvedValue({ data: planRow, error: null })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireFeature (JWT fast path)', () => {
  it('Test 1: returns { authorized: true } when user.app_metadata.xero is true', async () => {
    const user = {
      id: 'user-123',
      app_metadata: { store_id: 'store-abc', xero: true },
    }
    mockCreateSupabaseServerClient.mockResolvedValue(makeServerClient(user))

    const result = await requireFeature('xero')
    expect(result).toEqual({ authorized: true })
  })

  it('Test 2: returns { authorized: false, feature, upgradeUrl } when xero claim is false', async () => {
    const user = {
      id: 'user-123',
      app_metadata: { store_id: 'store-abc', xero: false },
    }
    mockCreateSupabaseServerClient.mockResolvedValue(makeServerClient(user))

    const result = await requireFeature('xero')
    expect(result).toEqual({
      authorized: false,
      feature: 'xero',
      upgradeUrl: '/admin/billing?upgrade=xero',
    })
  })

  it('Test 3: returns correct upgradeUrl for email_notifications feature', async () => {
    const user = {
      id: 'user-123',
      app_metadata: { store_id: 'store-abc', email_notifications: false },
    }
    mockCreateSupabaseServerClient.mockResolvedValue(makeServerClient(user))

    const result = await requireFeature('email_notifications')
    expect(result).toEqual({
      authorized: false,
      feature: 'email_notifications',
      upgradeUrl: '/admin/billing?upgrade=email_notifications',
    })
  })

  it('Test 5: returns authorized: false when user has no store_id in app_metadata', async () => {
    const user = {
      id: 'user-123',
      app_metadata: { xero: true }, // no store_id
    }
    mockCreateSupabaseServerClient.mockResolvedValue(makeServerClient(user))

    const result = await requireFeature('xero')
    expect(result).toEqual({
      authorized: false,
      feature: 'xero',
      upgradeUrl: '/admin/billing?upgrade=xero',
    })
  })
})

describe('requireFeature (DB fallback)', () => {
  it('Test 4: requireDbCheck=true queries store_plans DB and returns authorized: true when has_xero is true', async () => {
    const user = {
      id: 'user-123',
      app_metadata: { store_id: 'store-abc', xero: false }, // JWT says false
    }
    mockCreateSupabaseServerClient.mockResolvedValue(makeServerClient(user))
    // DB says true
    mockCreateSupabaseAdminClient.mockReturnValue(
      makeAdminClient({ has_xero: true })
    )

    const result = await requireFeature('xero', { requireDbCheck: true })
    expect(result).toEqual({ authorized: true })
  })
})
