import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--color-navy)] py-[var(--space-2xl)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)]">
        {/* Column grid */}
        <nav className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-xl)]" aria-label="Footer navigation">
          {/* Product */}
          <div>
            <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-wider mb-[var(--space-md)]">
              Product
            </h3>
            <a href="/#features" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Features
            </a>
            <a href="/#pricing" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Pricing
            </a>
            <Link href="/compare" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Compare
            </Link>
          </div>

          {/* Add-ons */}
          <div>
            <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-wider mb-[var(--space-md)]">
              Add-ons
            </h3>
            <Link href="/add-ons/xero" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Xero Integration
            </Link>
            <Link href="/add-ons/inventory" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Inventory
            </Link>
            <Link href="/add-ons/gift-cards" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Gift Cards
            </Link>
            <Link href="/add-ons/advanced-reporting" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Advanced Reporting
            </Link>
            <Link href="/add-ons/loyalty-points" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Loyalty Points
            </Link>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-wider mb-[var(--space-md)]">
              Account
            </h3>
            <Link href="/login" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Sign in
            </Link>
            <Link href="/signup" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Sign up
            </Link>
            <Link href="/demo/pos" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Try POS Demo
            </Link>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-wider mb-[var(--space-md)]">
              Legal
            </h3>
            <Link href="#" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Privacy
            </Link>
            <Link href="#" className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150 block mb-[var(--space-sm)]">
              Terms
            </Link>
          </div>
        </nav>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-[var(--space-xl)] pt-[var(--space-lg)]">
          <p className="font-sans text-sm text-white/40">
            &copy; 2026 NZPOS. Built in New Zealand.
          </p>
        </div>
      </div>
    </footer>
  )
}
