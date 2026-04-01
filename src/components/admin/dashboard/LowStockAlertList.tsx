import Link from 'next/link'

interface LowStockProduct {
  name: string
  stock_quantity: number
  reorder_threshold: number
}

interface LowStockAlertListProps {
  products: LowStockProduct[]
}

export function LowStockAlertList({ products }: LowStockAlertListProps) {
  const displayProducts = products.slice(0, 10)
  const hasMore = products.length > 10

  return (
    <section>
      <h2 className="font-display font-bold text-xl text-[var(--color-text)] mb-[var(--space-md)]">
        Low Stock Alerts
      </h2>

      {products.length === 0 ? (
        <p className="font-sans font-normal text-sm text-[var(--color-text-muted)]">
          All products are well-stocked.
        </p>
      ) : (
        <ul className="space-y-[var(--space-sm)]">
          {displayProducts.map((product) => {
            const stockColor =
              product.stock_quantity === 0
                ? 'text-[var(--color-error)]'
                : 'text-[var(--color-warning)]'

            return (
              <li
                key={product.name}
                className="flex items-center gap-[var(--space-md)] border border-[var(--color-border)] rounded-lg px-[var(--space-md)] py-[var(--space-sm)] bg-white"
              >
                <span className="font-sans font-bold text-sm text-[var(--color-text)] flex-1">
                  {product.name}
                </span>
                <span
                  className={`font-mono text-sm ${stockColor}`}
                  style={{ fontFeatureSettings: "'tnum' 1" }}
                >
                  {product.stock_quantity}
                </span>
                <span className="font-sans font-normal text-sm text-[var(--color-text-muted)]">
                  / {product.reorder_threshold} threshold
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mt-[var(--space-md)]">
          <Link
            href="/admin/products?filter=low_stock"
            className="font-sans font-bold text-sm text-[var(--color-amber)] hover:text-[var(--color-amber-hover)]"
          >
            View all {products.length} low stock items
          </Link>
        </div>
      )}
    </section>
  )
}
