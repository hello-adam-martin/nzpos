'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

export type CustomerListItem = {
  id: string
  name: string | null
  email: string
  is_active: boolean
  created_at: string
  auth_user_id: string
  orderCount: number
  points_balance: number
}

/**
 * Returns the list of customers for the owner's store with order counts.
 * Owner-only.
 */
export async function getCustomers(): Promise<{ data: CustomerListItem[] } | { error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()

  const { data: customers, error } = await adminClient
    .from('customers')
    .select('id, name, email, is_active, created_at, auth_user_id')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) return { error: "Couldn't load customers. Refresh the page to try again." }

  const { data: orderCounts } = await adminClient
    .from('orders')
    .select('customer_id')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected', 'refunded'])

  const countMap: Record<string, number> = {}
  for (const o of orderCounts ?? []) {
    if (o.customer_id) countMap[o.customer_id] = (countMap[o.customer_id] ?? 0) + 1
  }

  // Batch-fetch loyalty points balances for all customers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyClient = adminClient as any
  const customerIds = (customers ?? []).map(c => c.id)
  const loyaltyMap = new Map<string, number>()
  if (customerIds.length > 0) {
    const { data: loyaltyRows } = await anyClient
      .from('loyalty_points')
      .select('customer_id, points_balance')
      .eq('store_id', storeId)
      .in('customer_id', customerIds)
    for (const row of (loyaltyRows ?? []) as Array<{ customer_id: string; points_balance: number }>) {
      loyaltyMap.set(row.customer_id, row.points_balance)
    }
  }

  return {
    data: (customers ?? []).map(c => ({
      ...c,
      name: c.name,
      orderCount: countMap[c.auth_user_id] ?? 0,
      points_balance: loyaltyMap.get(c.id) ?? 0,
    })),
  }
}
