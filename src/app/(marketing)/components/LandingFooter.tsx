import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--color-navy)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-xl)]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-[var(--space-md)]">
          <p className="font-sans text-sm text-white/40">
            © 2026 NZPOS. Built in New Zealand.
          </p>
          <nav className="flex items-center gap-[var(--space-md)]" aria-label="Footer navigation">
            <Link
              href="/login"
              className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150"
            >
              Sign in
            </Link>
            <span className="text-white/20" aria-hidden="true">|</span>
            <Link
              href="#"
              className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150"
            >
              Privacy
            </Link>
            <span className="text-white/20" aria-hidden="true">|</span>
            <Link
              href="#"
              className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-150"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
