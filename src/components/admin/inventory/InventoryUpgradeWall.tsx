import { ADDONS } from '@/config/addons'

export function InventoryUpgradeWall() {
  const addon = ADDONS.find((a) => a.feature === 'inventory')!

  return (
    <div className="flex items-start justify-center pt-[var(--space-2xl)]">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 flex flex-col items-start gap-4 max-w-lg w-full">
        {/* 32px lock icon — matches UpgradePrompt.tsx */}
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
        <p className="text-lg font-semibold font-sans text-[var(--color-text)]">
          {addon.gatedHeadline}
        </p>
        <p className="text-base font-sans text-[var(--color-text-muted)]">
          {addon.gatedBody}
        </p>
        <a
          href="/admin/billing?upgrade=inventory"
          className="bg-[var(--color-amber)] text-white text-sm font-semibold px-4 py-2.5 rounded-[var(--radius-md)] hover:opacity-90 transition-opacity duration-150 w-full text-center"
        >
          Upgrade to unlock
        </a>
      </div>
    </div>
  )
}
