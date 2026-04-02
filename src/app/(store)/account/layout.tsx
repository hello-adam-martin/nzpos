// Simple passthrough layout -- auth page isolation handled per-page
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
