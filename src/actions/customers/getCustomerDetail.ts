'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

export type CustomerDetail = {
  id: string
  name: string | null
  email: string
  is_active: boolean
  created_at: string
  auth_user_id: string
}

export type CustomerOrder = {
  id: string
  created_at: string
  total_cents: number
  status: string
}

export type LoyaltyTransaction = {
  id: string
  points_delta: number
  balance_after: number
  transaction_type: string
  order_id: string | null
  channel: string | null
  staff_id: string | null
  created_at: string
}

export type CustomerLoyalty = {
  pointsBalance: number
  transactions: LoyaltyTransaction[]
}

/**
 * Returns customer profile and order history for the given customer ID.
 * Owner-only.
 */
export async function getCustomerDetail(
  customerId: string
): Promise<{ data: { customer: CustomerDetail; orders: CustomerOrder[]; loyalty: CustomerLoyalty; hasLoyaltyPoints: boolean } } | { error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()

  const { data: customer, error: customerError } = await adminClient
    .from('customers')
    .select('id, name, email, is_active, created_at, auth_user_id')
    .eq('id', customerId)
    .eq('store_id', storeId)
    .single()

  if (customerError || !customer) return { error: 'Customer not found' }

  const { data: orders, error: ordersError } = await adminClient
    .from('orders')
    .select('id, created_at, total_cents, status')
    .eq('store_id', storeId)
    .eq('customer_id', customer.auth_user_id)
    .order('created_at', { ascending: false })

  if (ordersError) return { error: 'Failed to load order history' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyClient = adminClient as any

  // Check loyalty add-on subscription
  const { data: storePlan } = await anyClient
    .from('store_plans')
    .select('has_loyalty_points')
    .eq('store_id', storeId)
    .maybeSingle() as { data: { has_loyalty_points: boolean } | null }
  const hasLoyaltyPoints = storePlan?.has_loyalty_points === true

  // Fetch loyalty balance
  const { data: loyaltyRow } = await anyClient
    .from('loyalty_points')
    .select('points_balance')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .maybeSingle() as { data: { points_balance: number } | null }

  // Fetch loyalty transactions (most recent 50)
  const { data: loyaltyTransactions } = await anyClient
    .from('loyalty_transactions')
    .select('id, points_delta, balance_after, transaction_type, order_id, channel, staff_id, created_at')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50) as { data: LoyaltyTransaction[] | null }

  return {
    data: {
      customer,
      orders: (orders ?? []) as CustomerOrder[],
      loyalty: {
        pointsBalance: loyaltyRow?.points_balance ?? 0,
        transactions: loyaltyTransactions ?? [],
      },
      hasLoyaltyPoints,
    },
  }
}
