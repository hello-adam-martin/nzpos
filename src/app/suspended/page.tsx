export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-md p-8 max-w-md w-full text-center space-y-6">
        <div className="font-display font-semibold text-2xl text-[var(--color-navy)]">NZPOS</div>
        <h1 className="font-display font-semibold text-2xl text-[var(--color-navy)]">Store Suspended</h1>
        <p className="text-base font-sans text-[var(--color-text-muted)]">
          This store has been temporarily suspended. If you believe this is an error, please contact support.
        </p>
        <a
          href="mailto:support@nzpos.co.nz"
          className="text-base font-sans text-[var(--color-amber)] hover:underline"
        >
          support@nzpos.co.nz
        </a>
      </div>
    </div>
  )
}
