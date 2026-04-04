// Centralized role constants for the NZPOS RBAC system.
// Three-tier role model: owner > manager > staff.
// Per D-09: manager sidebar shows Dashboard, Orders, Reports, Cash-Up only.

export const POS_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const

export type PosRole = (typeof POS_ROLES)[keyof typeof POS_ROLES]

/**
 * Admin routes accessible by managers (read-only operations, day-to-day tasks).
 * Per D-09: manager sidebar shows only these routes.
 */
export const MANAGER_ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/orders',
  '/admin/reports',
  '/admin/cash-up',
] as const

/**
 * Admin routes restricted to owner only (store configuration, staff, billing).
 * Managers cannot access these routes.
 */
export const OWNER_ONLY_ADMIN_ROUTES = [
  '/admin/products',
  '/admin/promos',
  '/admin/staff',
  '/admin/inventory',
  '/admin/integrations',
  '/admin/settings',
  '/admin/billing',
] as const
