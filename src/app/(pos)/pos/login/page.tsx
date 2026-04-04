import 'server-only'
import { headers } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PinLoginForm } from '@/components/pos/PinLoginForm'

export const dynamic = 'force-dynamic'

export default async function PosLoginPage() {
  const supabase = createSupabaseAdminClient()

  // Resolve store from middleware-injected tenant header (subdomain-based)
  const headersList = await headers()
  const storeId = headersList.get('x-store-id')

  let store: { id: string; name: string } | null = null

  if (storeId) {
    const { data } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', storeId)
      .single()
    store = data
  }

  if (!store) {
    return (
      <main className="flex h-full items-center justify-center bg-navy-dark">
        <p className="text-white text-lg">No store configured. Please complete owner signup first.</p>
      </main>
    )
  }

  // Fetch active staff for this store
  const { data: staffList } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('name')

  return <PinLoginForm storeId={store.id} storeName={store.name} staffList={staffList ?? []} />
}
