import { Fragment } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  competitors,
  featureCategories,
  features,
  faqItems,
  pricingDisclaimerDate,
} from '@/data/comparison'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Compare NZPOS vs Square, Lightspeed, Shopify POS — NZ POS Systems',
  description:
    'See how NZPOS compares to Square, Lightspeed, Shopify POS and other NZ point-of-sale systems. Feature-by-feature comparison with transparent pricing.',
  openGraph: {
    title: 'Compare NZPOS vs NZ POS Competitors',
    description:
      'Feature-by-feature comparison of NZ point-of-sale systems. Transparent pricing, NZ compliance, and honest feature matrix.',
    type: 'website',
    url: 'https://nzpos.co.nz/compare',
  },
}

function CheckIcon() {
  return (
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
      className="text-[var(--color-success)] mx-auto"
      aria-label="Yes"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CrossIcon() {
  return (
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
      className="text-[var(--color-error)] mx-auto"
      aria-label="No"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <CheckIcon />
  if (value === false) return <CrossIcon />
  return <span className="font-sans text-sm text-[var(--text-muted)]">{value}</span>
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'NZPOS',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Point-of-sale and online store for NZ small businesses',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'NZD',
    description: 'Free tier available',
  },
  featureList:
    'POS, Online Store, GST Compliance, Xero Integration, Gift Cards, Loyalty Points, Advanced Reporting, Inventory Management',
}

export default function ComparePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-3xl)]">
          <h1 className="font-display font-bold text-3xl md:text-5xl text-[var(--color-navy)] leading-[1.1]">
            How NZPOS compares
          </h1>
          <p className="font-sans text-base md:text-lg text-[var(--text-muted)] mt-[var(--space-md)] max-w-2xl">
            An honest, feature-by-feature look at how NZPOS stacks up against
            the most common POS systems used by NZ retailers. No spin — just
            what each platform offers and what it costs.
          </p>
          <p className="text-sm text-[var(--text-muted)] italic mt-[var(--space-sm)]">
            Competitor pricing verified as of {pricingDisclaimerDate}. Visit
            their websites for current pricing.
          </p>
        </div>
      </section>

      {/* Feature matrix */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] pb-[var(--space-2xl)] md:pb-[var(--space-3xl)]">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full border-collapse text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="sticky left-0 z-10 bg-white font-sans text-sm font-bold text-[var(--color-text)] px-4 py-3 w-[200px] min-w-[200px]">
                    Feature
                  </th>
                  <th className="bg-[var(--color-navy)] text-white font-sans text-sm font-bold px-4 py-3 text-center min-w-[120px]">
                    NZPOS
                  </th>
                  {competitors.map((c) => (
                    <th
                      key={c.slug}
                      className="bg-[var(--surface)] font-sans text-sm font-bold text-[var(--color-text)] px-4 py-3 text-center min-w-[120px]"
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureCategories.map((category) => {
                  const categoryFeatures = features.filter(
                    (f) => f.category === category.slug
                  )
                  if (categoryFeatures.length === 0) return null
                  return (
                    <Fragment key={category.slug}>
                      {/* Category header row */}
                      <tr>
                        <td
                          colSpan={2 + competitors.length}
                          className="bg-[var(--surface)] font-display font-bold text-sm text-[var(--color-navy)] px-4 py-2 border-b border-[var(--border)]"
                        >
                          {category.name}
                        </td>
                      </tr>
                      {/* Feature rows */}
                      {categoryFeatures.map((feature, idx) => (
                        <tr
                          key={feature.name}
                          className={`border-b border-[var(--border)] ${idx % 2 === 1 ? 'bg-[var(--surface)]' : 'bg-white'}`}
                        >
                          <td className="sticky left-0 z-10 font-sans text-sm text-[var(--color-text)] px-4 py-3 bg-inherit">
                            {feature.name}
                          </td>
                          <td className="px-4 py-3 text-center bg-inherit">
                            {feature.addOnLink ? (
                              <Link
                                href={feature.addOnLink}
                                className="text-[var(--color-amber)] hover:underline font-sans text-sm font-bold"
                              >
                                {typeof feature.nzposValue === 'string'
                                  ? feature.nzposValue
                                  : feature.nzposValue
                                    ? 'Yes'
                                    : 'No'}
                              </Link>
                            ) : (
                              <CellValue value={feature.nzposValue} />
                            )}
                          </td>
                          {competitors.map((c) => (
                            <td
                              key={c.slug}
                              className="px-4 py-3 text-center bg-inherit"
                            >
                              <CellValue
                                value={feature.competitorValues[c.slug] ?? false}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA 1 — after feature matrix */}
      <section className="bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-3xl)] text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-[var(--color-navy)]">
            Ready to switch?
          </h2>
          <p className="font-sans text-base text-[var(--text-muted)] mt-[var(--space-sm)] max-w-xl mx-auto">
            Start with a free POS and online store. Add what you need, when you
            need it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="bg-[var(--color-amber)] text-white font-bold rounded-md px-6 py-3 hover:opacity-90 transition-opacity duration-150"
            >
              Start free trial
            </Link>
            <Link
              href="/demo/pos"
              className="border border-[var(--color-navy)] text-[var(--color-navy)] rounded-md px-6 py-3 hover:bg-[var(--color-navy)] hover:text-white transition-colors duration-150"
            >
              Try the POS demo
            </Link>
          </div>
        </div>
      </section>

      {/* Why NZPOS — editorial */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-3xl)]">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-[var(--color-navy)]">
            Why NZPOS
          </h2>

          <div className="mt-[var(--space-xl)] space-y-[var(--space-xl)]">
            <div>
              <h3 className="font-display font-bold text-lg text-[var(--color-navy)]">
                Built for New Zealand
              </h3>
              <p className="font-sans text-base text-[var(--text-muted)] mt-[var(--space-xs)] max-w-2xl">
                GST at 15%, tax-inclusive pricing, EFTPOS with your existing
                terminal, and Xero integration that syncs every night. NZPOS is
                not a global product with a currency toggle — it is built for
                how NZ retail actually works.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-lg text-[var(--color-navy)]">
                Honest pricing
              </h3>
              <p className="font-sans text-base text-[var(--text-muted)] mt-[var(--space-xs)] max-w-2xl">
                The core POS and online store are free. No monthly fee, no
                transaction fee on in-store sales. You only pay for the add-ons
                you choose — Xero, inventory, gift cards, reporting, or loyalty.
                Maximum spend across everything is $56/month.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-lg text-[var(--color-navy)]">
                One inventory, two channels
              </h3>
              <p className="font-sans text-base text-[var(--text-muted)] mt-[var(--space-xs)] max-w-2xl">
                Sell in-store on the POS and online through your storefront.
                Stock updates in real time across both channels. No overselling,
                no manual syncing, no spreadsheets.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-lg text-[var(--color-navy)]">
                Add what you need
              </h3>
              <p className="font-sans text-base text-[var(--text-muted)] mt-[var(--space-xs)] max-w-2xl">
                Most POS platforms lock features behind expensive tiers. NZPOS
                lets you pick individual add-ons so you are not paying for
                things you do not use. Start free, add Xero when your accountant
                asks, add loyalty when you are ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] pb-[var(--space-2xl)] md:pb-[var(--space-3xl)]">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-[var(--color-navy)]">
            Common questions
          </h2>
          <div className="mt-[var(--space-lg)]">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="border-b border-[var(--border)] group"
              >
                <summary className="cursor-pointer font-sans font-bold text-[var(--color-navy)] py-[var(--space-md)] list-none flex items-center justify-between gap-[var(--space-sm)]">
                  {item.question}
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
                    className="shrink-0 text-[var(--text-muted)] transition-transform duration-150 group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="pb-[var(--space-md)] text-[var(--text-muted)] font-sans text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 2 — after FAQ */}
      <section className="bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-3xl)] text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-[var(--color-navy)]">
            See it in action
          </h2>
          <p className="font-sans text-base text-[var(--text-muted)] mt-[var(--space-sm)] max-w-xl mx-auto">
            Try the full POS checkout or sign up and start selling today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[var(--space-md)] mt-[var(--space-lg)]">
            <Link
              href="/signup"
              className="bg-[var(--color-amber)] text-white font-bold rounded-md px-6 py-3 hover:opacity-90 transition-opacity duration-150"
            >
              Start free trial
            </Link>
            <Link
              href="/demo/pos"
              className="border border-[var(--color-navy)] text-[var(--color-navy)] rounded-md px-6 py-3 hover:bg-[var(--color-navy)] hover:text-white transition-colors duration-150"
            >
              Try the POS demo
            </Link>
          </div>
        </div>
      </section>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}

