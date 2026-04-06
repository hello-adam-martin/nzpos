'use client'

import { useState } from 'react'
import { formatNZD } from '@/lib/money'
import type { CogsCategoryGroup } from '@/lib/cogs'

interface CogsCategoryBreakdownProps {
  data: CogsCategoryGroup[]
}

function marginPercentColorClass(value: number | null): string {
  if (value === null) return 'text-muted'
  if (value > 30) return 'text-success'
  if (value >= 15) return 'text-primary'
  if (value >= 0) return 'text-warning'
  return 'text-error'
}

export function CogsCategoryBreakdown({ data }: CogsCategoryBreakdownProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  function toggleCategory(name: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy text-white">
            <th className="px-4 py-3 text-left font-bold">Category</th>
            <th className="px-4 py-3 text-right font-bold">Units Sold</th>
            <th className="px-4 py-3 text-right font-bold">Revenue</th>
            <th className="px-4 py-3 text-right font-bold">Cost</th>
            <th className="px-4 py-3 text-right font-bold">Margin $</th>
            <th className="px-4 py-3 text-right font-bold">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((group) => {
            const isExpanded = expandedCategories.has(group.categoryName)
            return (
              <>
                {/* Category row */}
                <tr
                  key={`cat-${group.categoryName}`}
                  className="cursor-pointer hover:bg-surface bg-card border-t border-border"
                  onClick={() => toggleCategory(group.categoryName)}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary flex items-center gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        <polyline points="6,4 10,8 6,12" />
                      </svg>
                      {group.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary">{group.totalUnitsSold}</td>
                  <td className="px-4 py-3 text-right font-mono text-primary">
                    {formatNZD(group.totalRevenueExclGstCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary">
                    {formatNZD(group.totalCostCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-primary">
                    {group.totalMarginCents !== null ? (
                      <span className={group.totalMarginCents < 0 ? 'text-error' : 'text-primary'}>
                        {formatNZD(group.totalMarginCents)}
                      </span>
                    ) : (
                      <span className="text-muted">---</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${marginPercentColorClass(group.marginPercent)}`}>
                    {group.marginPercent !== null ? `${group.marginPercent.toFixed(1)}%` : '---'}
                  </td>
                </tr>

                {/* Product sub-rows (when expanded) */}
                {isExpanded &&
                  group.products.map((product) => (
                    <tr
                      key={`prod-${group.categoryName}-${product.productId ?? product.productName}`}
                      className="bg-surface border-t border-border/50 text-sm"
                    >
                      <td className="pl-10 pr-4 py-2 text-muted">{product.productName}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted">{product.unitsSold}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted">
                        {formatNZD(product.revenueExclGstCents)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-muted">
                        {product.hasCostPrice ? formatNZD(product.costCents) : <span>---</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-muted">
                        {product.marginCents !== null ? formatNZD(product.marginCents) : <span>---</span>}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${marginPercentColorClass(product.marginPercent)}`}>
                        {product.marginPercent !== null ? `${product.marginPercent.toFixed(1)}%` : '---'}
                      </td>
                    </tr>
                  ))}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
