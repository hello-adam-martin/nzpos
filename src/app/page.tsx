import type { Metadata } from 'next'
import LandingNav from './(marketing)/components/LandingNav'
import LandingHero from './(marketing)/components/LandingHero'
import LandingFeatures from './(marketing)/components/LandingFeatures'
import LandingPricing from './(marketing)/components/LandingPricing'
import LandingCTA from './(marketing)/components/LandingCTA'
import LandingFooter from './(marketing)/components/LandingFooter'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'NZPOS — The POS built for Kiwi retailers',
  description:
    'Ring up sales in-store, take orders online, and get GST handled correctly — all from one dashboard. Free to start.',
}

export default function LandingPage() {
  return (
    <main>
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
