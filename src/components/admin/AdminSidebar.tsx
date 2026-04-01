'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/actions/auth/signOut'

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/promos', label: 'Promos' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/cash-up', label: 'Cash-Up' },
]

interface AdminSidebarProps {
  userEmail?: string | null
}

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-[240px] min-h-screen flex flex-col bg-navy text-white flex-shrink-0">
      {/* Logo / brand area */}
      <div className="px-6 py-6 border-b border-white/10">
        <span className="font-display text-lg font-semibold tracking-tight">NZPOS</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center px-3 py-3 rounded-[var(--radius-md)] text-sm font-semibold font-sans transition-colors duration-150',
                isActive
                  ? 'bg-white/10 text-white border-l-4 border-amber pl-2'
                  : 'text-white/60 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer area */}
      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        {userEmail && (
          <p className="text-xs text-white/50 font-sans truncate" title={userEmail}>
            {userEmail}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full text-left text-xs text-white/40 hover:text-white/70 font-sans transition-colors duration-150"
          >
            Sign out
          </button>
        </form>
        <p className="text-xs text-white/30 font-sans">NZPOS v1.0</p>
      </div>
    </aside>
  )
}
