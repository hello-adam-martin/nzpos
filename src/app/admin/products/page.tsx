import { createSupabaseServerClient } from '@/lib/supabase/server'
import ProductsPageClient from '@/components/admin/products/ProductsPageClient'

export default async function ProductsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const hasInventory = (user?.app_metadata?.inventory as boolean | undefined) === true

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(name)')
      .order('name'),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order'),
  ])

  return (
    <ProductsPageClient
      products={products ?? []}
      categories={categories ?? []}
      hasInventory={hasInventory}
    />
  )
}
