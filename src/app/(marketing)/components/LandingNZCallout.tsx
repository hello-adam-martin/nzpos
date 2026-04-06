export default function LandingNZCallout() {
  return (
    <section className="bg-[var(--color-navy)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)]">
        <div className="flex flex-col md:flex-row items-center justify-center gap-[var(--space-xl)] text-center">
          <div className="flex flex-col items-center gap-[var(--space-sm)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-[var(--color-amber)]"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 12 15 16 9" />
            </svg>
            <p className="font-sans text-base font-bold text-white">
              GST-Compliant
            </p>
            <p className="font-sans text-sm text-white/70">
              Per-line calculation, IRD-ready
            </p>
          </div>

          <div className="flex flex-col items-center gap-[var(--space-sm)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-[var(--color-amber)]"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <p className="font-sans text-base font-bold text-white">
              NZD Pricing
            </p>
            <p className="font-sans text-sm text-white/70">
              All prices in New Zealand dollars
            </p>
          </div>

          <div className="flex flex-col items-center gap-[var(--space-sm)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-[var(--color-amber)]"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p className="font-sans text-base font-bold text-white">
              Built in NZ
            </p>
            <p className="font-sans text-sm text-white/70">
              Made for Kiwi retailers
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
