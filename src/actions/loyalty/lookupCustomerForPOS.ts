'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

const lookupSchema = z.object({
  query: z.string().min(2),
})

export type CustomerPOSResult = {
  id: string
  name: string
  email: string
  points_balance: number
}

/**
 * Type-ahead customer search for POS checkout.
 *
 * Searches customers by name or email (case-insensitive, partial match).
 * Includes loyalty_points balance via LEFT JOIN.
 *
 * @param input - Object with `query` (min 2 chars) and `storeId`
 * @returns Array of matching customers with points balance, or error string
 */
export async function lookupCustomerForPOS(
  input: unknown
): Promise<{ data: CustomerPOSResult[] } | { error: string }> {
  const parsed = lookupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Query must be at least 2 characters' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Allow owner and POS staff roles
  const role = user.app_metadata?.role as string | undefined
  const validRoles = [POS_ROLES.OWNER, POS_ROLES.MANAGER, POS_ROLES.STAFF]
  if (!role || !validRoles.includes(role as (typeof validRoles)[number])) {
    return { error: 'INSUFFICIENT_ROLE' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()
  const { query } = parsed.data

  // Fetch customers matching name or email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customers, error: customerError } = await (adminClient as any)
    .from('customers')
    .select('id, name, email')
    .eq('store_id', storeId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10) as {
      data: Array<{ id: string; name: string | null; email: string }> | null
      error: { message: string } | null
    }

  if (customerError) return { error: "Couldn't search customers. Please try again." }
  if (!customers || customers.length === 0) return { data: [] }

  // Fetch loyalty points balances for matched customers
  const customerIds = customers.map(c => c.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: points } = await (adminClient as any)
    .from('loyalty_points')
    .select('customer_id, points_balance')
    .eq('store_id', storeId)
    .in('customer_id', customerIds) as {
      data: Array<{ customer_id: string; points_balance: number }> | null
      error: { message: string } | null
    }

  const pointsMap: Record<string, number> = {}
  for (const p of points ?? []) {
    pointsMap[p.customer_id] = p.points_balance
  }

  return {
    data: customers.map(c => ({
      id: c.id,
      name: c.name ?? '',
      email: c.email,
      points_balance: pointsMap[c.id] ?? 0,
    })),
  }
}
