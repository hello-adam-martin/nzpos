import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Loyalty Points — NZPOS Add-ons',
  description:
    'Reward repeat customers with points they can spend in-store and online. NZ Privacy Act compliant.',
  openGraph: {
    title: 'Loyalty Points — NZPOS Add-ons',
    description:
      'Reward repeat customers with points they can spend in-store and online. NZ Privacy Act compliant.',
    type: 'website',
    url: 'https://nzpos.co.nz/add-ons/loyalty-points',
  },
}

const withoutItems = [
  'No way to reward your regulars — every customer is treated the same',
  'Paper stamp cards that customers forget, lose, or never fill',
  'No record of who your best customers are or how often they visit',
  'Regulars drift to competitors who offer loyalty rewards',
]

const withItems = [
  'Points earned automatically on every sale, in-store and online',
  'Customers see their balance at checkout and feel valued',
  'Redeem points seamlessly — at the POS or on your online store',
  'Purchase history drives smarter promotions and personal outreach',
]

const features = [
  {
    title: 'Automatic points earning',
    description:
      'Customers earn points on every purchase without any extra steps at the register. Set your earn rate once and it runs itself.',
  },
  {
    title: 'Points redemption at POS and online',
    description:
      'Customers can spend their points in-store or on your online storefront. One loyalty balance, works everywhere.',
  },
  {
    title: 'Customer-facing balance display',
    description:
      'Loyalty balance shown at checkout so customers know exactly what they have. A small moment that builds genuine loyalty.',
  },
  {
    title: 'Configurable earn and redeem rates',
    description:
      'Set how many points per dollar spent and what each point is worth at redemption. Adjust rates any time from Settings.',
  },
  {
    title: 'Points expiry rules',
    description:
      'Optionally set points to expire after a period of inactivity. Keeps your liability manageable while still rewarding regular customers.',
  },
  {
    title: 'Opt-in consent management',
    description:
      'Customers explicitly opt in to your loyalty programme. Consent is recorded against their account in compliance with NZ privacy law.',
  },
]

const steps = [
  { number: '1', title: 'Enable', text: 'Turn on Loyalty Points in Settings and set your earn rate' },
  {
    number: '2',
    title: 'Set earn rate',
    text: 'Choose how many points customers earn per dollar spent and what each point is worth at checkout',
  },
  {
    number: '3',
    title: 'Done',
    text: 'Customers earn and redeem points automatically. You just watch your regulars come back more often',
  },
]

export default function LoyaltyPointsPage() {
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
            Turn one-time buyers into regulars.
          </h1>
          <p className="font-sans text-base text-white/70 mt-[var(--space-md)] max-w-2xl">
            Reward your best customers with points they can spend in-store and online — no stamp cards, no manual tracking, and no privacy headaches.
          </p>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="inline-block bg-[var(--color-amber)] text-white px-6 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150"
            >
              Get started free
            </Link>
            <span className="font-sans text-sm text-white/50">
              then enable Loyalty Points for $15/month NZD
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
                Without Loyalty Points
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
                With Loyalty Points
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
                  NZ Privacy Amendment Act 2025 Compliant
                </p>
                <p className="font-sans text-sm text-white/70 mt-[var(--space-xs)]">
                  The NZ Privacy Amendment Act 2025 introduces IPP 3A, which requires explicit customer consent before collecting personal data for loyalty programmes. NZPOS handles this automatically — customers are presented with a clear privacy notice and must opt in before joining your loyalty programme. Their consent is recorded and stored against their account, so you are covered from day one.
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
            The customers who come back are the ones who keep you in business.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Free to start. Add Loyalty Points for $15/month when you are ready.
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
            name: 'NZPOS Loyalty Points',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Reward repeat customers with points they can spend in-store and online. NZ Privacy Act compliant.',
            offers: {
              '@type': 'Offer',
              price: '15',
              priceCurrency: 'NZD',
              description: '$15/month add-on',
            },
          }),
        }}
      />
    </>
  )
}
