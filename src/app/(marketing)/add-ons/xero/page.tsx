import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Xero Integration — NZPOS Add-ons',
  description:
    'Automatically sync daily sales to Xero with GST breakdowns and credit notes. No manual data entry.',
  openGraph: {
    title: 'Xero Integration — NZPOS Add-ons',
    description:
      'Automatically sync daily sales to Xero with GST breakdowns and credit notes. No manual data entry.',
    type: 'website',
    url: 'https://nzpos.co.nz/add-ons/xero',
  },
}

const withoutItems = [
  'End every day typing sales into Xero manually',
  'Double-check GST calculations line by line',
  'Chase down refunds to create credit notes',
  'Worry about missed transactions before GST filing',
]

const withItems = [
  'Wake up to yesterday\'s sales already in Xero',
  'GST calculated per line, IRD-ready, automatically',
  'Refunds create matching credit notes instantly',
  'Every transaction accounted for, every night',
]

const features = [
  {
    title: 'Daily sales sync',
    description:
      'Every sale is batched and sent to Xero as an invoice at end of day. No manual entry, no missed transactions.',
  },
  {
    title: 'Per-line GST breakdowns',
    description:
      'Each invoice includes GST calculated on discounted amounts per line item. Exactly how the IRD expects it.',
  },
  {
    title: 'Automatic credit notes',
    description:
      'Issue a refund in NZPOS and a matching credit note appears in Xero. Books stay balanced without extra work.',
  },
  {
    title: 'One-click connect',
    description:
      'Authorise your Xero account once from Settings. No API keys, no spreadsheets, no accountant needed.',
  },
]

const steps = [
  { number: '1', title: 'Enable', text: 'Turn on Xero Integration in Settings' },
  { number: '2', title: 'Connect', text: 'Authorise your Xero account with one click' },
  { number: '3', title: 'Done', text: 'Sales sync to Xero automatically each night' },
]

export default function XeroPage() {
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
            Stop typing sales into Xero.
          </h1>
          <p className="font-sans text-base md:text-lg text-white/70 mt-[var(--space-md)] max-w-2xl">
            NZPOS syncs every transaction to Xero overnight. GST calculated correctly on every line. You just sell.
          </p>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="inline-block bg-[var(--color-amber)] text-white px-6 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150"
            >
              Get started free
            </Link>
            <span className="font-sans text-sm text-white/50">
              then enable Xero for $9/month NZD
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
                Without Xero Integration
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
                With Xero Integration
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
            Three steps. Two minutes.
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
            Your sales in Xero by morning. Every morning.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Free to start. Add Xero Integration for $9/month when you are ready.
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
            name: 'NZPOS Xero Integration',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Automatically sync daily sales to Xero with GST breakdowns and credit notes.',
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
