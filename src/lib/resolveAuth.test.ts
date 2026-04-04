import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before vi.mock factories reference them
// ---------------------------------------------------------------------------
const {
  mockGetUser,
  mockHeadersGet,
  mockCookiesGet,
  mockJwtVerify,
  mockAdminFrom,
} = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockHeadersGet: vi.fn(),
    mockCookiesGet: vi.fn(),
    mockJwtVerify: vi.fn(),
    mockAdminFrom: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: mockHeadersGet }),
  cookies: () => Promise.resolve({ get: mockCookiesGet }),
}))

vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => Promise.resolve({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: mockAdminFrom }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { resolveAuth, resolveStaffAuth, resolveStaffAuthVerified } from './resolveAuth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeOwnerUser(storeId = 'store-abc', userId = 'user-123') {
  return {
    data: {
      user: {
        id: userId,
        app_metadata: { store_id: storeId, role: 'owner' },
      },
    },
  }
}

function makeNoUser() {
  return { data: { user: null } }
}

function makeStaffToken(payload: { store_id: string; staff_id: string; role: string }) {
  return {
    get: (name: string) => (name === 'staff_session' ? { value: 'staff-jwt-token' } : undefined),
  }
}

// ---------------------------------------------------------------------------
// Tests: resolveAuth
// ---------------------------------------------------------------------------

describe('resolveAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue(null) // No x-store-id by default
  })

  it('returns { store_id, staff_id } when owner has valid Supabase session', async () => {
    mockGetUser.mockResolvedValue(makeOwnerUser('store-abc', 'user-123'))

    const result = await resolveAuth()

    expect(result).toEqual({
      store_id: 'store-abc',
      staff_id: 'user-123',
    })
  })

  it('uses x-store-id header over JWT store_id for owner auth', async () => {
    mockGetUser.mockResolvedValue(makeOwnerUser('store-from-jwt', 'user-123'))
    mockHeadersGet.mockReturnValue('store-from-header')

    const result = await resolveAuth()

    expect(result).toEqual({
      store_id: 'store-from-header',
      staff_id: 'user-123',
    })
  })

  it('falls back to staff JWT when no owner Supabase session', async () => {
    mockGetUser.mockResolvedValue(makeNoUser())
    mockCookiesGet.mockReturnValue({ value: 'staff-jwt-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-staff', staff_id: 'staff-456', role: 'cashier' },
    })

    const result = await resolveAuth()

    expect(result).toEqual({
      store_id: 'store-staff',
      staff_id: 'staff-456',
      role: 'cashier',
    })
  })

  it('returns null when no owner session and no staff cookie', async () => {
    mockGetUser.mockResolvedValue(makeNoUser())
    mockCookiesGet.mockReturnValue(undefined)

    const result = await resolveAuth()

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests: resolveStaffAuth
// ---------------------------------------------------------------------------

describe('resolveStaffAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue(null)
  })

  it('returns { store_id, staff_id, role } for valid staff JWT cookie', async () => {
    mockCookiesGet.mockReturnValue({ value: 'staff-jwt-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-xyz', staff_id: 'staff-789', role: 'manager' },
    })

    const result = await resolveStaffAuth()

    expect(result).toEqual({
      store_id: 'store-xyz',
      staff_id: 'staff-789',
      role: 'manager',
    })
  })

  it('returns null when staff_session cookie is absent', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const result = await resolveStaffAuth()

    expect(result).toBeNull()
  })

  it('returns null when staff JWT is expired or invalid', async () => {
    mockCookiesGet.mockReturnValue({ value: 'bad-jwt-token' })
    mockJwtVerify.mockRejectedValue(new Error('JWTExpired'))

    const result = await resolveStaffAuth()

    expect(result).toBeNull()
  })

  it('uses x-store-id header over JWT store_id for staff auth', async () => {
    mockCookiesGet.mockReturnValue({ value: 'staff-jwt-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-from-jwt', staff_id: 'staff-789', role: 'cashier' },
    })
    mockHeadersGet.mockReturnValue('store-from-header')

    const result = await resolveStaffAuth()

    expect(result).toEqual({
      store_id: 'store-from-header',
      staff_id: 'staff-789',
      role: 'cashier',
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: resolveStaffAuthVerified
// ---------------------------------------------------------------------------

// Helper: build a mock Supabase admin query chain returning staffData
function buildAdminQueryChain(staffData: { role: string; is_active: boolean } | null) {
  const single = vi.fn().mockResolvedValue({ data: staffData, error: null })
  const eq2 = vi.fn().mockReturnValue({ single })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  mockAdminFrom.mockReturnValue({ select })
}

describe('resolveStaffAuthVerified', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue(null)
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('returns null when resolveStaffAuth returns null (no cookie)', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const result = await resolveStaffAuthVerified()

    expect(result).toBeNull()
  })

  it('returns null when staff JWT is invalid', async () => {
    mockCookiesGet.mockReturnValue({ value: 'bad-token' })
    mockJwtVerify.mockRejectedValue(new Error('JWTInvalid'))

    const result = await resolveStaffAuthVerified()

    expect(result).toBeNull()
  })

  it('returns null when staff is_active is false (deactivated)', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-123', staff_id: 'staff-456', role: 'staff' },
    })
    buildAdminQueryChain({ role: 'staff', is_active: false })

    const result = await resolveStaffAuthVerified()

    expect(result).toBeNull()
  })

  it('returns null when DB query returns no rows (staff deleted)', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-123', staff_id: 'staff-456', role: 'staff' },
    })
    buildAdminQueryChain(null)

    const result = await resolveStaffAuthVerified()

    expect(result).toBeNull()
  })

  it('returns { store_id, staff_id, role } when staff is active', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-abc', staff_id: 'staff-xyz', role: 'staff' },
    })
    buildAdminQueryChain({ role: 'manager', is_active: true })

    const result = await resolveStaffAuthVerified()

    expect(result).toEqual({
      store_id: 'store-abc',
      staff_id: 'staff-xyz',
      role: 'manager',
    })
  })

  it('returns DB role, not JWT role (DB is source of truth for role-gated writes)', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    // JWT says 'staff'
    mockJwtVerify.mockResolvedValue({
      payload: { store_id: 'store-abc', staff_id: 'staff-xyz', role: 'staff' },
    })
    // DB says role was promoted to 'manager'
    buildAdminQueryChain({ role: 'manager', is_active: true })

    const result = await resolveStaffAuthVerified()

    expect(result?.role).toBe('manager')
  })
})
