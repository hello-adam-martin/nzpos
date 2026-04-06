import Link from 'next/link'

export default function LandingPricing() {
  return (
    <section id="pricing" className="bg-[var(--color-surface)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
        <h2 className="font-sans text-xl font-bold text-[var(--color-text)] text-center leading-[1.3]">
          Transparent pricing
        </h2>
        <p className="font-sans text-base text-[var(--color-text-muted)] text-center mt-[var(--space-sm)]">
          Free to start. Add only what you need.
        </p>

        {/* Free core card */}
        <div className="bg-white border-2 border-[var(--color-navy)] rounded-lg p-[var(--space-xl)] max-w-lg mx-auto mt-[var(--space-xl)]">
          <div className="font-display font-bold text-[28px] md:text-[48px] leading-[1.1] text-[var(--color-text)]">
            Free
          </div>
          <p className="font-sans text-sm text-[var(--color-text-muted)] mt-[var(--space-xs)]">
            Core plan — no card required
          </p>
          <ul className="mt-[var(--space-md)] space-y-[var(--space-sm)]">
            {[
              'POS checkout',
              'Online storefront',
              'GST-compliant receipts',
              'Staff management',
              'Customer accounts',
              'Reporting',
              'Email notifications',
            ].map((item) => (
              <li key={item} className="flex items-center gap-[var(--space-sm)] font-sans text-base text-[var(--color-text)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--color-success)] shrink-0"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Optional add-ons */}
        <h3 className="font-sans text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide text-center mt-[var(--space-2xl)]">
          Optional add-ons
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)] mt-[var(--space-md)] max-w-3xl mx-auto">
          {/* Xero Integration */}
          <Link
            href="/add-ons/xero"
            className="group bg-white border border-[var(--color-border)] rounded-lg p-[var(--space-xl)] hover:border-[var(--color-amber)] transition-colors duration-150"
          >
            <h3 className="font-sans text-sm font-bold text-[var(--color-text)]">
              Xero Integration
            </h3>
            <p className="font-sans text-sm font-bold text-[var(--color-amber)] mt-[var(--space-xs)]">
              $9/month NZD
            </p>
            <ul className="mt-[var(--space-md)] space-y-[var(--space-xs)]">
              {[
                'Auto-sync daily sales to Xero',
                'GST breakdown on invoices',
                'Credit notes for refunds',
              ].map((item) => (
                <li key={item} className="flex items-start gap-[var(--space-xs)] font-sans text-sm text-[var(--color-text-muted)]">
                  <span className="mt-1 shrink-0 text-[var(--color-text-muted)]">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <span className="inline-block font-sans text-sm font-bold text-[var(--color-amber)] mt-[var(--space-md)] group-hover:underline">
              Learn more →
            </span>
          </Link>

          {/* Inventory Management */}
          <Link
            href="/add-ons/inventory"
            className="group bg-white border border-[var(--color-border)] rounded-lg p-[var(--space-xl)] hover:border-[var(--color-amber)] transition-colors duration-150"
          >
            <h3 className="font-sans text-sm font-bold text-[var(--color-text)]">
              Inventory Management
            </h3>
            <p className="font-sans text-sm font-bold text-[var(--color-amber)] mt-[var(--space-xs)]">
              $9/month NZD
            </p>
            <ul className="mt-[var(--space-md)] space-y-[var(--space-xs)]">
              {[
                'Live stock levels across in-store and online',
                'Low-stock alerts',
                'Inventory reports',
              ].map((item) => (
                <li key={item} className="flex items-start gap-[var(--space-xs)] font-sans text-sm text-[var(--color-text-muted)]">
                  <span className="mt-1 shrink-0 text-[var(--color-text-muted)]">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <span className="inline-block font-sans text-sm font-bold text-[var(--color-amber)] mt-[var(--space-md)] group-hover:underline">
              Learn more →
            </span>
          </Link>
        </div>

        <p className="font-sans text-sm text-[var(--color-text-muted)] text-center mt-[var(--space-lg)]">
          All prices include GST. No hidden fees.
        </p>
      </div>
    </section>
  )
}
