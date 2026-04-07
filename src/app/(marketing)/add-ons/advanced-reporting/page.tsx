import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Advanced Reporting — NZPOS Add-ons',
  description:
    'COGS tracking, profit margins, and detailed sales analytics for NZ retail businesses.',
}

const withoutItems = [
  'Guess your margins because you have no COGS data to work with',
  'Reconcile sales and costs manually in a spreadsheet every week',
  'No visibility into which products are actually profitable',
  'End-of-month surprises when your accountant runs the numbers',
]

const withItems = [
  'See real-time margin data for every product you sell',
  'Automatic COGS calculation the moment a sale is recorded',
  'Products ranked by profitability so you know where to focus',
  'Confident purchasing decisions backed by actual margin data',
]

const features = [
  {
    title: 'COGS tracking per product',
    description:
      'Enter your cost price once. NZPOS calculates COGS automatically on every sale, no spreadsheet required.',
  },
  {
    title: 'Real-time profit margins',
    description:
      'Margin percentage shown alongside every product and in your reports. Know your numbers as you sell.',
  },
  {
    title: 'Sales by category and period',
    description:
      'Break down revenue by product category, date range, or both. Spot seasonal patterns and plan accordingly.',
  },
  {
    title: 'Product performance ranking',
    description:
      'See your best and worst performers by margin, revenue, or volume. Easy to identify what to reorder and what to retire.',
  },
  {
    title: 'Export to CSV',
    description:
      'Download any report as a CSV for your accountant or further analysis. Full control over your data.',
  },
  {
    title: 'GST-inclusive margin calculations',
    description:
      'All margin calculations account for NZ GST correctly. No manual adjustments needed to get accurate net profit figures.',
  },
]

const steps = [
  { number: '1', title: 'Enable', text: 'Turn on Advanced Reporting in Settings — one toggle' },
  {
    number: '2',
    title: 'Set cost prices',
    text: 'Enter your cost price on each product. Takes a few minutes for a typical catalogue',
  },
  {
    number: '3',
    title: 'View reports',
    text: 'Open the Reports tab in your dashboard to see margins, COGS, and performance rankings in real time',
  },
]

export default function AdvancedReportingPage() {
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
            Know your real margins — not just your revenue.
          </h1>
          <p className="font-sans text-base text-white/70 mt-[var(--space-md)] max-w-2xl">
            COGS tracking and profit margin reports built for NZ retail. Stop guessing and start making purchasing decisions with confidence.
          </p>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="inline-block bg-[var(--color-amber)] text-white px-6 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150"
            >
              Get started free
            </Link>
            <span className="font-sans text-sm text-white/50">
              then enable Advanced Reporting for $9/month NZD
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
                Without Advanced Reporting
              </p>
              <ul className="mt-[var(--space-lg)] space-y-[var(--space-md)]">
                {withoutItems.map((item) => (
                  <li key={item} className="flex gap-[var(--space-sm)] items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--color-text-light)] shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
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
                With Advanced Reporting
              </p>
              <ul className="mt-[var(--space-lg)] space-y-[var(--space-md)]">
                {withItems.map((item) => (
                  <li key={item} className="flex gap-[var(--space-sm)] items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--color-success)] shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
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

      {/* Compliance Callout */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] pb-[var(--space-3xl)]">
          <div className="border border-[var(--color-amber)] rounded-lg p-[var(--space-xl)] bg-[var(--color-navy)]">
            <div className="flex items-start gap-[var(--space-md)]">
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
                className="text-[var(--color-amber)] shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div>
                <p className="font-sans text-base font-bold text-white">
                  Built for NZ Retail
                </p>
                <p className="font-sans text-sm text-white/70 mt-[var(--space-xs)]">
                  Every calculation in Advanced Reporting is designed around NZ business practices. Margins are calculated on GST-inclusive prices and displayed as net figures so your numbers match what your accountant expects. COGS is tracked per product line — the way IRD wants to see it for income tax purposes.
                </p>
              </div>
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
                <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-xs)]">
                  {feature.description}
                </p>
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
                <p className="font-sans text-base font-bold text-[var(--color-text)] mt-[var(--space-sm)]">
                  {step.title}
                </p>
                <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-xs)]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--color-navy)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)] text-center">
          <h2 className="font-display text-xl md:text-2xl font-bold text-white leading-[1.3]">
            Stop flying blind. Know your numbers.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Free to start. Add Advanced Reporting for $9/month when you are ready.
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
