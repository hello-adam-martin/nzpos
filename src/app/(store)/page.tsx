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

  // Fetch categories for the pill bar
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', process.env.STORE_ID!)
    .order('sort_order')

  // Build product query
  let query = supabase
    .from('products')
    .select('id, name, slug, price_cents, image_url, stock_quantity, reorder_threshold, category_id')
    .eq('store_id', process.env.STORE_ID!)
    .eq('is_active', true)
    .order('name')

  if (category && category !== 'all') {
    query = query.eq('category_id', category)
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
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
        />
      </div>
    </div>
  )
}
