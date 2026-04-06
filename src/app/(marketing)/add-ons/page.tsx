import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Add-ons — NZPOS',
  description:
    'Extend NZPOS with optional features. Xero integration, email notifications, and inventory management — pay only for what you use.',
}

const addOns = [
  {
    name: 'Xero Integration',
    price: '$9/month NZD',
    description:
      'Automatically sync your daily sales to Xero. GST breakdowns on every invoice, credit notes for refunds — no manual data entry.',
    href: '/add-ons/xero',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M12 12v9" />
        <path d="m8 17 4 4 4-4" />
      </svg>
    ),
  },
  {
    name: 'Email Notifications',
    price: '$5/month NZD',
    description:
      'Keep customers informed with order confirmations, pickup-ready alerts, and get a daily sales summary straight to your inbox.',
    href: '/add-ons/email-notifications',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    name: 'Inventory Management',
    price: '$9/month NZD',
    description:
      'Track stock levels across in-store and online in real time. Get low-stock alerts and detailed inventory reports.',
    href: '/add-ons/inventory',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
]

export default function AddOnsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)] text-center">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-[1.1]">
            Add-ons
          </h1>
          <p className="font-sans text-base md:text-lg text-white/70 mt-[var(--space-md)] max-w-xl mx-auto">
            Extend NZPOS with optional features. Pay only for what you use.
          </p>
        </div>
      </section>

      {/* Add-on cards */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
            {addOns.map((addon) => (
              <Link
                key={addon.name}
                href={addon.href}
                className="group bg-white border border-[var(--color-border)] rounded-lg p-[var(--space-xl)] hover:border-[var(--color-amber)] transition-colors duration-150"
              >
                <div className="text-[var(--color-navy)]">{addon.icon}</div>
                <h2 className="font-sans text-base font-bold text-[var(--color-text)] mt-[var(--space-md)]">
                  {addon.name}
                </h2>
                <p className="font-sans text-sm font-bold text-[var(--color-amber)] mt-[var(--space-xs)]">
                  {addon.price}
                </p>
                <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-sm)]">
                  {addon.description}
                </p>
                <span className="inline-block font-sans text-sm font-bold text-[var(--color-amber)] mt-[var(--space-md)] group-hover:underline">
                  Learn more →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)] text-center">
          <h2 className="font-display text-xl md:text-2xl font-bold text-white leading-[1.3]">
            Your shop, running smarter.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Set up in under 5 minutes. No credit card needed.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-[var(--color-amber)] text-white px-8 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150 mt-[var(--space-lg)]"
            aria-label="Get started free — sign up for NZPOS"
          >
            Get started free
          </Link>
        </div>
      </section>
    </>
  )
}
