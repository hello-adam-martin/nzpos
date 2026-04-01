import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PickupOrderCard } from '@/components/pos/PickupOrderCard'
import { PickupsShell } from '@/components/pos/PickupsShell'

export const dynamic = 'force-dynamic'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export default async function PickupsPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('staff_session')?.value

  if (!sessionToken) {
    redirect('/pos/login')
  }

  let storeId: string
  let staffId: string

  try {
    const { payload } = await jwtVerify(sessionToken, secret)
    storeId = payload.store_id as string
    staffId = payload.staff_id as string
  } catch {
    redirect('/pos/login')
  }

  const supabase = createSupabaseAdminClient()

  const [staffResult, storeResult] = await Promise.all([
    supabase.from('staff').select('name').eq('id', staffId).single(),
    supabase.from('stores').select('name').eq('id', storeId).single(),
  ])

  const staffName = staffResult.data?.name ?? 'Staff'
  const storeName = storeResult.data?.name ?? 'NZPOS'

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_cents, customer_email, created_at, order_items(product_name, quantity)')
    .eq('store_id', storeId)
    .eq('channel', 'online')
    .in('status', ['pending_pickup', 'ready'])
    .order('created_at', { ascending: true })

  const allOrders = (orders ?? []).map((o) => ({
    id: o.id,
    status: o.status,
    total_cents: o.total_cents,
    customer_email: o.customer_email,
    created_at: o.created_at,
    items: (o.order_items as { product_name: string; quantity: number }[]) ?? [],
  }))

  const awaitingPickup = allOrders.filter((o) => o.status === 'pending_pickup')
  const readyForCollection = allOrders.filter((o) => o.status === 'ready')

  return (
    <PickupsShell storeName={storeName} staffName={staffName}>
      <div className="flex flex-col flex-1 overflow-y-auto bg-bg p-6">
        <h1 className="font-display font-bold text-2xl text-text mb-6">Pickups</h1>

        {allOrders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted text-lg">No pending pickups</p>
          </div>
        ) : (
          <div className="space-y-8">
            {awaitingPickup.length > 0 && (
              <section>
                <h2 className="font-sans font-semibold text-sm uppercase tracking-wide text-muted mb-3">
                  Awaiting Pickup
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {awaitingPickup.map((order) => (
                    <PickupOrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}

            {readyForCollection.length > 0 && (
              <section>
                <h2 className="font-sans font-semibold text-sm uppercase tracking-wide text-muted mb-3">
                  Ready for Collection
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {readyForCollection.map((order) => (
                    <PickupOrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PickupsShell>
  )
}
