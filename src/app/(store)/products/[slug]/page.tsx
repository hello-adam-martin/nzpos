// Server Component — no 'use client'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNZD } from '@/lib/money'
import { SoldOutBadge } from '@/components/store/SoldOutBadge'
import { StockNotice } from '@/components/store/StockNotice'
import { AddToCartButton } from '@/components/store/AddToCartButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('store_id', process.env.STORE_ID!)
    .eq('is_active', true)
    .single()
  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Product Not Found' }
  return {
    title: `${product.name} | Shop`,
    description: product.name,
    openGraph: {
      title: product.name,
      images: product.image_url ? [product.image_url] : [],
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const isSoldOut = product.stock_quantity <= 0
  const isLowStock =
    product.stock_quantity > 0 &&
    product.stock_quantity <= product.reorder_threshold

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
      {/* Image column */}
      <div className="aspect-square relative rounded-lg overflow-hidden bg-surface">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : (
          <div
            className="w-full h-full bg-surface flex items-center justify-center"
            aria-label={`No image for ${product.name}`}
          >
            <span className="text-text-light text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Details column */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-navy">{product.name}</h1>

        <p className="text-base font-semibold text-amber tabular-nums">
          {formatNZD(product.price_cents)}
        </p>

        {/* Stock status */}
        {isSoldOut && (
          <div className="inline-flex">
            <span className="bg-error text-white text-sm font-semibold px-2 py-1 rounded-md">
              Sold Out
            </span>
          </div>
        )}
        {isLowStock && (
          <StockNotice
            stockQuantity={product.stock_quantity}
            reorderThreshold={product.reorder_threshold}
          />
        )}

        {/* Description placeholder */}
        <p className="text-base text-navy/80 mt-4">
          Contact us for more details.
        </p>

        {/* Add to Cart — Client Component */}
        <div className="mt-2">
          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              price_cents: product.price_cents,
              image_url: product.image_url,
              slug: product.slug,
              stock_quantity: product.stock_quantity,
            }}
          />
        </div>
      </div>
    </div>
  )
}
