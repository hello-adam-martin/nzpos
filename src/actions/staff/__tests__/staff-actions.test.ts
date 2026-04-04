import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only before any imports
vi.mock('server-only', () => ({}))

// ---- Hoisted mocks ----
const {
  mockGetUser,
  mockSupabaseFrom,
  mockAdminFrom,
  mockRevalidatePath,
  mockIsPinBlacklisted,
  mockBcryptHash,
  mockGeneratePin,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockSupabaseFrom = vi.fn()
  const mockAdminFrom = vi.fn()
  const mockRevalidatePath = vi.fn()
  const mockIsPinBlacklisted = vi.fn().mockReturnValue(false)
  const mockBcryptHash = vi.fn().mockResolvedValue('hashed_pin')
  const mockGeneratePin = vi.fn().mockReturnValue('5678')
  return {
    mockGetUser,
    mockSupabaseFrom,
    mockAdminFrom,
    mockRevalidatePath,
    mockIsPinBlacklisted,
    mockBcryptHash,
    mockGeneratePin,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn().mockReturnValue({
    from: mockAdminFrom,
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/pin', () => ({
  isPinBlacklisted: mockIsPinBlacklisted,
  generatePin: mockGeneratePin,
}))

vi.mock('bcryptjs', () => ({
  default: { hash: mockBcryptHash, compare: vi.fn() },
}))

// Shared test helpers
const OWNER_USER = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  app_metadata: { role: 'owner', store_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
}

const NON_OWNER_USER = {
  id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  app_metadata: { role: 'staff', store_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
}

function mockOwner() {
  mockGetUser.mockResolvedValue({ data: { user: OWNER_USER }, error: null })
}

function mockNonOwner() {
  mockGetUser.mockResolvedValue({ data: { user: NON_OWNER_USER }, error: null })
}

/**
 * Build a chainable admin client mock for a single query path.
 * Supports: from().insert().select().single() and from().update().eq().eq()...
 */
function makeAdminChain(resolveValue: unknown) {
  const terminal = vi.fn().mockResolvedValue(resolveValue)
  const chain: Record<string, unknown> = {}

  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'order', 'maybeSingle', 'in']
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  // Terminal methods return the value
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolveValue)
  ;(chain.order as ReturnType<typeof vi.fn>).mockResolvedValue(resolveValue)
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(resolveValue)

  // Make update/eq/select chain also resolve for the select() after update()
  const selectAfterUpdate = vi.fn().mockResolvedValue(resolveValue)
  ;(chain.select as ReturnType<typeof vi.fn>).mockReturnValue({ ...chain, then: terminal, single: chain.single })

  return { chain, terminal }
}

import { createStaff } from '../createStaff'
import { updateStaff } from '../updateStaff'
import { deactivateStaff } from '../deactivateStaff'
import { resetStaffPin } from '../resetStaffPin'
import { getStaffList } from '../getStaffList'

beforeEach(() => {
  vi.clearAllMocks()
  mockIsPinBlacklisted.mockReturnValue(false)
  mockBcryptHash.mockResolvedValue('hashed_pin')
  mockGeneratePin.mockReturnValue('5678')
})

// ============================================================================
// createStaff
// ============================================================================

describe('createStaff — INSUFFICIENT_ROLE guard', () => {
  it('returns INSUFFICIENT_ROLE when caller is not owner', async () => {
    mockNonOwner()

    const result = await createStaff({ name: 'Test', pin: '5678', role: 'manager' })

    expect(result).toEqual({ error: 'INSUFFICIENT_ROLE' })
  })

  it('returns INSUFFICIENT_ROLE when caller is manager role', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'mgr-uuid',
          app_metadata: { role: 'manager', store_id: 'store-uuid' },
        },
      },
      error: null,
    })

    const result = await createStaff({ name: 'Test', pin: '5678', role: 'staff' })

    expect(result).toEqual({ error: 'INSUFFICIENT_ROLE' })
  })
})

describe('createStaff — PIN blacklist rejection', () => {
  it('returns field error when PIN is blacklisted', async () => {
    mockOwner()
    mockIsPinBlacklisted.mockReturnValue(true)

    const result = await createStaff({ name: 'Test', pin: '0000', role: 'staff' })

    expect(result).toEqual({
      error: { pin: ["That PIN isn't allowed. Enter a different 4-digit PIN."] },
    })
  })
})

describe('createStaff — success path', () => {
  it('creates staff and returns staffId', async () => {
    mockOwner()
    mockIsPinBlacklisted.mockReturnValue(false)

    // Mock admin client chain: insert().select().single() => { data: { id: 'new-staff-uuid' } }
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new-staff-uuid' }, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    mockAdminFrom.mockReturnValue({ insert: insertMock })

    const result = await createStaff({ name: 'Alice', pin: '5678', role: 'manager' })

    expect(result).toEqual({ success: true, staffId: 'new-staff-uuid' })
    expect(mockBcryptHash).toHaveBeenCalledWith('5678', 10)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/staff')
  })
})

