'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StockAdjustDrawer } from './StockAdjustDrawer'

interface StockProduct {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  stock_quantity: number
  reorder_threshold: number
  category_id: string | null
  categories: { name: string } | null
}

interface StockLevelsTabProps {
  products: StockProduct[]
}

function stockColorClass(stock: number, threshold: number): string {
  if (stock === 0) return 'text-error font-bold'
  if (stock <= threshold) return 'text-warning font-bold'
  return 'text-primary'
}

function isLowStock(stock: number, threshold: number): boolean {
  return stock <= threshold && stock > 0
}

export function StockLevelsTab({ products: initialProducts }: StockLevelsTabProps) {
  const [products, setProducts] = useState(initialProducts)
  const [adjustingProduct, setAdjustingProduct] = useState<StockProduct | null>(null)

  function handleAdjustSuccess(productId: string, newQuantity: number) {
    setProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, stock_quantity: newQuantity } : p)
    )
    setAdjustingProduct(null)
  }

  if (products.length === 0) {
    return (
      <div className="py-[var(--space-2xl)] text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm font-bold text-text mb-1">No physical products yet</p>
        <p className="text-sm text-muted mb-3">Add a product and set its type to Physical to track stock here.</p>
        <Link
          href="/admin/products"
          className="text-sm font-bold text-amber hover:text-amber/80 transition-colors"
        >
          Add product
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="px-4 py-3 text-left font-bold font-body">Product</th>
              <th className="px-4 py-3 text-left font-bold font-body">SKU</th>
              <th className="px-4 py-3 text-right font-bold font-body">Stock</th>
              <th className="px-4 py-3 text-right font-bold font-body">Reorder Threshold</th>
              <th className="px-4 py-3 text-right font-bold font-body">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, i) => {
              const lowStock = isLowStock(product.stock_quantity, product.reorder_threshold)
              return (
                <tr
                  key={product.id}
                  className={[
                    'border-t border-border group transition-colors duration-100',
                    i % 2 === 0 ? 'bg-card' : 'bg-surface',
                    lowStock ? 'border-l-4 border-amber' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 text-primary font-body">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-muted">{product.sku ?? '—'}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${stockColorClass(product.stock_quantity, product.reorder_threshold)}`}
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {product.stock_quantity}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono text-muted"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {product.reorder_threshold}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setAdjustingProduct(product)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity border border-border bg-transparent text-sm font-bold text-primary hover:bg-surface rounded-[var(--radius-md)] px-3 py-1.5"
                    >
                      Adjust stock
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {adjustingProduct && (
        <StockAdjustDrawer
          product={{
            id: adjustingProduct.id,
            name: adjustingProduct.name,
            stock_quantity: adjustingProduct.stock_quantity,
          }}
          onClose={() => setAdjustingProduct(null)}
          onSuccess={(newQuantity) => handleAdjustSuccess(adjustingProduct.id, newQuantity)}
        />
      )}
    </>
  )
}
