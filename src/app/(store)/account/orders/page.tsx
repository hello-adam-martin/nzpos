import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OrderHistoryCard } from '@/components/store/OrderHistoryCard'

export const metadata = {
  title: 'My Orders | NZPOS',
}

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'customer') {
    redirect('/account/signin')
  }

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, created_at, status, total_cents, order_items(id)')
    .order('created_at', { ascending: false })

  type OrderRow = {
    id: string
    created_at: string
    status: string
    total_cents: number
    order_items: { id: string }[]
  }

  const orders: OrderRow[] = (ordersRaw as OrderRow[] | null) ?? []

  return (
    <div className="max-w-[800px] mx-auto py-8">
      <h1 className="text-2xl font-semibold text-text mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-base font-semibold text-text mb-2">No orders yet</p>
          <p className="text-sm text-text-muted">Orders you place will appear here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.slice(0, 20).map((order) => (
              <OrderHistoryCard
                key={order.id}
                order={{
                  id: order.id,
                  created_at: order.created_at,
                  status: order.status,
                  total_cents: order.total_cents,
                  item_count: order.order_items.length,
                }}
              />
            ))}
          </div>

          {orders.length > 20 && (
            <div className="mt-6 text-center">
              {/* Load more is client-side; for now show a note */}
              <p className="text-sm text-text-muted">
                Showing 20 of {orders.length} orders.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
