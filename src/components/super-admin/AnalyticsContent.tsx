'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeroCard } from '@/components/admin/dashboard/DashboardHeroCard'
import MrrTrendChart from '@/components/super-admin/MrrTrendChart'
import AddonRevenueChart from '@/components/super-admin/AddonRevenueChart'
import AnalyticsSyncControls from '@/components/super-admin/AnalyticsSyncControls'

interface MrrTrendPoint {
  month: string
  mrr: number
}

interface AddonRevenuePoint {
  name: string
  mrr: number
}

interface AnalyticsContentProps {
  formattedMrr: string
  churnCount: number
  activeCount: number
  mrrTrendData: MrrTrendPoint[]
  addonRevenueData: AddonRevenuePoint[]
  lastSyncedAt: string | null
}

export default function AnalyticsContent({
  formattedMrr,
  churnCount,
  activeCount,
  mrrTrendData,
  addonRevenueData,
  lastSyncedAt,
}: AnalyticsContentProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)

  function handleSyncStart() {
    setIsSyncing(true)
  }

  function handleSyncComplete() {
    setIsSyncing(false)
    router.refresh()
  }

  return (
    <div>
      {/* Heading row: title left, sync controls right */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="font-display text-xl font-semibold text-[var(--color-text)]">Analytics</h1>
        <AnalyticsSyncControls
          lastSyncedAt={lastSyncedAt}
          onSyncStart={handleSyncStart}
          onSyncComplete={handleSyncComplete}
        />
      </div>

      {/* Data section — dims during sync */}
      <div
        className={`transition-opacity duration-150 ${isSyncing ? 'opacity-50' : 'opacity-100'}`}
      >
        {/* Stat cards — PRIMARY FOCAL POINT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-[var(--space-2xl)]">
          <DashboardHeroCard
            label="Current MRR"
            value={formattedMrr}
            subLabel="Annual plans normalised to monthly"
          />
          <DashboardHeroCard
            label="Monthly Churn"
            value={String(churnCount)}
            subLabel="Cancelled this month"
          />
          <DashboardHeroCard
            label="Active Subscriptions"
            value={String(activeCount)}
          />
        </div>

        {/* MRR trend chart */}
        <div className="mb-[var(--space-2xl)]">
          <MrrTrendChart data={mrrTrendData} />
        </div>

        {/* Add-on revenue chart */}
        <AddonRevenueChart data={addonRevenueData} />
      </div>
    </div>
  )
}
