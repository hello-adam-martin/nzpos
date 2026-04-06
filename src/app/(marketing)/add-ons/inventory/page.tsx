import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Inventory Management — NZPOS Add-ons',
  description:
    'Track stock levels across in-store and online in real time. Low-stock alerts and detailed inventory reports.',
}

const features = [
  {
    title: 'Live stock levels',
    description:
      'See exactly how much stock you have — updated in real time as sales happen in-store and online. One number, always accurate.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    title: 'Low-stock alerts',
    description:
      'Set a threshold for each product. When stock drops below it, you get notified so you can reorder before you run out.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Inventory reports',
    description:
      'See stock movement history, identify slow-moving products, and understand what sells where. Export reports anytime.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    title: 'Unified across channels',
    description:
      'Sell a product in-store and the online stock updates instantly. No overselling, no manual adjustments between channels.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
]

const steps = [
  { number: '1', text: 'Enable Inventory Management in Settings → Add-ons' },
  { number: '2', text: 'Set stock levels and low-stock thresholds for your products' },
  { number: '3', text: 'Stock updates automatically as you sell — alerts when you need to reorder' },
]

export default function InventoryPage() {
  return (
    <>
      {/* Back link + Hero */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <Link
            href="/add-ons"
            className="inline-flex items-center gap-[var(--space-xs)] font-sans text-sm text-white/50 hover:text-white transition-colors duration-150"
          >
            ← Back to add-ons
          </Link>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-[1.1] mt-[var(--space-lg)]">
            Inventory Management
          </h1>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-md)]">
            <span className="inline-block bg-[var(--color-amber)] text-white font-sans text-sm font-bold px-4 py-1 rounded-full">
              $9/month NZD
            </span>
          </div>
          <p className="font-sans text-base md:text-lg text-white/70 mt-[var(--space-md)] max-w-2xl">
            Know exactly what you have in stock — across in-store and online — without counting shelves.
          </p>
        </div>
      </section>

      {/* What it does */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <h2 className="font-sans text-xl font-bold text-[var(--color-text)] leading-[1.3]">
            What it does
          </h2>
          <div className="mt-[var(--space-md)] max-w-2xl space-y-[var(--space-sm)]">
            <p className="font-sans text-base text-[var(--color-text-muted)]">
              Every sale — whether in-store or online — automatically adjusts your stock levels. When a customer buys the last unit in-store, your online store shows it as out of stock immediately. No overselling, no disappointed customers.
            </p>
            <p className="font-sans text-base text-[var(--color-text-muted)]">
              Set low-stock thresholds per product and get alerted before you run out. Inventory reports show what is moving, what is sitting, and where your sales are coming from — so you can make smarter ordering decisions.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-xl)] mt-[var(--space-2xl)]">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-[var(--space-md)] items-start">
                <div className="text-[var(--color-amber)] shrink-0">{feature.icon}</div>
                <div>
                  <p className="font-sans text-sm font-bold text-[var(--color-text)]">{feature.title}</p>
                  <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-xs)]">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[var(--color-surface)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <h2 className="font-sans text-xl font-bold text-[var(--color-text)] leading-[1.3]">
            How it works
          </h2>
          <div className="mt-[var(--space-xl)] max-w-xl space-y-[var(--space-lg)]">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-[var(--space-md)] items-start">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-navy)] text-white font-sans text-sm font-bold flex items-center justify-center">
                  {step.number}
                </span>
                <p className="font-sans text-base text-[var(--color-text)] pt-1">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)] text-center">
          <h2 className="font-display text-xl md:text-2xl font-bold text-white leading-[1.3]">
            Never run out of your best sellers.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Sign up free, then enable Inventory Management from Settings.
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
