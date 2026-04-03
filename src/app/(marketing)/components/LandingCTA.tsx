import Link from 'next/link'

export default function LandingCTA() {
  return (
    <section className="bg-[var(--color-navy)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)] text-center">
        <h2 className="font-sans text-xl font-bold text-white leading-[1.3]">
          Ready to run a better shop?
        </h2>
        <div className="mt-[var(--space-lg)]">
          <Link
            href="/signup"
            className="inline-block bg-[var(--color-amber)] text-white px-[var(--space-xl)] py-[var(--space-sm)] rounded-md text-sm font-bold hover:opacity-90 transition-opacity duration-150"
            aria-label="Get started free — final call to action"
          >
            Get started free
          </Link>
        </div>
        <p className="font-sans text-sm text-white/60 mt-[var(--space-sm)]">
          Set up in under 5 minutes.
        </p>
      </div>
    </section>
  )
}
