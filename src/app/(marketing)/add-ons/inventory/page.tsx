import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Inventory Management — NZPOS Add-ons',
  description:
    'Track stock levels across in-store and online in real time. Low-stock alerts and detailed inventory reports.',
  openGraph: {
    title: 'Inventory Management — NZPOS Add-ons',
    description:
      'Track stock levels across in-store and online in real time. Low-stock alerts and detailed inventory reports.',
    type: 'website',
    url: 'https://nzpos.co.nz/add-ons/inventory',
  },
}

const withoutItems = [
  'Sell something in-store, forget to update the website',
  'Customer orders online, but you sold the last one an hour ago',
  'No idea what is running low until the shelf is empty',
  'Reorder guesswork based on gut feel, not data',
]

const withItems = [
  'Sell in-store, online stock updates in real time',
  'Last unit sold? Online store shows out of stock instantly',
  'Get alerted before you run out of anything',
  'Reports show what moves, what sits, and where to reorder',
]

const features = [
  {
    title: 'Live stock levels',
    description:
      'One number per product, always accurate. Updated in real time as sales happen across both channels.',
  },
  {
    title: 'Low-stock alerts',
    description:
      'Set a threshold per product. Drop below it and you get notified so you can reorder before the shelf is empty.',
  },
  {
    title: 'Inventory reports',
    description:
      'Stock movement history, slow-moving product detection, channel breakdown. Export anytime.',
  },
  {
    title: 'Unified across channels',
    description:
      'In-store and online share one inventory. No manual adjustments, no overselling, no disappointed customers.',
  },
]

const steps = [
  { number: '1', title: 'Enable', text: 'Turn on Inventory Management in Settings' },
  { number: '2', title: 'Set levels', text: 'Enter stock counts and low-stock thresholds' },
  { number: '3', title: 'Done', text: 'Stock tracks itself. You get alerts when it is time to reorder.' },
]

export default function InventoryPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <Link
            href="/add-ons"
            className="inline-flex items-center gap-[var(--space-xs)] font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 py-2"
          >
            ← Back to add-ons
          </Link>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-[1.1] mt-[var(--space-lg)]">
            Never sell something you do not have.
          </h1>
          <p className="font-sans text-base md:text-lg text-white/70 mt-[var(--space-md)] max-w-2xl">
            One inventory across in-store and online. Updated in real time as you sell. Alerts before you run out.
          </p>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="inline-block bg-[var(--color-amber)] text-white px-6 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150"
            >
              Get started free
            </Link>
            <span className="font-sans text-sm text-white/50">
              then enable inventory for $9/month NZD
            </span>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
            {/* Without */}
            <div className="border border-[var(--color-border)] rounded-lg p-[var(--space-xl)]">
              <p className="font-sans text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                Without Inventory Management
              </p>
              <ul className="mt-[var(--space-lg)] space-y-[var(--space-md)]">
                {withoutItems.map((item) => (
                  <li key={item} className="flex gap-[var(--space-sm)] items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-light)] shrink-0 mt-0.5" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span className="font-sans text-base text-[var(--color-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* With */}
            <div className="border-2 border-[var(--color-amber)] rounded-lg p-[var(--space-xl)] bg-white">
              <p className="font-sans text-sm font-bold text-[var(--color-amber)] uppercase tracking-wide">
                With Inventory Management
              </p>
              <ul className="mt-[var(--space-lg)] space-y-[var(--space-md)]">
                {withItems.map((item) => (
                  <li key={item} className="flex gap-[var(--space-sm)] items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-success)] shrink-0 mt-0.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-sans text-base text-[var(--color-text)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[var(--color-surface)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <h2 className="font-sans text-2xl font-bold text-[var(--color-text)] leading-[1.3]">
            What you get
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-lg)] mt-[var(--space-xl)]">
            {features.map((feature) => (
              <div key={feature.title}>
                <p className="font-sans text-base font-bold text-[var(--color-text)]">{feature.title}</p>
                <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-xs)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
          <h2 className="font-sans text-2xl font-bold text-[var(--color-text)] leading-[1.3]">
            Three steps. Five minutes.
          </h2>
          <div className="mt-[var(--space-xl)] grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-start">
                <span className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-navy)] text-white font-sans text-base font-bold flex items-center justify-center">
                  {step.number}
                </span>
                <p className="font-sans text-base font-bold text-[var(--color-text)] mt-[var(--space-sm)]">{step.title}</p>
                <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-xs)]">{step.text}</p>
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
            Free to start. Add Inventory Management for $9/month when you are ready.
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'NZPOS Inventory Management',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Track stock levels across in-store and online in real time. Low-stock alerts and detailed inventory reports.',
            offers: {
              '@type': 'Offer',
              price: '9',
              priceCurrency: 'NZD',
              description: '$9/month add-on',
            },
          }),
        }}
      />
    </>
  )
}
