import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Xero Integration — NZPOS Add-ons',
  description:
    'Automatically sync daily sales to Xero with GST breakdowns and credit notes. No manual data entry.',
}

const features = [
  {
    title: 'Daily sales sync',
    description:
      'Every sale is automatically sent to Xero as an invoice at the end of each day. No manual entry, no missed transactions.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
  {
    title: 'GST breakdowns on every invoice',
    description:
      'Each invoice includes a full GST breakdown calculated per line item on discounted amounts — exactly how the IRD expects it.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    title: 'Credit notes for refunds',
    description:
      'When you issue a refund in NZPOS, a matching credit note is created in Xero automatically. Your books stay balanced.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      </svg>
    ),
  },
  {
    title: 'One-click connect',
    description:
      'Authorise your Xero account once from NZPOS Settings. No API keys, no spreadsheets, no accountant required to set up.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
]

const steps = [
  { number: '1', text: 'Enable Xero Integration in Settings → Integrations' },
  { number: '2', text: 'Connect your Xero account with one click' },
  { number: '3', text: 'Sales sync to Xero automatically each night' },
]

export default function XeroPage() {
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
            Xero Integration
          </h1>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-md)]">
            <span className="inline-block bg-[var(--color-amber)] text-white font-sans text-sm font-bold px-4 py-1 rounded-full">
              $9/month NZD
            </span>
          </div>
          <p className="font-sans text-base md:text-lg text-white/70 mt-[var(--space-md)] max-w-2xl">
            Stop entering sales into Xero by hand. NZPOS syncs your daily transactions automatically — with GST calculated correctly on every line.
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
              At the end of each day, NZPOS batches your sales and sends them to Xero as invoices. Each invoice includes a per-line GST breakdown that matches IRD requirements — no rounding errors, no manual adjustments.
            </p>
            <p className="font-sans text-base text-[var(--color-text-muted)]">
              Refunds are handled too. When you issue a refund in NZPOS, a credit note is created in Xero automatically, keeping your books balanced without extra work.
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
            Ready to stop the manual data entry?
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Sign up free, then enable Xero Integration from Settings.
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
