'use client'

interface StockProduct {
  name: string
  sku: string | null
  stock_quantity: number
  reorder_threshold: number
}

interface StockLevelsTableProps {
  products: StockProduct[]
}

function stockColor(stock: number, threshold: number): string {
  if (stock === 0) return 'text-error font-bold'
  if (stock <= threshold) return 'text-warning font-bold'
  return 'text-primary'
}

export function StockLevelsTable({ products }: StockLevelsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy text-white">
            <th className="px-4 py-3 text-left font-bold">Product</th>
            <th className="px-4 py-3 text-left font-bold">SKU</th>
            <th className="px-4 py-3 text-right font-bold">Stock</th>
            <th className="px-4 py-3 text-right font-bold">Reorder Threshold</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, i) => (
            <tr
              key={product.name}
              className={`border-t border-border ${i % 2 === 0 ? 'bg-card' : 'bg-surface'}`}
            >
              <td className="px-4 py-3 text-primary">{product.name}</td>
              <td className="px-4 py-3 font-mono text-muted">{product.sku ?? '—'}</td>
              <td className={`px-4 py-3 text-right font-mono ${stockColor(product.stock_quantity, product.reorder_threshold)}`}>
                {product.stock_quantity}
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted">{product.reorder_threshold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
