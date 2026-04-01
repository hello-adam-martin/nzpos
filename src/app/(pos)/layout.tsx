export const metadata = {
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh overflow-hidden bg-bg touch-manipulation">{children}</div>
}
