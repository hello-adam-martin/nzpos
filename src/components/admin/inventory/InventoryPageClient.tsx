'use client'

import { useSearchParams } from 'next/navigation'
import { StockLevelsTab } from './StockLevelsTab'
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
        <div className="py-[var(--space-2xl)] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <p className="text-sm font-bold text-text mb-1">No stocktakes yet</p>
          <p className="text-sm text-muted">Run a stocktake to count your stock on hand and catch any discrepancies.</p>
        </div>
      )}

      {activeTab === 'history' && (
        <InventoryHistoryTab />
      )}
    </div>
  )
}
