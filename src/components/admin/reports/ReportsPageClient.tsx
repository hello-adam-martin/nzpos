'use client'

import { useSearchParams } from 'next/navigation'
import { ReportDateRangePicker } from './ReportDateRangePicker'
import { SalesBarChart } from './SalesBarChart'
import { ChannelBreakdownChart } from './ChannelBreakdownChart'
import { SalesSummaryTable } from './SalesSummaryTable'
import { TopProductsTable } from './TopProductsTable'
import { StockLevelsTable } from './StockLevelsTable'
import { GSTSummaryBlock } from './GSTSummaryBlock'
import { ExportCSVButton } from './ExportCSVButton'

interface DailyTotal {
  date: string
  totalCents: number
  orderCount: number
  posCount: number
  onlineCount: number
}

interface TopProduct {
  product_name: string
  totalQuantity: number
  totalRevenueCents: number
}

interface StockLevel {
  name: string
  sku: string | null
  stock_quantity: number
  reorder_threshold: number
}

interface GSTLineDetail {
  order_id: string
  product_name: string
  line_total_cents: number
  gst_cents: number
}

interface ReportsPageClientProps {
  preset: string
  customFrom?: string
  customTo?: string
  tab: string
  dailyTotals: DailyTotal[]
  topProducts: TopProduct[]
  stockLevels: StockLevel[]
  totalSalesCents: number
  totalGSTCents: number
  gstExclusiveCents: number
  refundedTotalCents: number
  refundedGSTCents: number
  gstLineDetail: GSTLineDetail[]
  posTotalCents: number
  onlineTotalCents: number
}

export function ReportsPageClient({
  preset,
  customFrom,
  customTo,
  tab,
  dailyTotals,
  topProducts,
  stockLevels,
  totalSalesCents,
  totalGSTCents,
  gstExclusiveCents,
  refundedTotalCents,
  refundedGSTCents,
  gstLineDetail,
  posTotalCents,
  onlineTotalCents,
}: ReportsPageClientProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? tab

  const hasData = dailyTotals.length > 0

  // Prepare CSV data for sales export
  const salesCSVData = dailyTotals.map(d => ({
    date: d.date,
    orders: d.orderCount,
    revenue_cents: d.totalCents,
    pos_orders: d.posCount,
    online_orders: d.onlineCount,
  }))

  const topProductsCSVData = topProducts.map(p => ({
    product_name: p.product_name,
    units_sold: p.totalQuantity,
    revenue_cents: p.totalRevenueCents,
  }))

  const stockCSVData = stockLevels.map(s => ({
    product: s.name,
    sku: s.sku ?? '',
    stock_quantity: s.stock_quantity,
    reorder_threshold: s.reorder_threshold,
  }))

  const gstCSVData = gstLineDetail.map(d => ({
    order_id: d.order_id,
    product_name: d.product_name,
    line_total_cents: d.line_total_cents,
    gst_cents: d.gst_cents,
  }))

  return (
    <div className="space-y-[var(--space-xl)]">
      <h1 className="font-display text-[2.25rem] font-bold text-primary">Reports</h1>

      <ReportDateRangePicker preset={preset} customFrom={customFrom} customTo={customTo} />

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-border pb-0">
        <TabButton href={buildHref({ preset, customFrom, customTo, tab: 'sales' })} active={activeTab === 'sales'}>
          Sales
        </TabButton>
        <TabButton href={buildHref({ preset, customFrom, customTo, tab: 'gst' })} active={activeTab === 'gst'}>
          GST Summary
        </TabButton>
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-[var(--space-xl)]">
          {!hasData && (
            <p className="text-muted text-sm py-[var(--space-xl)] text-center">
              No data for this period. Choose a different date range.
            </p>
          )}

          {hasData && (
            <>
              {/* Charts row */}
              <div className="grid grid-cols-3 gap-[var(--space-lg)]">
                <div className="col-span-2 bg-card rounded-lg border border-border p-[var(--space-md)]">
                  <h2 className="font-bold text-primary text-sm mb-[var(--space-md)]">Daily Sales</h2>
                  <SalesBarChart data={dailyTotals.map(d => ({ date: d.date, totalCents: d.totalCents }))} />
                </div>
                <div className="bg-card rounded-lg border border-border p-[var(--space-md)]">
                  <h2 className="font-bold text-primary text-sm mb-[var(--space-md)]">Channel Breakdown</h2>
                  <ChannelBreakdownChart posTotalCents={posTotalCents} onlineTotalCents={onlineTotalCents} />
                </div>
              </div>

              {/* Sales summary table */}
              <section>
                <div className="flex items-center justify-between mb-[var(--space-sm)]">
                  <h2 className="font-bold text-primary text-xl">Daily Summary</h2>
                  <ExportCSVButton data={salesCSVData} filename="sales-report" />
                </div>
                <SalesSummaryTable dailyTotals={dailyTotals} />
              </section>

              {/* Top products */}
              <section>
                <div className="flex items-center justify-between mb-[var(--space-sm)]">
                  <h2 className="font-bold text-primary text-xl">Top Products by Revenue</h2>
                  <ExportCSVButton data={topProductsCSVData} filename="top-products" />
                </div>
                {topProducts.length === 0 ? (
                  <p className="text-muted text-sm">No product sales in this period.</p>
                ) : (
                  <TopProductsTable products={topProducts} />
                )}
              </section>

              {/* Stock levels */}
              <section>
                <div className="flex items-center justify-between mb-[var(--space-sm)]">
                  <h2 className="font-bold text-primary text-xl">Stock Levels</h2>
                  <ExportCSVButton data={stockCSVData} filename="stock-levels" />
                </div>
                {stockLevels.length === 0 ? (
                  <p className="text-muted text-sm">No active products found.</p>
                ) : (
                  <StockLevelsTable products={stockLevels} />
                )}
              </section>
            </>
          )}
        </div>
      )}

      {activeTab === 'gst' && (
        <div className="space-y-[var(--space-lg)]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-primary text-xl">GST Summary</h2>
            <ExportCSVButton data={gstCSVData} filename="gst-report" label="Export GST CSV" />
          </div>
          {totalSalesCents === 0 && gstLineDetail.length === 0 ? (
            <p className="text-muted text-sm py-[var(--space-xl)] text-center">
              No data for this period. Choose a different date range.
            </p>
          ) : (
            <GSTSummaryBlock
              totalSalesCents={totalSalesCents}
              totalGSTCents={totalGSTCents}
              gstExclusiveCents={gstExclusiveCents}
              refundedTotalCents={refundedTotalCents}
              refundedGSTCents={refundedGSTCents}
              lineDetail={gstLineDetail}
            />
          )}
        </div>
      )}
    </div>
  )
}

function buildHref({ preset, customFrom, customTo, tab }: { preset: string; customFrom?: string; customTo?: string; tab: string }) {
  const params = new URLSearchParams()
  params.set('tab', tab)
  params.set('preset', preset)
  if (preset === 'custom' && customFrom) params.set('from', customFrom)
  if (preset === 'custom' && customTo) params.set('to', customTo)
  return `/admin/reports?${params.toString()}`
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
