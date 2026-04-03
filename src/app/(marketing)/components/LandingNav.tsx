import Link from 'next/link'

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--color-navy)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-sm)] flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display font-bold text-xl text-white tracking-tight"
          aria-label="NZPOS home"
        >
          NZPOS
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-[var(--space-sm)]" aria-label="Main navigation">
          <Link
            href="/login"
            className="border border-white/50 text-white px-4 py-2 rounded-md text-sm hover:bg-white/10 transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-[var(--color-amber)] text-white px-4 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-opacity duration-150"
          >
            Get started
          </Link>
        </nav>

        {/* Mobile hamburger — uses <details>/<summary> for no-JS toggle */}
        <details className="md:hidden relative">
          <summary className="list-none cursor-pointer p-2 text-white" aria-label="Open navigation menu">
            {/* Hamburger icon */}
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
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </summary>
          {/* Mobile overlay */}
          <div className="fixed inset-0 top-[52px] bg-[var(--color-navy)] z-50 flex flex-col items-center justify-center gap-[var(--space-lg)]">
            <Link
              href="/login"
              className="border border-white/50 text-white px-8 py-3 rounded-md text-base hover:bg-white/10 transition-colors duration-150"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-[var(--color-amber)] text-white px-8 py-3 rounded-md text-base font-bold hover:opacity-90 transition-opacity duration-150"
            >
              Get started
            </Link>
          </div>
        </details>
      </div>
    </header>
  )
}
