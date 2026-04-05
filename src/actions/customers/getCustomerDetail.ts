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

/**
 * Returns customer profile and order history for the given customer ID.
 * Owner-only.
 */
export async function getCustomerDetail(
  customerId: string
): Promise<{ data: { customer: CustomerDetail; orders: CustomerOrder[] } } | { error: string }> {
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

  return {
    data: {
      customer,
      orders: (orders ?? []) as CustomerOrder[],
    },
  }
}
