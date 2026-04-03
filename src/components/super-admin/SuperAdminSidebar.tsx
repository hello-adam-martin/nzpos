'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/actions/auth/signOut'

const navLinks = [
  { href: '/super-admin/tenants', label: 'Tenants' },
]

interface SuperAdminSidebarProps {
  userEmail?: string | null
}

export default function SuperAdminSidebar({ userEmail }: SuperAdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-[240px] min-h-screen flex-col bg-navy text-white flex-shrink-0">
      {/* Logo / brand area */}
      <div className="px-6 py-6 border-b border-white/10">
        <span className="font-display text-xl font-semibold tracking-tight">NZPOS</span>
        <p className="text-sm font-sans uppercase tracking-wider text-white/40 mt-1">SUPER ADMIN</p>
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
          <p className="text-sm text-white/50 font-sans truncate" title={userEmail}>
            {userEmail}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full text-left text-sm text-white/40 hover:text-white/70 font-sans transition-colors duration-150"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
