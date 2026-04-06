'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AddOnCard } from '@/components/admin/billing/AddOnCard'
import { createSubscriptionCheckoutSession } from '@/actions/billing/createSubscriptionCheckoutSession'
import { createBillingPortalSession } from '@/actions/billing/createBillingPortalSession'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ADDONS } from '@/config/addons'
import type { SubscriptionFeature } from '@/config/addons'

interface BillingClientProps {
  storePlans: {
    has_xero: boolean
    has_custom_domain: boolean
    has_inventory: boolean
  }
  stripeCustomerId: string | null
  subscriptionDetails: Array<{
    feature: string
    status: 'active' | 'trialing' | 'canceled'
    trialEnd: string | null
    created: string
  }>
  prices: Record<string, string>  // feature -> formatted price string
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-white inline-block"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function getDaysLeft(trialEnd: string | null): number {
  if (!trialEnd) return 0
  const end = new Date(trialEnd).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

export default function BillingClient({
  storePlans,
  stripeCustomerId,
  subscriptionDetails,
  prices,
}: BillingClientProps) {
  const searchParams = useSearchParams()
  const [subscribingFeature, setSubscribingFeature] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [portalError, setPortalError] = useState<string | null>(null)

  const upgradeFeature = searchParams.get('upgrade')
  const subscribedFeature = searchParams.get('subscribed')

  // On return from Stripe checkout, refresh session to pick up new JWT claims
  useEffect(() => {
    if (subscribedFeature) {
      const supabase = createSupabaseBrowserClient()
      supabase.auth.refreshSession().catch(() => {
        // Silently ignore refresh failures — page data is still valid from SSR
      })
    }
  }, [subscribedFeature])

  const router = useRouter()
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  const bannerShownRef = useRef(false)

  useEffect(() => {
    if (subscribedFeature && !bannerShownRef.current) {
      bannerShownRef.current = true
      setShowSuccessBanner(true)

      // Strip ?subscribed param to prevent banner re-showing on refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('subscribed')
      router.replace(url.pathname + url.search, { scroll: false })

      const timeout = setTimeout(() => {
        setShowSuccessBanner(false)
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [subscribedFeature, router])

  // Helper: get subscription detail for a feature
  function getSubDetail(feature: string) {
    return subscriptionDetails.find((s) => s.feature === feature) ?? null
  }

  // Helper: determine card status
  function getStatus(feature: string): 'active' | 'trial' | 'inactive' {
    const flagMap: Record<string, boolean> = {
      xero: storePlans.has_xero,
      custom_domain: storePlans.has_custom_domain,
      inventory: storePlans.has_inventory,
    }
    if (!flagMap[feature]) return 'inactive'
    const sub = getSubDetail(feature)
    if (sub?.status === 'trialing') return 'trial'
    return 'active'
  }

  async function handleSubscribe(feature: string) {
    setSubscribingFeature(feature)
    setSubscribeError(null)
    try {
      const result = await createSubscriptionCheckoutSession(feature as SubscriptionFeature)
      if ('error' in result) {
        setSubscribeError('Could not start checkout. Try again or contact support if the problem persists.')
        setSubscribingFeature(null)
        return
      }
      window.location.href = result.url
    } catch {
      setSubscribeError('Could not start checkout. Try again or contact support if the problem persists.')
      setSubscribingFeature(null)
    }
  }

  async function handleManage() {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const result = await createBillingPortalSession()
      if ('error' in result) {
        setPortalError('Could not open billing portal. Try again in a moment.')
        setPortalLoading(false)
        return
      }
      window.location.href = result.url
    } catch {
      setPortalError('Could not open billing portal. Try again in a moment.')
      setPortalLoading(false)
    }
  }

  // Refs for scroll-to-highlight
  const cardRefs = useRef<Record<string, boolean>>({})

  return (
    <div className="space-y-[var(--space-xl)]">
      {showSuccessBanner && subscribedFeature && (
        <div className="bg-[#ECFDF5] border border-[#059669]/20 rounded-[var(--radius-md)] p-3 mb-[var(--space-xl)]">
          <p className="text-sm font-semibold text-[#059669]" role="alert">
            {subscribedFeature === 'inventory'
              ? 'Inventory add-on activated! Your store now has full stock management.'
              : `${subscribedFeature.replace(/_/g, ' ')} add-on activated!`}
          </p>
        </div>
      )}
      {/* Add-ons section */}
      <section>
        <h2 className="text-lg font-semibold font-sans text-[var(--color-text)] mb-[var(--space-lg)]">
          Add-ons
        </h2>
        <div className="space-y-[var(--space-lg)]">
          {ADDONS.map((addon) => {
            const status = getStatus(addon.feature)
            const sub = getSubDetail(addon.feature)
            const isHighlighted = upgradeFeature === addon.feature && !cardRefs.current[addon.feature]
            if (isHighlighted) {
              cardRefs.current[addon.feature] = true
            }
            return (
              <AddOnCard
                key={addon.feature}
                feature={addon.feature}
                name={addon.name}
                benefitLine={addon.benefitLine}
                status={status}
                trialDaysLeft={sub?.status === 'trialing' && sub.trialEnd ? getDaysLeft(sub.trialEnd) : undefined}
                activeSince={sub?.status === 'active' ? sub.created : undefined}
                trialEndsAt={sub?.status === 'trialing' && sub.trialEnd ? sub.trialEnd : undefined}
                priceDisplay={prices[addon.feature]}
                onSubscribe={handleSubscribe}
                onManage={handleManage}
                subscribing={subscribingFeature === addon.feature}
                highlight={isHighlighted}
              />
            )
          })}
        </div>
        {subscribeError && (
          <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">
            {subscribeError}
          </p>
        )}
      </section>

      {/* Billing management section */}
      <section>
        <h2 className="text-lg font-semibold font-sans text-[var(--color-text)] mb-2">
          Billing management
        </h2>
        <p className="text-sm font-sans text-[var(--color-text-muted)] mb-[var(--space-md)]">
          Update payment method, view invoices, or cancel a subscription.
        </p>
        {stripeCustomerId ? (
          <div>
            <button
              type="button"
              onClick={handleManage}
              disabled={portalLoading}
              className="bg-[var(--color-navy)] text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-navy-light)] transition-colors duration-150 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {portalLoading ? <Spinner /> : null}
              Open billing portal
            </button>
            {portalError && (
              <p className="mt-2 text-sm text-[var(--color-error)]" role="alert">
                {portalError}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-sans text-[var(--color-text-muted)]">
            Subscribe to an add-on to access the billing portal.
          </p>
        )}
      </section>
    </div>
  )
}
