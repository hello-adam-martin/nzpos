import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Gift Cards — NZPOS Add-ons',
  description:
    'Sell and manage gift cards with automatic NZ Fair Trading Act compliance. 3-year minimum expiry tracked for you.',
  openGraph: {
    title: 'Gift Cards — NZPOS Add-ons',
    description:
      'Sell and manage gift cards with automatic NZ Fair Trading Act compliance. 3-year minimum expiry tracked for you.',
    type: 'website',
    url: 'https://nzpos.co.nz/add-ons/gift-cards',
  },
}

const withoutItems = [
  'Track expiry dates on paper vouchers — and hope you remember',
  'Manually reconcile balances when customers come back to spend',
  'Paper gift cards get lost, leaving customers (and you) frustrated',
  'Worry about Fair Trading Act compliance every time you set an expiry',
]

const withItems = [
  'Expiry dates enforced automatically — 3-year minimum built in',
  'Real-time balance updates the moment a card is used',
  'Digital gift cards tied to customers, no paper to lose',
  'NZ Fair Trading Act 2024 compliance handled for you, out of the box',
]

const features = [
  {
    title: 'Physical and digital gift cards',
    description:
      'Sell gift cards at the counter or online. Customers receive a code they can use in-store or on your storefront.',
  },
  {
    title: 'Real-time balance tracking',
    description:
      'Every purchase and redemption updates the balance instantly. Both you and your customer always know exactly what is left.',
  },
  {
    title: 'Partial redemption support',
    description:
      'Customers can spend part of a gift card and save the rest. Remaining balance rolls over automatically.',
  },
  {
    title: 'POS and online acceptance',
    description:
      'Redeem gift cards at the register or on your online store. One code, works everywhere.',
  },
  {
    title: 'Customer-to-customer gifting',
    description:
      'Customers can purchase and send gift cards directly to friends and family from your online store.',
  },
  {
    title: 'Automatic expiry enforcement',
    description:
      'NZPOS enforces the 3-year minimum expiry required by the NZ Fair Trading Act 2024. You cannot accidentally issue a non-compliant card.',
  },
]

const steps = [
  { number: '1', title: 'Enable', text: 'Turn on Gift Cards in Settings — takes under a minute' },
  {
    number: '2',
    title: 'Sell',
    text: 'Ring up gift cards at the POS or let customers buy them online from your storefront',
  },
  {
    number: '3',
    title: 'Redeem',
    text: 'Scan or enter the code at checkout. Balance updates instantly, no manual tracking needed',
  },
]

export default function GiftCardsPage() {
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
            Turn gift cards into a revenue channel you actually manage.
          </h1>
          <p className="font-sans text-base text-white/70 mt-[var(--space-md)] max-w-2xl">
            Sell digital and physical gift cards from your POS and online store — with NZ compliance built in, not bolted on.
          </p>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="inline-block bg-[var(--color-amber)] text-white px-6 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150"
            >
              Get started free
            </Link>
            <span className="font-sans text-sm text-white/50">
              then enable Gift Cards for $14/month NZD
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
                Without Gift Cards
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
                With Gift Cards
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
                  NZ Fair Trading Act 2024 Compliant
                </p>
                <p className="font-sans text-sm text-white/70 mt-[var(--space-xs)]">
                  The NZ Fair Trading Act 2024 requires a minimum 3-year expiry on gift cards. NZPOS automatically enforces this rule — it is impossible to issue a card with a shorter expiry. You stay compliant by default, with no legal knowledge required and no manual checks to remember.
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
            Give your customers a reason to come back — before they even leave.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Free to start. Add Gift Cards for $14/month when you are ready.
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
            name: 'NZPOS Gift Cards',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Sell and manage gift cards with automatic NZ Fair Trading Act compliance. 3-year minimum expiry tracked for you.',
            offers: {
              '@type': 'Offer',
              price: '14',
              priceCurrency: 'NZD',
              description: '$14/month add-on',
            },
          }),
        }}
      />
    </>
  )
}
