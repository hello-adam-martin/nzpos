const features = [
  {
    title: 'POS on iPad',
    description: 'Tap to sell. Scan barcodes. EFTPOS confirmed manually.',
    icon: (
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
        {/* Tablet/iPad shape */}
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  {
    title: 'Online store included',
    description: 'Your storefront is live from day one. Click-and-collect ready.',
    icon: (
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
        {/* Shopping bag */}
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    title: 'GST done right',
    description: '15% GST calculated per line, IRD-compliant on every receipt.',
    icon: (
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
        {/* Receipt/calculator */}
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Stock stays in sync',
    description: 'Sell in-store or online — inventory updates instantly.',
    icon: (
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
        {/* Sync/refresh */}
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
]

export default function LandingFeatures() {
  return (
    <section className="bg-[var(--color-bg)]">
      <div className="max-w-[1200px] mx-auto px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-3xl)]">
        <h2 className="font-sans text-xl font-bold text-[var(--color-text)] text-center leading-[1.3]">
          Everything a Kiwi shop needs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)] mt-[var(--space-xl)]">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-[var(--color-border)] shadow-sm rounded-lg p-[var(--space-xl)]"
            >
              <div className="text-[var(--color-navy)]">{feature.icon}</div>
              <h3 className="font-sans text-sm font-bold text-[var(--color-text)] mt-[var(--space-md)]">
                {feature.title}
              </h3>
              <p className="font-sans text-base text-[var(--color-text-muted)] mt-[var(--space-xs)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
