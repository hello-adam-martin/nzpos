import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Add-ons — NZPOS',
  description:
    'Extend NZPOS with optional features. Xero integration, inventory management, gift cards, advanced reporting, and loyalty points — pay only for what you use.',
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
  {
    name: 'Gift Cards',
    price: '$14/month NZD',
    description:
      'Sell and manage physical and digital gift cards. Automatic NZ Fair Trading Act compliance with 3-year expiry tracking.',
    href: '/add-ons/gift-cards',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <rect x="3" y="12" width="18" height="9" rx="1" />
        <path d="M12 8v13" />
        <path d="M9 8c0-1.66 1.34-3 3-3s3 1.34 3 3" />
        <path d="M9 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3" />
      </svg>
    ),
  },
  {
    name: 'Advanced Reporting',
    price: '$9/month NZD',
    description:
      'Track COGS, profit margins, and sales performance. Export reports and make confident purchasing decisions.',
    href: '/add-ons/advanced-reporting',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="12" width="4" height="9" />
        <rect x="10" y="7" width="4" height="14" />
        <rect x="17" y="3" width="4" height="18" />
      </svg>
    ),
  },
  {
    name: 'Loyalty Points',
    price: '$15/month NZD',
    description:
      'Reward repeat customers with points they can spend in-store and online. NZ Privacy Act compliant out of the box.',
    href: '/add-ons/loyalty-points',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
]

export default function AddOnsPage() {
  const topRow = addOns.slice(0, 3)
  const bottomRow = addOns.slice(3)

  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)] text-center">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-[1.1]">
            Add-ons
          </h1>
          <p className="font-sans text-base text-white/70 mt-[var(--space-md)] max-w-xl mx-auto">
            Extend NZPOS with optional features. Pay only for what you use.
          </p>
        </div>
      </section>

      {/* Add-on cards */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          {/* Top row — 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)] max-w-5xl mx-auto">
            {topRow.map((addon) => (
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

          {/* Bottom row — 2 cards centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)] max-w-3xl mx-auto mt-[var(--space-lg)]">
            {bottomRow.map((addon) => (
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
