import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * RLS Cross-Tenant Isolation Test (FOUND-04)
 *
 * Requires: `supabase start` running locally.
 * This test creates two stores with two different owner auth users,
 * then verifies that Store A's owner CANNOT see Store B's products.
 *
 * Uses the service role client for setup, then per-user clients for assertions.
 *
 * Skipped automatically when SUPABASE_SERVICE_ROLE_KEY is not set (CI without Supabase).
 */
describe('RLS tenant isolation', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // Skip if no service role key (CI without Supabase running)
  const describeWithSupabase = serviceRoleKey ? describe : describe.skip

  describeWithSupabase('cross-tenant product isolation', () => {
    let storeAId: string
    let storeBId: string
    let userAAccessToken: string
    // Store stable email addresses so sign-in uses the same address as creation
    const emailA = `rls-test-a-${Date.now()}@test.dev`
    const emailB = `rls-test-b-${Date.now()}@test.dev`

    beforeAll(async () => {
      const admin = createClient(supabaseUrl, serviceRoleKey)

      // Create two auth users
      const { data: userA } = await admin.auth.admin.createUser({
        email: emailA,
        password: 'testpass123',
        email_confirm: true,
      })
      const { data: userB } = await admin.auth.admin.createUser({
        email: emailB,
        password: 'testpass123',
        email_confirm: true,
      })

      if (!userA.user || !userB.user) throw new Error('Failed to create test users')

      // Create two stores
      const { data: storeA } = await admin.from('stores').insert({
        name: 'RLS Test Store A', owner_auth_id: userA.user.id,
      }).select('id').single()
      const { data: storeB } = await admin.from('stores').insert({
        name: 'RLS Test Store B', owner_auth_id: userB.user.id,
      }).select('id').single()

      if (!storeA || !storeB) throw new Error('Failed to create test stores')
      storeAId = storeA.id
      storeBId = storeB.id

      // Create staff records (so JWT hook injects store_id)
      await admin.from('staff').insert([
        { store_id: storeAId, auth_user_id: userA.user.id, name: 'Owner A', role: 'owner' },
        { store_id: storeBId, auth_user_id: userB.user.id, name: 'Owner B', role: 'owner' },
      ])

      // Create a product in Store B only
      await admin.from('products').insert({
        store_id: storeBId,
        name: 'Store B Secret Product',
        price_cents: 999,
        is_active: true,
      })

      // Sign in as User A to get their access token
      const anonClient = createClient(supabaseUrl, anonKey)
      const { data: session } = await anonClient.auth.signInWithPassword({
        email: emailA,
        password: 'testpass123',
      })

      // Refresh session to pick up JWT hook claims (store_id injected into app_metadata)
      if (session.session) {
        const { data: refreshed } = await anonClient.auth.refreshSession()
        userAAccessToken = refreshed.session?.access_token ?? ''
      }
    })

    it('should return empty result when querying products with mismatched store_id', async () => {
      // User A's JWT has store_id = storeAId
      // Query should NOT return Store B's products due to RLS tenant_isolation policy
      const userAClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
      })

      const { data: products, error } = await userAClient
        .from('products')
        .select('*')
        .eq('store_id', storeBId) // Deliberately query with mismatched store_id

      expect(error).toBeNull()
      // RLS should filter out all Store B products — empty result
      expect(products).toEqual([])
    })
  })
})
