'use client'

import { useSearchParams } from 'next/navigation'
import { StockLevelsTab } from './StockLevelsTab'
import { StocktakesTab } from './StocktakesTab'
import { InventoryHistoryTab } from './InventoryHistoryTab'

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

interface InventoryPageClientProps {
  products: StockProduct[]
  initialTab: string
}

function TabButton({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
        active
          ? 'border-navy text-navy'
          : 'border-transparent text-muted hover:text-primary hover:border-border'
      }`}
    >
      {children}
    </a>
  )
}

export function InventoryPageClient({ products, initialTab }: InventoryPageClientProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? initialTab

  return (
    <div className="space-y-[var(--space-xl)]">
      <h1 className="font-display text-[2.25rem] font-bold text-primary">Inventory</h1>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-border pb-0">
        <TabButton href="/admin/inventory?tab=stock-levels" active={activeTab === 'stock-levels'}>
          Stock Levels
        </TabButton>
        <TabButton href="/admin/inventory?tab=stocktakes" active={activeTab === 'stocktakes'}>
          Stocktakes
        </TabButton>
        <TabButton href="/admin/inventory?tab=history" active={activeTab === 'history'}>
          History
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === 'stock-levels' && (
        <StockLevelsTab products={products} />
      )}

      {activeTab === 'stocktakes' && (
        <StocktakesTab />
      )}

      {activeTab === 'history' && (
        <InventoryHistoryTab />
      )}
    </div>
  )
}
