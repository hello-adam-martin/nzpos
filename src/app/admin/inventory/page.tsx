import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStockLevels } from '@/actions/inventory/getStockLevels'
import { InventoryPageClient } from '@/components/admin/inventory/InventoryPageClient'

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
