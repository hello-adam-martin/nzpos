// Server Component — no 'use client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CategoryPillBar } from '@/components/store/CategoryPillBar'
import { StoreProductGrid } from '@/components/store/StoreProductGrid'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function StorePage({ searchParams }: PageProps) {
  const { category, q } = await searchParams

  const supabase = await createSupabaseServerClient()

  // Query store_plans for hasInventory (storefront has no auth session)
  const { data: storePlan } = await supabase
    .from('store_plans')
    .select('has_inventory')
    .eq('store_id', process.env.STORE_ID!)
    .single()
  const hasInventory = storePlan?.has_inventory === true

  // Fetch categories for the pill bar
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', process.env.STORE_ID!)
    .order('sort_order')

  // Build product query
  let query = supabase
    .from('products')
    .select('id, name, slug, price_cents, image_url, stock_quantity, reorder_threshold, category_id, product_type')
    .eq('store_id', process.env.STORE_ID!)
    .eq('is_active', true)
    .order('name')

  if (category && category !== 'all') {
    query = query.eq('category_id', category)
  }

  if (q) {
    // Sanitize search input to prevent PostgREST filter injection
    const sanitized = q.replace(/[,().*%\\]/g, '')
    if (sanitized.length > 0) {
      query = query.or(`name.ilike.%${sanitized}%,sku.ilike.%${sanitized}%`)
    }
  }

  const { data: rawProducts } = await query

  const products = (rawProducts ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.price_cents,
    imageUrl: p.image_url,
    stockQuantity: p.stock_quantity,
    reorderThreshold: p.reorder_threshold,
    productType: p.product_type,
  }))

  return (
    <div className="py-6">
      <h1 className="font-display text-4xl font-semibold text-navy mb-4">
        Shop
      </h1>

      <CategoryPillBar
        categories={categories ?? []}
        activeCategory={category ?? null}
      />

      <div className="mt-4">
        <StoreProductGrid
          products={products}
          hasSearch={!!q}
          hasCategory={!!category && category !== 'all'}
          hasInventory={hasInventory}
        />
      </div>
    </div>
  )
}
