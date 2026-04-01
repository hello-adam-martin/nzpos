import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrdersPageClient } from '@/components/admin/orders/OrdersPageClient'
import type { OrderWithStaff } from '@/components/admin/orders/OrderDataTable'
import type { Database } from '@/types/database'

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    channel?: string
    payment_method?: string
    from?: string
    to?: string
    q?: string
    sort?: string
    dir?: string
  }>
}

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']
type OrderChannel = Database['public']['Tables']['orders']['Row']['channel']
type PaymentMethod = Database['public']['Tables']['orders']['Row']['payment_method']

const VALID_STATUSES = new Set<string>([
  'pending', 'completed', 'refunded', 'expired', 'pending_pickup', 'ready', 'collected',
])
const VALID_CHANNELS = new Set<string>(['pos', 'online'])
const VALID_PAYMENT_METHODS = new Set<string>(['eftpos', 'cash', 'stripe'])

const PAGE_SIZE = 50

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) redirect('/admin/login')

  const page = Math.max(1, parseInt(params.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE
  const sortColumn = params.sort ?? 'created_at'
  const sortDir = params.dir === 'asc'

  let query = supabase
    .from('orders')
    .select('*, staff(name), order_items(*)', { count: 'exact' })
    .eq('store_id', storeId)
    .order(sortColumn, { ascending: sortDir })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.status && VALID_STATUSES.has(params.status)) {
    query = query.eq('status', params.status as OrderStatus)
  }
  if (params.channel && VALID_CHANNELS.has(params.channel)) {
    query = query.eq('channel', params.channel as OrderChannel)
  }
  if (params.payment_method && VALID_PAYMENT_METHODS.has(params.payment_method)) {
    query = query.eq('payment_method', params.payment_method as NonNullable<PaymentMethod>)
  }
  if (params.from) query = query.gte('created_at', params.from)
  if (params.to) query = query.lte('created_at', params.to)
  if (params.q) query = query.ilike('id', `%${params.q}%`)

  const { data: orders, count } = await query

  return (
    <div className="space-y-[var(--space-lg)]">
      <h1 className="font-display text-[2.25rem] font-bold text-primary">Orders</h1>
      <OrdersPageClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orders={(orders ?? []) as unknown as OrderWithStaff[]}
        totalCount={count ?? 0}
        currentPage={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
