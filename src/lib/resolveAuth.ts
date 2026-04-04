import 'server-only'
import { cookies, headers } from 'next/headers'
import { jwtVerify } from 'jose'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { PosRole } from '@/config/roles'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

/**
 * Resolves the authenticated user from either owner Supabase session or staff PIN JWT.
 * Tries owner session first (Supabase Auth), falls back to staff JWT cookie.
 * Uses middleware-injected x-store-id header for tenant context when available.
 *
 * @returns Object with store_id and staff_id if authenticated, or null if not authenticated
 */
export async function resolveAuth(): Promise<{ store_id: string; staff_id: string } | null> {
  // Try owner Supabase session first
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.app_metadata?.store_id) {
    // Use middleware-injected x-store-id if available (tenant context from subdomain),
    // falling back to JWT store_id for backward compatibility
    const headerStore = await headers()
    const middlewareStoreId = headerStore.get('x-store-id')
    return {
      store_id: middlewareStoreId ?? user.app_metadata.store_id,
      staff_id: user.id,
    }
  }
  // Fall back to staff PIN JWT
  return resolveStaffAuth()
}

/**
 * Resolves staff-only authentication from the staff_session JWT cookie.
 * Does not check owner Supabase session — staff PIN sessions only.
 * Uses middleware-injected x-store-id header for tenant context when available.
 *
 * @returns Object with store_id, staff_id, and role if staff JWT is valid, or null if not authenticated
 */
export async function resolveStaffAuth(): Promise<{ store_id: string; staff_id: string; role: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const p = payload as { store_id: string; staff_id: string; role: string }
    // Use middleware-injected x-store-id if available, falling back to JWT store_id
    const headerStore = await headers()
    const middlewareStoreId = headerStore.get('x-store-id')
    return {
      store_id: middlewareStoreId ?? p.store_id,
      staff_id: p.staff_id,
      role: p.role,
    }
  } catch {
    return null
  }
}

/**
 * DB-verified staff auth for role-gated mutations.
 * Extends resolveStaffAuth() by querying the database for the live role and is_active status.
 *
 * Per STATE.md decision: "resolveStaffAuthVerified() does DB role lookup on all role-gated
 * mutations — never trust JWT role for writes."
 *
 * Returns null if:
 * - No staff session cookie exists
 * - Staff JWT is invalid or expired
 * - Staff record not found in DB (deleted)
 * - Staff is_active is false (deactivated)
 *
 * @returns Object with store_id, staff_id, and live role from DB, or null if not authorized
 */
export async function resolveStaffAuthVerified(): Promise<{
  store_id: string
  staff_id: string
  role: PosRole
} | null> {
  const staffAuth = await resolveStaffAuth()
  if (!staffAuth) return null

  const admin = createSupabaseAdminClient()
  const { data: staff } = await admin
    .from('staff')
    .select('role, is_active')
    .eq('id', staffAuth.staff_id)
    .eq('store_id', staffAuth.store_id)
    .single()

  if (!staff || staff.is_active === false) return null

  return {
    store_id: staffAuth.store_id,
    staff_id: staffAuth.staff_id,
    role: staff.role as PosRole,
  }
}
