import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only at module level (must come before any imports that use it)
vi.mock('server-only', () => ({}))

// Mock date-fns format to return a fixed month
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2026-04'),
}))

// Hoist mock functions so they can be used inside vi.mock factories
const { mockSubscriptionsList, mockFrom } = vi.hoisted(() => ({
  mockSubscriptionsList: vi.fn(),
  mockFrom: vi.fn(),
}))

// Mock Stripe client
vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      list: mockSubscriptionsList,
    },
  },
}))

// Mock Supabase admin client with chainable query builder
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: mockFrom }),
}))

// Mock PRICE_TO_FEATURE map
vi.mock('@/config/addons', () => ({
  PRICE_TO_FEATURE: {
    price_xero_monthly: 'has_xero',
    price_inventory_monthly: 'has_inventory',
    price_email_monthly: 'has_email_notifications',
  },
}))

import { normaliseMrrCents, syncStripeSnapshot } from './syncStripeSnapshot'

// ---------------------------------------------------------------------------
// Pure function tests: normaliseMrrCents
// ---------------------------------------------------------------------------

describe('normaliseMrrCents', () => {
  it('passes through monthly amount as-is', () => {
    expect(normaliseMrrCents(2000, 'month')).toBe(2000)
  })

  it('divides annual amount by 12 (rounded)', () => {
    expect(normaliseMrrCents(12000, 'year')).toBe(1000)
  })

  it('rounds annual amount correctly when not evenly divisible', () => {
    // 1000 / 12 = 83.333... => rounds to 83
    expect(normaliseMrrCents(1000, 'year')).toBe(83)
  })

  it('returns 0 for zero monthly amount', () => {
    expect(normaliseMrrCents(0, 'month')).toBe(0)
  })

  it('returns 0 for zero annual amount', () => {
    expect(normaliseMrrCents(0, 'year')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a chainable Supabase mock that resolves to the given result.
 */
function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'not', 'single', 'upsert', 'delete', 'insert']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  // Make thenable so await works
  chain.then = (resolve: (val: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

// ---------------------------------------------------------------------------
// Integration-style tests: syncStripeSnapshot
// ---------------------------------------------------------------------------

describe('syncStripeSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns synced count of 0 when no stores found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') return makeChain({ data: [], error: null })
      if (table === 'platform_analytics_snapshots') return makeChain({ data: null, error: null })
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    const result = await syncStripeSnapshot()
    expect(result.synced).toBe(0)
    expect(result.error).toBeUndefined()
  })

  it('returns error when stores query fails', async () => {
    mockFrom.mockImplementation(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )

    const result = await syncStripeSnapshot()
    expect(result.synced).toBe(0)
    expect(result.error).toBe('Failed to fetch stores')
  })

  it('builds correct snapshot row for monthly subscription', async () => {
    const mockSub = {
      id: 'sub_monthly',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-1', stripe_customer_id: 'cus_abc' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    const result = await syncStripeSnapshot()

    expect(result.synced).toBe(1)
    expect(result.error).toBeUndefined()

    expect(capturedRows).toHaveLength(1)
    const row = capturedRows[0] as Record<string, unknown>
    expect(row.tenant_id).toBe('store-uuid-1')
    expect(row.stripe_subscription_id).toBe('sub_monthly')
    expect(row.status).toBe('active')
    expect(row.plan_interval).toBe('month')
    expect(row.amount_cents).toBe(2900)
    expect(row.mrr_cents).toBe(2900) // monthly = pass through
    expect(row.addon_type).toBe('xero') // 'has_xero' -> 'xero'
    expect(row.canceled_at).toBeNull()
    expect(row.snapshot_month).toBe('2026-04')
    expect(row.discount_amount).toBe(0)
  })

  it('normalises annual plan MRR by dividing by 12', async () => {
    const mockSub = {
      id: 'sub_annual',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1777766400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_inventory_monthly',
              recurring: { interval: 'year' },
              unit_amount: 12000,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-2', stripe_customer_id: 'cus_def' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    const result = await syncStripeSnapshot()

    expect(result.synced).toBe(1)
    const row = capturedRows[0] as Record<string, unknown>
    expect(row.amount_cents).toBe(12000)
    expect(row.mrr_cents).toBe(1000) // 12000 / 12 = 1000
    expect(row.plan_interval).toBe('year')
    expect(row.addon_type).toBe('inventory')
  })

  it('sets mrr_cents to 0 for trialing subscriptions', async () => {
    const mockSub = {
      id: 'sub_trial',
      status: 'trialing',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-3', stripe_customer_id: 'cus_ghi' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    const result = await syncStripeSnapshot()

    expect(result.synced).toBe(1)
    const row = capturedRows[0] as Record<string, unknown>
    expect(row.status).toBe('trialing')
    expect(row.mrr_cents).toBe(0) // trials contribute $0
  })

  it('resolves addon_type for email_notifications price ID', async () => {
    const mockSub = {
      id: 'sub_email',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_email_monthly',
              recurring: { interval: 'month' },
              unit_amount: 1500,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-4', stripe_customer_id: 'cus_jkl' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    expect(row.addon_type).toBe('email_notifications')
  })

  it('sets addon_type to null for unknown price IDs', async () => {
    const mockSub = {
      id: 'sub_unknown',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_unknown_plan',
              recurring: { interval: 'month' },
              unit_amount: 5000,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-5', stripe_customer_id: 'cus_mno' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    expect(row.addon_type).toBeNull()
  })

  it('converts canceled_at Unix timestamp to ISO string', async () => {
    const canceledAtUnix = 1746230400
    const mockSub = {
      id: 'sub_canceled',
      status: 'canceled',
      canceled_at: canceledAtUnix,
      current_period_start: 1743638400,
      current_period_end: 1746230400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-6', stripe_customer_id: 'cus_pqr' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    expect(row.canceled_at).toBe(new Date(canceledAtUnix * 1000).toISOString())
  })

  it('converts current_period_start and current_period_end to ISO strings', async () => {
    const periodStartUnix = 1743638400
    const periodEndUnix = 1746230400
    const mockSub = {
      id: 'sub_period',
      status: 'active',
      canceled_at: null,
      current_period_start: periodStartUnix,
      current_period_end: periodEndUnix,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-7', stripe_customer_id: 'cus_stu' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    expect(row.current_period_start).toBe(new Date(periodStartUnix * 1000).toISOString())
    expect(row.current_period_end).toBe(new Date(periodEndUnix * 1000).toISOString())
  })

  it('extracts discount_amount from sub.discount.coupon.amount_off', async () => {
    const mockSub = {
      id: 'sub_discounted',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: {
        coupon: {
          amount_off: 500,
        },
      },
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-8', stripe_customer_id: 'cus_vwx' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    expect(row.discount_amount).toBe(500)
  })

  it('sets discount_amount to 0 when no discount', async () => {
    const mockSub = {
      id: 'sub_nodiscount',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-9', stripe_customer_id: 'cus_yz' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    expect(row.discount_amount).toBe(0)
  })

  it('snapshot_month uses yyyy-MM format', async () => {
    const mockSub = {
      id: 'sub_month_format',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const capturedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-10', stripe_customer_id: 'cus_aa' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((rows: unknown) => {
          capturedRows.push(...(rows as unknown[]))
          return makeChain({ data: null, error: null })
        })
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    const row = capturedRows[0] as Record<string, unknown>
    // format() mock returns '2026-04'
    expect(row.snapshot_month).toBe('2026-04')
    expect(row.snapshot_month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('deletes only current month rows before inserting (scoped to snapshot_month)', async () => {
    const mockSub = {
      id: 'sub_delete_check',
      status: 'active',
      canceled_at: null,
      current_period_start: 1746230400,
      current_period_end: 1748822400,
      discount: null,
      items: {
        data: [
          {
            price: {
              id: 'price_xero_monthly',
              recurring: { interval: 'month' },
              unit_amount: 2900,
            },
          },
        ],
      },
    }

    mockSubscriptionsList.mockResolvedValue({ data: [mockSub] })

    const eqCalls: Array<[string, unknown]> = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stores') {
        return makeChain({
          data: [{ id: 'store-uuid-11', stripe_customer_id: 'cus_bb' }],
          error: null,
        })
      }
      if (table === 'platform_analytics_snapshots') {
        const chain = makeChain({ data: null, error: null })
        ;(chain.eq as ReturnType<typeof vi.fn>).mockImplementation(
          (col: string, val: unknown) => {
            eqCalls.push([col, val])
            return makeChain({ data: null, error: null })
          }
        )
        return chain
      }
      if (table === 'analytics_sync_metadata') return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    await syncStripeSnapshot()

    // Verify delete was scoped to snapshot_month = '2026-04'
    const deleteEq = eqCalls.find(([col]) => col === 'snapshot_month')
    expect(deleteEq).toBeDefined()
    expect(deleteEq?.[1]).toBe('2026-04')
  })
})
