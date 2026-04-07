import Link from 'next/link'

export default function LandingHero() {
  return (
    <section className="bg-[var(--color-navy)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-3xl)]">
        <div className="md:grid md:grid-cols-2 md:gap-[var(--space-xl)] items-center">
          {/* Left column — copy */}
          <div>
            <h1 className="font-display font-bold text-[28px] md:text-[48px] leading-[1.1] text-white">
              The retail platform built for Kiwi businesses.
            </h1>
            <p className="text-base leading-relaxed text-white/70 mt-[var(--space-lg)]">
              Sell in-store and online from one dashboard. GST handled correctly on every transaction. 5 optional add-ons when you need them.
            </p>
            {/* CTA buttons — per D-07: two CTAs in hero, per D-08: ghost outlined secondary */}
            <div className="flex flex-wrap gap-[var(--space-sm)] mt-[var(--space-lg)] items-center">
              <Link
                href="/signup"
                className="inline-block bg-[var(--color-amber)] text-white px-[var(--space-xl)] py-[var(--space-sm)] rounded-md text-sm font-bold hover:opacity-90 transition-opacity duration-150"
                aria-label="Get started free — hero call to action"
              >
                Get started free
              </Link>
              <Link
                href="/demo/pos"
                className="inline-block border border-white/70 text-white px-[var(--space-xl)] py-[var(--space-sm)] rounded-md text-sm font-bold hover:bg-white/10 transition-colors duration-150"
                aria-label="Try the POS demo"
              >
                Try POS Demo
              </Link>
            </div>
            <p className="text-sm text-white/50 mt-[var(--space-sm)]">
              No credit card required. NZD pricing.
            </p>
          </div>

          {/* Right column — iPad mockup illustration (desktop only) */}
          <div className="hidden md:flex items-center justify-center" aria-hidden="true">
            <div className="relative w-[320px] h-[420px] bg-[var(--color-navy-dark)] rounded-[24px] border-[6px] border-[var(--color-navy-light)] flex flex-col overflow-hidden shadow-lg">
              {/* iPad home button area */}
              <div className="flex items-center justify-center h-8 border-b border-white/10">
                <div className="w-16 h-1.5 bg-white/20 rounded-full" />
              </div>
              {/* Screen content */}
              <div className="flex-1 p-4 flex flex-col gap-3">
                {/* Mock nav bar */}
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-white text-sm">NZPOS</div>
                  <div className="w-6 h-6 rounded-full bg-[var(--color-amber)] opacity-80" />
                </div>
                {/* Mock product grid */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white/10 rounded-md flex items-center justify-center aspect-square"
                    >
                      <div className="w-8 h-8 bg-white/20 rounded" />
                    </div>
                  ))}
                </div>
                {/* Mock cart total */}
                <div className="bg-[var(--color-amber)] rounded-md py-2 text-center text-white text-sm font-bold">
                  Pay $42.50
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
