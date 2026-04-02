import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll } from 'vitest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

describe('Multi-tenant schema validation (TENANT-02)', () => {
  let admin: ReturnType<typeof createClient>

  beforeAll(() => {
    admin = createClient(supabaseUrl, serviceRoleKey)
  })

  it('stores table has slug column', async () => {
    const { data } = await admin
      .from('stores')
      .select('slug')
      .limit(1)
    expect(data).not.toBeNull()
  })

  it('stores.slug has a value for the seed store', async () => {
    const { data } = await admin
      .from('stores')
      .select('slug')
      .eq('slug', 'demo')
      .single()
    expect(data).not.toBeNull()
    expect(data!.slug).toBe('demo')
  })

  it('store_plans table exists and has a row for the seed store', async () => {
    const { data, error } = await admin
      .from('store_plans')
      .select('store_id, has_xero, has_email_notifications, has_custom_domain')
      .limit(1)
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    // Verify boolean defaults
    expect(data![0].has_xero).toBe(false)
    expect(data![0].has_email_notifications).toBe(false)
    expect(data![0].has_custom_domain).toBe(false)
  })

  it('stores table has is_active column', async () => {
    const { data } = await admin
      .from('stores')
      .select('is_active')
      .limit(1)
    expect(data).not.toBeNull()
    expect(data![0].is_active).toBe(true) // default
  })

  it('stores table has branding columns', async () => {
    const { data, error } = await admin
      .from('stores')
      .select('logo_url, store_description, primary_color')
      .limit(1)
    expect(error).toBeNull()
    expect(data).not.toBeNull()
  })

  it('super_admins table exists', async () => {
    const { data, error } = await admin
      .from('super_admins')
      .select('id')
      .limit(1)
    expect(error).toBeNull()
    // Table exists (may be empty)
    expect(data).not.toBeNull()
  })
})
