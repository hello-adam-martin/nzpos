import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStockLevels } from '@/actions/inventory/getStockLevels'
import { InventoryPageClient } from '@/components/admin/inventory/InventoryPageClient'
import { InventoryUpgradeWall } from '@/components/admin/inventory/InventoryUpgradeWall'

export const dynamic = 'force-dynamic'

interface InventoryPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasInventory = !!(user?.app_metadata as any)?.inventory

  if (!hasInventory) {
    return <InventoryUpgradeWall />
  }

  const params = await searchParams
  const tab = params.tab ?? 'stock-levels'

  const result = await getStockLevels()
  const products = 'success' in result && result.success ? result.products : []

  return (
    <InventoryPageClient
      products={products}
      initialTab={tab}
    />
  )
}
