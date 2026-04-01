'use client'

import { formatNZD } from '@/lib/money'

interface TopProduct {
  product_name: string
  totalQuantity: number
  totalRevenueCents: number
}

interface TopProductsTableProps {
  products: TopProduct[]
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy text-white">
            <th className="px-4 py-3 text-left font-bold">#</th>
            <th className="px-4 py-3 text-left font-bold">Product Name</th>
            <th className="px-4 py-3 text-right font-bold">Units Sold</th>
            <th className="px-4 py-3 text-right font-bold">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, i) => (
            <tr
              key={product.product_name}
              className={`border-t border-border ${i % 2 === 0 ? 'bg-card' : 'bg-surface'}`}
            >
              <td className="px-4 py-3 text-muted font-mono">{i + 1}</td>
              <td className="px-4 py-3 text-primary">{product.product_name}</td>
              <td className="px-4 py-3 text-right font-mono text-primary">{product.totalQuantity}</td>
              <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(product.totalRevenueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
