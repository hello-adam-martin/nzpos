import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POSClientShell } from '@/components/pos/POSClientShell'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export default async function PosPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('staff_session')?.value

  if (!sessionToken) {
    redirect('/pos/login')
  }

  let storeId: string
  let staffId: string
  let staffRole: 'owner' | 'staff'

  try {
    const { payload } = await jwtVerify(sessionToken, secret)
    storeId = payload.store_id as string
    staffId = payload.staff_id as string
    staffRole = payload.role as 'owner' | 'staff'
  } catch {
    redirect('/pos/login')
  }

  const supabase = createSupabaseAdminClient()

  const [productsResult, categoriesResult, staffResult, storeResult, staffListResult, storePlanResult] =
    await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order'),
      supabase
        .from('staff')
        .select('id, name')
        .eq('id', staffId)
        .single(),
      supabase
        .from('stores')
        .select('id, name')
        .eq('id', storeId)
        .single(),
      // Fetch all active staff for out-of-stock owner PIN override
      supabase
        .from('staff')
        .select('id, name, role')
        .eq('store_id', storeId)
        .eq('is_active', true),
      // Query store_plans for hasInventory and hasLoyalty (POS uses staff JWT, not Supabase auth)
      supabase
        .from('store_plans')
        .select('has_inventory, has_loyalty_points')
        .eq('store_id', storeId)
        .single(),
    ])

  const products = productsResult.data ?? []
  const categories = categoriesResult.data ?? []
  const staffName = staffResult.data?.name ?? 'Staff'
  const storeName = storeResult.data?.name ?? 'NZPOS'
  const staffList = (staffListResult.data ?? []) as { id: string; name: string; role: 'owner' | 'staff' }[]
  const hasInventory = storePlanResult.data?.has_inventory === true
  const hasLoyalty = storePlanResult.data?.has_loyalty_points === true

  let redeemRateCents = 1
  if (hasLoyalty) {
    const { data: loyaltySettings } = await supabase
      .from('loyalty_settings')
      .select('redeem_rate_cents')
      .eq('store_id', storeId)
      .single()
    redeemRateCents = loyaltySettings?.redeem_rate_cents ?? 1
  }

  return (
    <POSClientShell
      products={products}
      categories={categories}
      staffName={staffName}
      staffRole={staffRole}
      storeName={storeName}
      storeId={storeId}
      staffList={staffList}
      hasInventory={hasInventory}
      hasLoyalty={hasLoyalty}
      redeemRateCents={redeemRateCents}
    />
  )
}
