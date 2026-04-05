# Phase 26: Super-Admin Billing + User Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 26-super-admin-billing-user-management
**Areas discussed:** Dashboard metrics layout, Billing detail on tenant page, User management actions, Super-admin nav structure

---

## Dashboard Metrics Layout

### Where should the super-admin dashboard live?

| Option | Description | Selected |
|--------|-------------|----------|
| New /super-admin page | Dashboard is the landing page at /super-admin. Sidebar gets a 'Dashboard' link above 'Tenants'. Matches admin panel pattern. | ✓ |
| Top of tenants page | Metrics appear as a stats row above the tenant table on the existing /super-admin/tenants page. No new route. | |

**User's choice:** New /super-admin page
**Notes:** None

### What chart style for the 30-day signup trend?

| Option | Description | Selected |
|--------|-------------|----------|
| Line chart with area fill | Matches the sales trend chart from Phase 25 admin dashboard. Consistent visual language. Uses Recharts (already installed). | ✓ |
| Bar chart | Discrete daily bars. Visually distinct from admin charts. | |

**User's choice:** Line chart with area fill
**Notes:** None

### How should add-on adoption rates display?

| Option | Description | Selected |
|--------|-------------|----------|
| Percentage badges in stat cards | Each add-on gets a stat card showing '23% of tenants'. Compact, scannable. | ✓ |
| Horizontal bar chart | Visual comparison bars for each add-on. More detailed but takes more vertical space. | |

**User's choice:** Percentage badges in stat cards
**Notes:** None

---

## Billing Detail on Tenant Page

### How should Stripe billing data be fetched?

| Option | Description | Selected |
|--------|-------------|----------|
| Live Stripe API calls | Fetch subscriptions/invoices from Stripe API on tenant detail page load. Real-time accuracy. Phase 27 adds materialised data later. | ✓ |
| Store in local DB via webhook | Mirror Stripe data to local tables via webhooks. Faster reads but adds webhook handling complexity now. | |

**User's choice:** Live Stripe API calls
**Notes:** None

### How should billing info be structured on the tenant detail page?

| Option | Description | Selected |
|--------|-------------|----------|
| New sections below existing content | Add 'Subscriptions' and 'Invoices' sections below the existing addon/audit sections. Single scrollable page stays consistent. | ✓ |
| Tabs on tenant detail | Split tenant detail into tabs: Overview, Billing, Audit Log. Cleaner separation but new UI pattern. | |

**User's choice:** New sections below existing content
**Notes:** None

### How should payment failure alerts appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Warning banner on tenant detail | Yellow/red alert banner at top of tenant detail page when past-due invoices exist. Immediately visible on page load. | ✓ |
| Badge on tenant list + detail banner | Add a 'Past Due' badge to the tenant table row AND show the banner on detail. More visibility but more UI work. | |

**User's choice:** Warning banner on tenant detail
**Notes:** None

---

## User Management Actions

### How should the password reset trigger work?

| Option | Description | Selected |
|--------|-------------|----------|
| Button sends Supabase reset email | Super-admin clicks 'Send Password Reset' on tenant detail. Uses Supabase Admin API to trigger a reset email to the owner. Confirmation modal before sending. | ✓ |
| Generate temporary password | Super-admin generates a temp password shown once, like staff PIN reset. Owner must change on next login. More complex. | |

**User's choice:** Button sends Supabase reset email
**Notes:** None

### How should merchant account disable work?

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase ban + store suspend | Disabling bans the user in Supabase Auth (prevents login) AND suspends the store (blocks storefront/POS). Both actions in one flow. Mirrors existing suspend pattern. | ✓ |
| Auth ban only | Only ban the Supabase Auth user. Store stays technically 'active' but owner can't log in. Other staff could still use POS if they have PINs. | |

**User's choice:** Supabase ban + store suspend
**Notes:** None

### Where do user management actions appear?

| Option | Description | Selected |
|--------|-------------|----------|
| On existing tenant detail page | Add buttons alongside existing Suspend/Unsuspend actions on tenant detail. No new pages needed. | ✓ |
| Separate user management page | New /super-admin/users page listing owner accounts. Separate from tenants. More overhead, unclear benefit. | |

**User's choice:** On existing tenant detail page
**Notes:** None

---

## Super-Admin Nav Structure

### What nav links should the super-admin sidebar have?

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard + Tenants | Two links. Clean and minimal for Phase 26 scope. | |
| Dashboard + Tenants + Analytics | Three links — adds Analytics placeholder for Phase 27 MRR/churn. Pre-builds the nav structure. | ✓ |
| Dashboard + Tenants + Billing | Three links — separates Billing from Tenants. But billing is per-tenant, so standalone billing page may not make sense. | |

**User's choice:** Dashboard + Tenants + Analytics
**Notes:** Analytics is a placeholder for Phase 27

---

## Claude's Discretion

- Stat card sizing, grid layout, responsive breakpoints on dashboard
- Recharts configuration (colors, grid, tooltips) — follow DESIGN.md
- Invoice table columns and formatting
- Subscription display format
- Warning banner styling details
- Loading states for Stripe API calls
- Analytics placeholder page content

## Deferred Ideas

None — discussion stayed within phase scope
