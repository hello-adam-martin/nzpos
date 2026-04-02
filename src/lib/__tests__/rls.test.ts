import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * RLS Cross-Tenant Isolation Test (FOUND-04 + D-16)
 *
 * Requires: `supabase start` running locally.
 * This test creates two stores with two different owner auth users,
 * then verifies that Store A's owner CANNOT see Store B's products.
 *
 * Also verifies 4 attack vectors from D-16:
 * 1. Wrong JWT cannot read other tenant data (existing)
 * 2. RPC with mismatched store_id (complete_pos_sale) fails
 * 3. Super admin has read-only access (cannot write)
 * 4. x-store-id header spoofing cannot override JWT-based RLS
 *
 * Uses the service role client for setup, then per-user clients for assertions.
 *
 * JWT claims are injected via admin.auth.admin.updateUserById (app_metadata),
 * which sets claims directly on the user — picked up on next sign-in without
 * needing a refreshSession call. This mirrors the pattern used in seed.ts.
 *
 * Skipped automatically when SUPABASE_SERVICE_ROLE_KEY is not set (CI without Supabase).
 */
describe('RLS tenant isolation', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // Skip if no service role key (CI without Supabase running)
  const describeWithSupabase = serviceRoleKey ? describe : describe.skip

  // Shared state across all describe blocks in this suite
  let storeAId: string
  let storeBId: string
  let staffAId: string  // staff.id (PK) — used as p_staff_id in RPC
  let userAAccessToken: string
  let superAdminAccessToken: string
  let productAId: string

  // Store stable email addresses so sign-in uses the same address as creation
  const ts = Date.now()
  const emailA = `rls-test-a-${ts}@test.dev`
  const emailB = `rls-test-b-${ts}@test.dev`
  const emailSuperAdmin = `rls-super-admin-${ts}@test.dev`

  // Shared beforeAll — creates all test data used across all test blocks
  beforeAll(async () => {
    if (!serviceRoleKey) return

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Create three auth users: User A, User B, Super Admin
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
    const { data: superAdminUser } = await admin.auth.admin.createUser({
      email: emailSuperAdmin,
      password: 'testpass123',
      email_confirm: true,
    })

    if (!userA.user || !userB.user || !superAdminUser.user) {
      throw new Error('Failed to create test users')
    }

    // Create two stores with slugs (slug is NOT NULL since migration 014)
    const { data: storeA } = await admin.from('stores').insert({
      name: 'RLS Test Store A',
      owner_auth_id: userA.user.id,
      slug: `rls-test-a-${ts}`,
    }).select('id').single()
    const { data: storeB } = await admin.from('stores').insert({
      name: 'RLS Test Store B',
      owner_auth_id: userB.user.id,
      slug: `rls-test-b-${ts}`,
    }).select('id').single()

    if (!storeA || !storeB) throw new Error('Failed to create test stores')
    storeAId = storeA.id
    storeBId = storeB.id

    // Create staff records — capture staffAId (staff.id PK) for RPC p_staff_id
    const { data: staffA } = await admin.from('staff').insert({
      store_id: storeAId, auth_user_id: userA.user.id, name: 'Owner A', role: 'owner',
    }).select('id').single()
    await admin.from('staff').insert({
      store_id: storeBId, auth_user_id: userB.user.id, name: 'Owner B', role: 'owner',
    })
    if (!staffA) throw new Error('Failed to create staff A')
    staffAId = staffA.id

    // Insert super admin into super_admins table
    await admin.from('super_admins').insert({
      auth_user_id: superAdminUser.user.id,
      email: emailSuperAdmin,
    })

    // Create store_plans rows for both stores
    await admin.from('store_plans').insert([
      { store_id: storeAId },
      { store_id: storeBId },
    ])

    // Create a product in Store A (for RPC test and super admin read test)
    const { data: productA } = await admin.from('products').insert({
      store_id: storeAId,
      name: 'Store A Test Product',
      price_cents: 1000,
      is_active: true,
      stock_quantity: 100,
    }).select('id').single()

    if (!productA) throw new Error('Failed to create product in Store A')
    productAId = productA.id

    // Create a product in Store B as is_active=false so it is NOT covered by
    // products_public_read policy — only Store B's authenticated users should see it.
    // This tests the tenant_access RLS isolation (not the public storefront read).
    await admin.from('products').insert({
      store_id: storeBId,
      name: 'Store B Secret Product',
      price_cents: 999,
      is_active: false,  // inactive — not visible via products_public_read
      stock_quantity: 50,
    })

    // Set app_metadata directly on each user so JWT has correct claims on next sign-in.
    // This mirrors the approach used in seed.ts (D-16: auth hook may not fire in test context).
    await admin.auth.admin.updateUserById(userA.user.id, {
      app_metadata: { store_id: storeAId, role: 'owner' },
    })
    await admin.auth.admin.updateUserById(userB.user.id, {
      app_metadata: { store_id: storeBId, role: 'owner' },
    })
    await admin.auth.admin.updateUserById(superAdminUser.user.id, {
      app_metadata: { is_super_admin: true },
    })

    // Sign in as User A — app_metadata already set, no refresh needed
    const anonClientA = createClient(supabaseUrl, anonKey)
    const { data: sessionA } = await anonClientA.auth.signInWithPassword({
      email: emailA,
      password: 'testpass123',
    })
    userAAccessToken = sessionA.session?.access_token ?? ''

    // Sign in as Super Admin
    const anonClientSA = createClient(supabaseUrl, anonKey)
    const { data: sessionSA } = await anonClientSA.auth.signInWithPassword({
      email: emailSuperAdmin,
      password: 'testpass123',
    })
    superAdminAccessToken = sessionSA.session?.access_token ?? ''
  })

  describeWithSupabase('cross-tenant product isolation', () => {
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

  describeWithSupabase('RPC cross-tenant protection (D-16 attack vector 2)', () => {
    it('complete_pos_sale fails when called with mismatched store_id', async () => {
      // User A calls complete_pos_sale with Store B's store_id
      // but passes a product that belongs to Store A.
      // The RPC checks products.store_id = p_store_id internally,
      // so Store A's product won't be found under Store B's store_id.
      // All 12 params provided explicitly to avoid PostgREST overload ambiguity.
      const userAClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
      })

      const { data, error } = await userAClient.rpc('complete_pos_sale', {
        p_store_id: storeBId, // WRONG — using Store B's ID
        p_staff_id: staffAId,
        p_payment_method: 'cash',
        p_subtotal_cents: 1000,
        p_gst_cents: 150,
        p_total_cents: 1000,
        p_discount_cents: 0,
        p_cash_tendered_cents: null,
        p_notes: null,
        p_items: [{ // Pass as array — PostgREST serializes to JSONB
          product_id: productAId, // Store A's product
          product_name: 'Test Product A',
          unit_price_cents: 1000,
          quantity: 1,
          discount_cents: 0,
          line_total_cents: 1000,
          gst_cents: 150,
        }],
        p_receipt_data: null,
        p_customer_email: null,
      })

      // Should fail — product belongs to Store A, not Store B
      expect(error).not.toBeNull()
      expect(error!.message).toContain('PRODUCT_NOT_FOUND')
    })

    it('complete_pos_sale succeeds with correct store_id', async () => {
      // Sanity check — same product with correct store_id should work
      const userAClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
      })

      const { data, error } = await userAClient.rpc('complete_pos_sale', {
        p_store_id: storeAId, // CORRECT — Store A's ID
        p_staff_id: staffAId,
        p_payment_method: 'cash',
        p_subtotal_cents: 1000,
        p_gst_cents: 150,
        p_total_cents: 1000,
        p_discount_cents: 0,
        p_cash_tendered_cents: null,
        p_notes: null,
        p_items: [{ // Pass as array — PostgREST serializes to JSONB
          product_id: productAId,
          product_name: 'Test Product A',
          unit_price_cents: 1000,
          quantity: 1,
          discount_cents: 0,
          line_total_cents: 1000,
          gst_cents: 150,
        }],
        p_receipt_data: null,
        p_customer_email: null,
      })

      // Should succeed
      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })
  })

  describeWithSupabase('super admin write protection (D-13)', () => {
    it('super admin JWT can SELECT products across all tenants', async () => {
      const superClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${superAdminAccessToken}` } },
      })
      const { data: products, error } = await superClient
        .from('products')
        .select('*')
      expect(error).toBeNull()
      // Should see products from BOTH stores
      expect(products!.length).toBeGreaterThanOrEqual(2)
    })

    it('super admin JWT cannot INSERT into products', async () => {
      const superClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${superAdminAccessToken}` } },
      })
      const { data, error } = await superClient
        .from('products')
        .insert({
          store_id: storeAId,
          name: 'Super Admin Injected Product',
          price_cents: 100,
        })
        .select()
      // RLS should block — super admin only has SELECT, so insert is blocked.
      // PostgREST returns data=null (not []) when RLS silently blocks an insert.
      // We verify the record was NOT written by checking data is null or empty.
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true)
    })

    it('super admin JWT cannot UPDATE products', async () => {
      const superClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${superAdminAccessToken}` } },
      })
      const { data, error } = await superClient
        .from('products')
        .update({ name: 'Hacked Name' })
        .eq('store_id', storeAId)
        .select()
      // Similar to INSERT: PostgREST returns null/empty when RLS blocks writes.
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true)
    })

    it('super admin JWT can read stores table', async () => {
      const superClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${superAdminAccessToken}` } },
      })
      const { data: stores, error } = await superClient
        .from('stores')
        .select('id, slug')
      expect(error).toBeNull()
      expect(stores!.length).toBeGreaterThanOrEqual(2)
    })
  })

  describeWithSupabase('header spoofing protection', () => {
    it('x-store-id header cannot override JWT-based RLS', async () => {
      // Even if a malicious client sets x-store-id header to Store B,
      // RLS reads from JWT app_metadata, not request headers.
      // This test confirms the architectural security guarantee:
      // The Supabase REST API ignores custom x-store-id headers for RLS evaluation.
      const userAClient = createClient(supabaseUrl, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${userAAccessToken}`,
            'x-store-id': storeBId, // Spoofed header
          },
        },
      })
      const { data: products } = await userAClient
        .from('products')
        .select('*')
        .eq('store_id', storeBId)
      // RLS ignores x-store-id header — JWT store_id doesn't match Store B
      expect(products).toEqual([])
    })
  })

  describeWithSupabase('store_plans isolation', () => {
    it('owner can read their own store plan', async () => {
      const userAClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
      })
      const { data: plans } = await userAClient
        .from('store_plans')
        .select('*')
      expect(plans!.length).toBe(1)
      expect(plans![0].store_id).toBe(storeAId)
    })

    it('owner cannot read another store plan', async () => {
      const userAClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
      })
      const { data: plans } = await userAClient
        .from('store_plans')
        .select('*')
        .eq('store_id', storeBId)
      expect(plans).toEqual([])
    })
  })
})
