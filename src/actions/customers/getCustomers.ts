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

  return {
    data: (customers ?? []).map(c => ({
      ...c,
      name: c.name,
      orderCount: countMap[c.auth_user_id] ?? 0,
    })),
  }
}
