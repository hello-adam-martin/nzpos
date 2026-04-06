import type { ReactNode } from 'react'

interface Feature {
  title: string
  description: string
  icon: ReactNode
}

interface FeatureGroup {
  heading: string
  features: Feature[]
}

const featureGroups: FeatureGroup[] = [
  {
    heading: 'Sell In-Store',
    features: [
      {
        title: 'POS Checkout',
        description:
          'Tap to sell from any product, apply discounts, and confirm EFTPOS payments in seconds.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        ),
      },
      {
        title: 'Barcode Scanning',
        description:
          'Scan product barcodes to add items instantly — no hunting through a product list.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 4h2v16H2M6 4h1v16H6M10 4h1v16h-1M14 4h1v16h-1M18 4h2v16h-2M22 4h1v16h-1" />
          </svg>
        ),
      },
      {
        title: 'Receipts',
        description:
          'Email GST-compliant receipts on every sale. IRD-ready, automatically.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
        ),
      },
      {
        title: 'Partial Refunds',
        description:
          'Issue refunds on individual line items, not just whole orders.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: 'Sell Online',
    features: [
      {
        title: 'Online Storefront',
        description:
          'Your store is live online from day one. No extra setup, no extra charge.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        ),
      },
      {
        title: 'Click and Collect',
        description:
          'Customers order online and pick up in-store. You get the notification.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        ),
      },
      {
        title: 'Promo Codes',
        description:
          'Run a sale or reward loyal customers with discount codes.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        ),
      },
      {
        title: 'Customer Accounts',
        description:
          'Customers can track their orders and save their details for next time.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: 'Manage Your Business',
    features: [
      {
        title: 'Staff Management',
        description:
          'Add staff, set POS-only or admin roles, and control who can do what.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21v-2a4 4 0 0 1 4-4h4" />
            <circle cx="19" cy="18" r="2" />
            <path d="M19 14v1" />
            <path d="M19 21v1" />
          </svg>
        ),
      },
      {
        title: 'Reporting',
        description:
          'Daily sales summaries, top products, and GST totals — all in one place.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        ),
      },
      {
        title: 'Unified Inventory',
        description:
          "One inventory powers both in-store and online. Sell a product in-store and it's gone online.",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        ),
      },
      {
        title: 'Multi-tenant Ready',
        description: 'Each store is fully isolated. Your data is yours.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: 'Stay Compliant',
    features: [
      {
        title: 'GST Done Right',
        description:
          '15% GST calculated per line on discounted amounts. Compliant with IRD requirements.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="10" y2="14" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
        ),
      },
      {
        title: 'NZD Pricing',
        description:
          'Everything in New Zealand dollars. No currency conversion, no surprises.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      },
      {
        title: 'GST Receipts',
        description:
          'Every receipt shows GST breakdowns that satisfy your accountant and the IRD.',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
    ],
  },
]

export default function LandingFeatures() {
  return (
    <section id="features" className="bg-[var(--color-bg)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
        <h2 className="font-sans text-xl font-bold text-[var(--color-text)] text-center leading-[1.3]">
          Everything your store needs, out of the box
        </h2>
        {featureGroups.map((group, i) => (
          <div
            key={group.heading}
            className={
              i > 0 ? 'mt-[var(--space-2xl)]' : 'mt-[var(--space-xl)]'
            }
          >
            <h3 className="font-sans text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-[var(--space-md)]">
              {group.heading}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[var(--space-md)]">
              {group.features.map((f) => (
                <div
                  key={f.title}
                  className="flex gap-[var(--space-sm)] items-start"
                >
                  <div className="text-[var(--color-navy)] shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-bold text-[var(--color-text)]">
                      {f.title}
                    </p>
                    <p className="font-sans text-sm text-[var(--color-text-muted)]">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