// ============================================================================
// updateStaff
// ============================================================================

describe('updateStaff — INSUFFICIENT_ROLE guard', () => {
  it('returns INSUFFICIENT_ROLE for non-owner', async () => {
    mockNonOwner()

    const result = await updateStaff({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'staff' })

    expect(result).toEqual({ error: 'INSUFFICIENT_ROLE' })
  })
})

describe('updateStaff — pin_locked_until on role change', () => {
  it('sets pin_locked_until when role is changed', async () => {
    mockOwner()

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })
    mockAdminFrom.mockReturnValue({ update: updateMock })

    await updateStaff({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'manager' })

    // The first call to update() should include pin_locked_until
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'manager', pin_locked_until: expect.any(String) })
    )
  })

  it('does NOT set pin_locked_until when only name is changed', async () => {
    mockOwner()

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })
    mockAdminFrom.mockReturnValue({ update: updateMock })

    await updateStaff({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Bob' })

    expect(updateMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ pin_locked_until: expect.any(String) })
    )
  })
})

// ============================================================================
// deactivateStaff
// ============================================================================

describe('deactivateStaff — INSUFFICIENT_ROLE guard', () => {
  it('returns INSUFFICIENT_ROLE for non-owner', async () => {
    mockNonOwner()

    const result = await deactivateStaff({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })

    expect(result).toEqual({ error: 'INSUFFICIENT_ROLE' })
  })
})

describe('deactivateStaff — sets is_active=false', () => {
  it('calls update with is_active=false and pin_locked_until', async () => {
    mockOwner()

    const selectMock = vi.fn().mockResolvedValue({ data: [{ id: 'staff-uuid' }], error: null })
    const eqIsActive = vi.fn().mockReturnValue({ select: selectMock })
    const eqStoreId = vi.fn().mockReturnValue({ eq: eqIsActive })
    const eqStaffId = vi.fn().mockReturnValue({ eq: eqStoreId })
    const updateMock = vi.fn().mockReturnValue({ eq: eqStaffId })
    mockAdminFrom.mockReturnValue({ update: updateMock })

    const result = await deactivateStaff({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false, pin_locked_until: expect.any(String) })
    )
    expect(result).toEqual({ success: true })
  })
})

describe('deactivateStaff — prevents self-deactivation', () => {
  it('returns error when staffId matches owner user id', async () => {
    mockOwner()

    const result = await deactivateStaff({ staffId: OWNER_USER.id })

    expect(result).toEqual({ error: 'Cannot deactivate your own account' })
  })
})

// ============================================================================
// resetStaffPin
// ============================================================================

describe('resetStaffPin — INSUFFICIENT_ROLE guard', () => {
  it('returns INSUFFICIENT_ROLE for non-owner', async () => {
    mockNonOwner()

    const result = await resetStaffPin({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })

    expect(result).toEqual({ error: 'INSUFFICIENT_ROLE' })
  })
})

describe('resetStaffPin — returns plaintext PIN', () => {
  it('returns success with the generated PIN', async () => {
    mockOwner()
    mockGeneratePin.mockReturnValue('7391')

    const selectMock = vi.fn().mockResolvedValue({ data: [{ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }], error: null })
    const eqStoreId = vi.fn().mockReturnValue({ select: selectMock })
    const eqStaffId = vi.fn().mockReturnValue({ eq: eqStoreId })
    const updateMock = vi.fn().mockReturnValue({ eq: eqStaffId })
    mockAdminFrom.mockReturnValue({ update: updateMock })

    const result = await resetStaffPin({ staffId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })

    expect(result).toEqual({ success: true, pin: '7391' })
    expect(result).toMatchObject({ pin: expect.stringMatching(/^\d{4}$/) })
    expect(mockBcryptHash).toHaveBeenCalledWith('7391', 10)
  })
})

// ============================================================================
// getStaffList
// ============================================================================

describe('getStaffList — INSUFFICIENT_ROLE guard', () => {
  it('returns INSUFFICIENT_ROLE for non-owner', async () => {
    mockNonOwner()

    const result = await getStaffList()

    expect(result).toEqual({ error: 'INSUFFICIENT_ROLE' })
  })
})

describe('getStaffList — success path', () => {
  it('returns staff list for owner', async () => {
    mockOwner()

    const mockStaff = [
      { id: 'staff-1', name: 'Alice', role: 'staff', is_active: true, created_at: '2026-01-01' },
    ]
    const orderMock = vi.fn().mockResolvedValue({ data: mockStaff, error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockAdminFrom.mockReturnValue({ select: selectMock })

    const result = await getStaffList()

    expect(result).toEqual({ data: mockStaff })
  })
})
