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
import { CogsReportSummaryCards } from './CogsReportSummaryCards'
import { CogsReportTable } from './CogsReportTable'
import { CogsCategoryBreakdown } from './CogsCategoryBreakdown'
import { calculateMarginPercent } from '@/lib/cogs'
import type { CogsLineItem, CogsCategoryGroup } from '@/lib/cogs'

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
  hasInventory: boolean
  totalSalesCents: number
  totalGSTCents: number
  gstExclusiveCents: number
  refundedTotalCents: number
  refundedGSTCents: number
  gstLineDetail: GSTLineDetail[]
  posTotalCents: number
  onlineTotalCents: number
  hasAdvancedReporting: boolean
  cogsData: CogsLineItem[]
  cogsCategoryGroups: CogsCategoryGroup[]
  cogsCSVData: Array<Record<string, string | number>>
  fromDateStr: string
  toDateStr: string
}

export function ReportsPageClient({
  preset,
  customFrom,
  customTo,
  tab,
  dailyTotals,
  topProducts,
  stockLevels,
  hasInventory,
  totalSalesCents,
  totalGSTCents,
  gstExclusiveCents,
  refundedTotalCents,
  refundedGSTCents,
  gstLineDetail,
  posTotalCents,
  onlineTotalCents,
  hasAdvancedReporting,
  cogsData,
  cogsCategoryGroups,
  cogsCSVData,
  fromDateStr,
  toDateStr,
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

  const stockCSVData = hasInventory ? stockLevels.map(s => ({
    product: s.name,
    sku: s.sku ?? '',
    stock_quantity: s.stock_quantity,
    reorder_threshold: s.reorder_threshold,
  })) : []

  const gstCSVData = gstLineDetail.map(d => ({
    order_id: d.order_id,
    product_name: d.product_name,
    line_total_cents: d.line_total_cents,
    gst_cents: d.gst_cents,
  }))

  // COGS summary totals for Profit & Margin tab
  const cogsWithCost = cogsData.filter(d => d.hasCostPrice)
  const cogsWithCostRevenue = cogsWithCost.reduce((s, d) => s + d.revenueExclGstCents, 0)
  const totalRevenueExclGstCents = cogsData.reduce((s, d) => s + d.revenueExclGstCents, 0)
  const totalCostCents = cogsWithCost.reduce((s, d) => s + d.costCents, 0)
  const totalMarginCents = cogsWithCostRevenue - totalCostCents
  const overallMarginPercent = calculateMarginPercent(cogsWithCostRevenue, totalCostCents)

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
        {hasAdvancedReporting && (
          <TabButton href={buildHref({ preset, customFrom, customTo, tab: 'profit' })} active={activeTab === 'profit'}>
            Profit & Margin
          </TabButton>
        )}
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-[var(--space-xl)]">
          {!hasData && (
            <div className="py-[var(--space-xl)] text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface)] mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No sales data yet</p>
              <p className="text-sm text-[var(--color-text-muted)]">Try selecting a different date range, or make some sales first.</p>
            </div>
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

              {/* Stock levels — D-06: only shown when hasInventory is true */}
              {hasInventory && (
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
              )}
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
            <div className="py-[var(--space-xl)] text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface)] mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No GST data yet</p>
              <p className="text-sm text-[var(--color-text-muted)]">GST summaries will appear once you have sales in this period.</p>
            </div>
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
      {activeTab === 'profit' && hasAdvancedReporting && (
        <div className="space-y-[var(--space-xl)]">
          {cogsData.length === 0 ? (
            <div className="py-[var(--space-xl)] text-center">
              <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No sales data in this period</p>
              <p className="text-sm text-[var(--color-text-muted)]">Select a different date range to see profit and margin data.</p>
            </div>
          ) : cogsData.every(d => !d.hasCostPrice) ? (
            <div className="py-[var(--space-xl)] text-center">
              <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No cost prices set</p>
              <p className="text-sm text-[var(--color-text-muted)]">Add cost prices to your products to see margin calculations.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <CogsReportSummaryCards
                totalRevenueExclGstCents={totalRevenueExclGstCents}
                totalCostCents={totalCostCents}
                totalMarginCents={totalMarginCents}
                overallMarginPercent={overallMarginPercent}
              />

              {/* Profit by Product */}
              <section>
                <div className="flex items-center justify-between mb-[var(--space-sm)]">
                  <h2 className="font-bold text-primary text-xl">Profit by Product</h2>
                  <ExportCSVButton
                    data={cogsCSVData}
                    filename={`cogs-report-${fromDateStr}-to-${toDateStr}`}
                    label="Export COGS CSV"
                  />
                </div>
                <CogsReportTable data={cogsData} />
              </section>

              {/* Profit by Category */}
              <section>
                <h2 className="font-bold text-primary text-xl mb-[var(--space-sm)]">Profit by Category</h2>
                <CogsCategoryBreakdown data={cogsCategoryGroups} />
              </section>
            </>
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
