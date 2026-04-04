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
} = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockHeadersGet: vi.fn(),
    mockCookiesGet: vi.fn(),
    mockJwtVerify: vi.fn(),
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

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { resolveAuth, resolveStaffAuth } from './resolveAuth'

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
