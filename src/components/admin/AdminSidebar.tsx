'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/actions/auth/signOut'

const BASE_NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/promos', label: 'Promos' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/cash-up', label: 'Cash-Up' },
  { href: '/admin/integrations', label: 'Integrations' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/billing', label: 'Billing' },
]

interface AdminSidebarProps {
  userEmail?: string | null
  hasInventory?: boolean
}

export default function AdminSidebar({ userEmail, hasInventory }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Build nav links — insert Inventory after Products when add-on is active
  const navLinks = hasInventory === true
    ? [
        BASE_NAV_LINKS[0], // Dashboard
        BASE_NAV_LINKS[1], // Products
        { href: '/admin/inventory', label: 'Inventory' },
        ...BASE_NAV_LINKS.slice(2), // Promos, Orders, Reports, Cash-Up, Integrations, Settings, Billing
      ]
    : BASE_NAV_LINKS

  const sidebarContent = (
    <>
      {/* Logo / brand area */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight">NZPOS</span>
        {/* Close button, mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-white/60 hover:text-white p-1"
          aria-label="Close menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
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
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-navy text-white p-2 rounded-[var(--radius-md)] shadow-md"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          'md:hidden fixed inset-y-0 left-0 z-50 w-[240px] flex flex-col bg-navy text-white transition-transform duration-250 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex w-[240px] min-h-screen flex-col bg-navy text-white flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  )
}
