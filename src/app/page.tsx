import type { Metadata } from 'next'
import LandingNav from './(marketing)/components/LandingNav'
import LandingHero from './(marketing)/components/LandingHero'
import LandingFeatures from './(marketing)/components/LandingFeatures'
import LandingPricing from './(marketing)/components/LandingPricing'
import LandingCTA from './(marketing)/components/LandingCTA'
import LandingNZCallout from './(marketing)/components/LandingNZCallout'
import LandingFooter from './(marketing)/components/LandingFooter'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'NZPOS — The retail platform built for Kiwi businesses',
  description:
    'Sell in-store and online from one dashboard. GST handled correctly on every transaction. Free to start.',
}

export default function LandingPage() {
  return (
    <main>
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingNZCallout />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
