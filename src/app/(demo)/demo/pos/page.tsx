import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DEMO_STORE_ID } from '@/lib/constants'
import { POSClientShell } from '@/components/pos/POSClientShell'

export default async function DemoPosPage() {
  const supabase = createSupabaseAdminClient()

  const [productsResult, categoriesResult, storeResult] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('store_id', DEMO_STORE_ID)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('categories')
      .select('*')
      .eq('store_id', DEMO_STORE_ID)
      .order('sort_order'),
    supabase
      .from('stores')
      .select('id, name, address, phone, gst_number')
      .eq('id', DEMO_STORE_ID)
      .single(),
  ])

  return (
    <POSClientShell
      products={productsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      staffName="Demo"
      staffRole="staff"
      storeName={storeResult.data?.name ?? 'Aroha Home & Gift'}
      storeId={DEMO_STORE_ID}
      staffList={[]}
      hasInventory={false}
      demoMode={true}
      demoStore={
        storeResult.data ?? {
          name: 'Aroha Home & Gift',
          address: '123 Demo St, Wellington',
          phone: null,
          gst_number: null,
        }
      }
    />
  )
}
