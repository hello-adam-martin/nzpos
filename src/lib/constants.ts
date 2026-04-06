/**
 * Fixed UUID for the demo store created in 032_demo_store_seed.sql.
 * Used by the /demo/pos route (Phase 33) to query products without auth.
 */
export const DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'

/**
 * Fixed UUID for the local dev store created in supabase/seed.ts.
 * Kept here so both constants live in one place.
 */
export const DEV_STORE_ID = '00000000-0000-4000-a000-000000000001'
