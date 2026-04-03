interface UpgradePromptProps {
  feature: 'xero' | 'email_notifications' | 'custom_domain'
  headline: string
  body: string
}

export function UpgradePrompt({ feature, headline, body }: UpgradePromptProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 flex flex-col items-start gap-4">
      {/* 32px lock icon — color-text-light */}
      <svg
        className="w-8 h-8 text-[var(--color-text-light)]"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
      <p className="text-lg font-semibold font-sans text-[var(--color-text)]">{headline}</p>
      <p className="text-base font-sans text-[var(--color-text-muted)]">{body}</p>
      <a
        href={`/admin/billing?upgrade=${feature}`}
        className="bg-[var(--color-amber)] text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-md)] hover:opacity-90 transition-opacity duration-150"
      >
        Upgrade to unlock
      </a>
    </div>
  )
}
