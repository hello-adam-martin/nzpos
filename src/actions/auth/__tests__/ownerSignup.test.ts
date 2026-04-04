import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// ---- Hoisted mocks (avoid temporal dead zone with vi.mock hoisting) ----
const {
  mockCheckRateLimit,
  mockSignUp,
  mockRefreshSession,
  mockCreateSupabaseServerClient,
  mockRpc,
  mockDeleteUser,
  mockCreateSupabaseAdminClient,
  mockHeaders,
} = vi.hoisted(() => {
  const mockCheckRateLimit = vi.fn()
  const mockSignUp = vi.fn()
  const mockRefreshSession = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  const mockRpc = vi.fn()
  const mockDeleteUser = vi.fn()
  const mockCreateSupabaseAdminClient = vi.fn()
  const mockHeaders = vi.fn()
  return {
    mockCheckRateLimit,
    mockSignUp,
    mockRefreshSession,
    mockCreateSupabaseServerClient,
    mockRpc,
    mockDeleteUser,
    mockCreateSupabaseAdminClient,
    mockHeaders,
  }
})

vi.mock('@/lib/signupRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient,
}))

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

import { ownerSignup } from '../ownerSignup'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value)
  }
  return fd
}

const validData = {
  email: 'owner@example.com',
  password: 'securepassword123',
  storeName: 'My Test Store',
  slug: 'myteststore',
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default: rate limit allows
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 4 })

  // Default: headers returns IP
  mockHeaders.mockResolvedValue({
    get: (name: string) => (name === 'x-forwarded-for' ? '1.2.3.4' : null),
  })

  // Default: signUp succeeds
  const mockUser = { id: 'user-uuid-123', email: validData.email }
  mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null })
  mockRefreshSession.mockResolvedValue({})
  mockCreateSupabaseServerClient.mockResolvedValue({
    auth: {
      signUp: mockSignUp,
      refreshSession: mockRefreshSession,
    },
  })

  // Default: RPC succeeds
  mockRpc.mockResolvedValue({
    data: { store_id: 'store-uuid-456', slug: validData.slug },
    error: null,
  })
  mockDeleteUser.mockResolvedValue({ error: null })
  mockCreateSupabaseAdminClient.mockReturnValue({
    rpc: mockRpc,
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  })
})

describe('ownerSignup', () => {
  it('rejects invalid email', async () => {
    const fd = makeFormData({ ...validData, email: 'not-an-email' })
    const result = await ownerSignup(fd)
    expect(result.error?.email).toBeDefined()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects password under 8 chars', async () => {
    const fd = makeFormData({ ...validData, password: 'short' })
    const result = await ownerSignup(fd)
    expect(result.error?.password).toBeDefined()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects reserved slug', async () => {
    const fd = makeFormData({ ...validData, slug: 'admin' })
    const result = await ownerSignup(fd)
    expect(result.error?.slug).toBeDefined()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects slug that fails format validation', async () => {
    const fd = makeFormData({ ...validData, slug: '123invalid' }) // starts with digit
    const result = await ownerSignup(fd)
    expect(result.error?.slug).toBeDefined()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects rate-limited IP', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 })
    const fd = makeFormData(validData)
    const result = await ownerSignup(fd)
    expect(result.error?._form).toEqual(['Too many signup attempts. Please wait an hour and try again.'])
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('returns email error when user already registered', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })
    const fd = makeFormData(validData)
    const result = await ownerSignup(fd)
    expect(result.error?.email).toBeDefined()
    expect(result.error?.email?.[0]).toMatch(/already exists/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls provision_store RPC on successful signup', async () => {
    const fd = makeFormData(validData)
    const result = await ownerSignup(fd)

    expect(mockRpc).toHaveBeenCalledWith('provision_store', {
      p_auth_user_id: 'user-uuid-123',
      p_store_name: validData.storeName,
      p_slug: validData.slug,
      p_owner_email: validData.email,
    })
    expect(result.success).toBe(true)
    expect(result.slug).toBe(validData.slug)
  })

  it('deletes auth user if RPC fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'PROVISION_FAILED: internal error' },
    })
    const fd = makeFormData(validData)
    const result = await ownerSignup(fd)

    expect(mockDeleteUser).toHaveBeenCalledWith('user-uuid-123')
    expect(result.error?._form).toBeDefined()
    expect(result.success).toBeUndefined()
  })

  it('returns slug error when RPC returns SLUG_TAKEN', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'SLUG_TAKEN:myteststore' },
    })
    const fd = makeFormData(validData)
    const result = await ownerSignup(fd)

    expect(mockDeleteUser).toHaveBeenCalledWith('user-uuid-123')
    expect(result.error?.slug).toBeDefined()
    expect(result.error?.slug?.[0]).toMatch(/taken/i)
  })

  it('refreshes session after successful provisioning', async () => {
    const fd = makeFormData(validData)
    await ownerSignup(fd)
    expect(mockRefreshSession).toHaveBeenCalled()
  })

  it('includes emailRedirectTo pointing at /api/auth/callback', async () => {
    const fd = makeFormData(validData)
    await ownerSignup(fd)
    const signUpArgs = mockSignUp.mock.calls[0][0]
    expect(signUpArgs.options?.emailRedirectTo).toContain('/api/auth/callback')
  })
})
