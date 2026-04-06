import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Email Notifications — NZPOS Add-ons',
  description:
    'Automated order confirmations, pickup-ready alerts, and daily sales summaries. Keep customers informed and yourself in the loop.',
}

const features = [
  {
    title: 'Order confirmations',
    description:
      'Customers get an email the moment they place an order online — with order details, estimated pickup time, and your store contact info.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        <path d="m16 19 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Pickup-ready alerts',
    description:
      'When you mark a click-and-collect order as ready, the customer is notified instantly. No phone calls, no chasing.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    title: 'Daily sales summary',
    description:
      'Get a summary email at the end of each day with total sales, transaction count, top products, and GST collected. Check your day in 30 seconds.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Branded emails',
    description:
      'Emails use your store name and look professional out of the box. No design work needed — just enable and go.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
]

const steps = [
  { number: '1', text: 'Enable Email Notifications in Settings → Notifications' },
  { number: '2', text: 'Choose which emails to send (confirmations, alerts, summaries)' },
  { number: '3', text: 'Emails are sent automatically — nothing else to configure' },
]

export default function EmailNotificationsPage() {
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
            Email Notifications
          </h1>
          <div className="flex items-center gap-[var(--space-md)] mt-[var(--space-md)]">
            <span className="inline-block bg-[var(--color-amber)] text-white font-sans text-sm font-bold px-4 py-1 rounded-full">
              $5/month NZD
            </span>
          </div>
          <p className="font-sans text-base md:text-lg text-white/70 mt-[var(--space-md)] max-w-2xl">
            Keep your customers in the loop and yourself informed — without lifting a finger after setup.
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
              Customers expect to hear from you after they place an order. Email Notifications handles the three messages that matter most: a confirmation when they order, an alert when their pickup is ready, and a receipt they can reference later.
            </p>
            <p className="font-sans text-base text-[var(--color-text-muted)]">
              You also get a daily sales summary delivered to your inbox — total revenue, transaction count, top-selling products, and GST collected. Review your day in 30 seconds without logging in.
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
            Let your store do the talking.
          </h2>
          <p className="font-sans text-base text-white/70 mt-[var(--space-sm)]">
            Sign up free, then enable Email Notifications from Settings.
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
