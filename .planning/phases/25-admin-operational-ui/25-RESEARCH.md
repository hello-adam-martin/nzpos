# Phase 25: Admin Operational UI - Research

**Researched:** 2026-04-05
**Domain:** Next.js App Router admin UI — customer management, dashboard charts, promo CRUD, settings expansion
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Customer Management**
- D-01: Customer list uses a paginated table with search bar at top (filters by name or email). Columns: name, email, order count, status. Click row opens detail page. Consistent with staff/products table patterns.
- D-02: Customer detail page has a profile header (name, email, status, created date, Disable button) above a paginated order history table (order#, date, total, status). Single scrollable page, no tabs.
- D-03: Disable flow uses a confirmation modal: "Disable [Name]? They won't be able to log in to the storefront." Confirm/Cancel. No reason field. Re-enable via the same page with an "Enable" button when disabled.

**Dashboard Charts & Metrics**
- D-04: Sales trend uses a line chart with area fill (via Recharts, already installed). Distinct from the bar chart used in reports. Default period: 7 days.
- D-05: Period selector is a simple two-button toggle (7 days / 30 days) positioned above the chart.
- D-06: Comparison metrics row uses stat cards with delta badges — green up-arrow / red down-arrow with percentage change. Comparisons: today vs yesterday, this week vs last week. Extends existing DashboardHeroCard pattern.
- D-07: Recent orders widget shows the last 5 orders with order#, date, total, status. Compact table or card list format — Claude's discretion on exact layout.

**Promo Edit & Soft-Delete**
- D-08: Editing uses a modal pre-filled with current values (discount, min order, max uses, expiry). Same form layout as existing PromoForm. Click "Edit" action on the promo row to open.
- D-09: Soft-delete sets `is_active = false` (or a dedicated `deleted_at` timestamp). Deleted promos are hidden from the default list view. A "Show deleted" toggle at the top reveals them greyed out with a "Deleted" badge.
- D-10: Soft-delete requires a confirmation modal: "Delete [Code]? It will stop working immediately but order history is preserved." Confirm/Cancel.

**Store Settings Expansion**
- D-11: Settings page uses a single scrollable page with sections: Branding (existing BrandingForm), Business Details (address, phone, IRD/GST number), Receipt Customization (header text, footer text). Each section has its own Save button.
- D-12: No receipt preview — simple text inputs for header and footer.
- D-13: New DB columns needed on `stores` table: `business_address`, `phone`, `ird_gst_number`, `receipt_header`, `receipt_footer`. All nullable TEXT fields.

### Claude's Discretion
- Exact table column widths and responsive breakpoints for customer table
- Recent orders widget layout (compact table vs card list)
- Search debounce timing and empty state messaging
- Exact Recharts configuration (colors, grid lines, tooltip format) — follow DESIGN.md palette
- Whether promo soft-delete uses `is_active = false` or a dedicated `deleted_at` timestamp
- Loading skeleton patterns for all new components

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CUST-01 | Admin can view a paginated list of customers with name, email, and order count | Customers table exists in DB (migration 012). No `is_active` column — migration 028 needed to add it. Order count requires aggregated query joining orders. |
| CUST-02 | Admin can search customers by name or email | Client-side debounced search (300ms) against fetched customer list, or server-side Supabase `.ilike()` filter. Staff page uses client-side; sufficient for moderate customer volumes. |
| CUST-03 | Admin can view a customer's order history from the customer detail page | Join `orders` table on `customer_id = customers.auth_user_id`. Paginated at 10 per page. |
| CUST-04 | Admin can disable a customer account, preventing them from logging into the storefront | Requires `is_active` column on `customers` table (migration) AND Supabase Auth ban via `admin.auth.admin.updateUserById(auth_user_id, { ban_duration: 'none'/'876600h' })`. Two-step operation. |
| PROMO-01 | Admin can edit an existing promo code's discount amount, min order, max uses, and expiry date | `promo_codes` table has `is_active` column already. UPDATE action mirrors createPromoCode pattern. Zod schema extension needed. |
| PROMO-02 | Admin can soft-delete a promo code, removing it from active use but preserving history | Use `is_active = false` (column already exists in DB + types). No new migration needed. |
| SETTINGS-01 | Admin can edit store business address and phone number from settings | Migration 028 adds `business_address TEXT`, `phone TEXT` to `stores` table. Follow BrandingForm Server Action pattern. |
| SETTINGS-02 | Admin can edit receipt header and footer text from settings | Migration 028 adds `receipt_header TEXT`, `receipt_footer TEXT` to `stores` table. |
| SETTINGS-03 | Admin can view and edit the store's IRD/GST number from settings | Migration 028 adds `ird_gst_number TEXT` to `stores` table. |
| DASH-01 | Dashboard shows a 7-day or 30-day sales trend chart | Recharts `AreaChart` with `LinearGradient` fill. Query: group orders by date within period. Client component with period toggle state. |
| DASH-02 | Dashboard shows key metrics with period comparison (today vs yesterday, this week vs last week) | Two server-side date-range queries. Delta = `(current - previous) / previous * 100`. Extend DashboardHeroCard with delta badge prop. |
| DASH-03 | Dashboard shows a recent orders widget with the last 5 orders | Single Supabase query: `.order('created_at', { ascending: false }).limit(5)`. Compact table component. |

</phase_requirements>

---

## Summary

Phase 25 is a UI-heavy admin expansion with four distinct capability areas. The project has excellent established patterns to follow: the staff management pages (Phase 24) provide the complete template for customer list + detail + modals. Recharts is already installed and used in reports. The promo table already has `is_active` making soft-delete a simple UPDATE. The settings page follows the BrandingForm pattern exactly.

The single most important discovery is the **customer disable mechanism**: disabling a customer requires two operations — (1) set `is_active = false` on the `customers` table (new column, needs migration) and (2) call `admin.auth.admin.updateUserById(auth_user_id, { ban_duration: '876600h' })` via the Supabase admin client to actually prevent login. Setting `is_active = false` alone does NOT prevent login — the Supabase Auth JWT check happens before any DB lookup. Re-enabling calls the same method with `ban_duration: 'none'`.

The second key finding is that **the `customers` table currently has no `is_active` column** (confirmed in `src/types/database.ts` and `supabase/migrations/012_customer_accounts.sql`). Migration 028 must add: `is_active BOOLEAN NOT NULL DEFAULT true` to `customers`, plus the five settings columns to `stores`.

**Primary recommendation:** Follow Staff page patterns exactly (Server Component fetches → ClientPageComponent → modal state machine → Server Actions with Zod + `server-only`). Use `admin.auth.admin.updateUserById` for customer ban/unban. Use Recharts `AreaChart` with `LinearGradient` for the trend chart. Resolve promo soft-delete as `is_active = false` (column already exists, no migration needed for promos).

---

## Standard Stack

### Core (Already Installed — No New Packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.1 | Area chart for sales trend | Already installed, `SalesBarChart` provides style reference |
| @supabase/supabase-js | ^2.x | DB queries + admin auth ban/unban | All admin pages use `createSupabaseServerClient` and `createSupabaseAdminClient` |
| zod | ^3.x | Server Action input validation | All mutations use `z.safeParse()` — required by project convention |
| server-only | latest | Guard server modules from client | All Server Actions import this — project requirement |
| next/navigation | (Next.js 16 built-in) | `redirect()`, `useRouter()`, `usePathname()` | Customer list → detail navigation |
| next/cache | (Next.js 16 built-in) | `revalidatePath()` after mutations | All existing Server Actions use this |

### No New Packages Required

This phase adds no new npm dependencies. All capability is achievable with the existing stack:
- Charts: recharts (installed)
- Forms: native `useActionState` pattern (established)
- Modals: custom React state (established in StaffPageClient)
- Skeletons: Tailwind `animate-pulse` (project standard)

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure (New Files)

```
src/
├── app/admin/
│   ├── customers/
│   │   ├── page.tsx                    # Server Component: fetches customer list
│   │   └── [id]/
│   │       └── page.tsx                # Server Component: fetches customer detail + order history
│   ├── dashboard/page.tsx              # EXTENDED: add chart + comparison cards + recent orders
│   ├── settings/
│   │   ├── page.tsx                    # EXTENDED: add BusinessDetailsForm + ReceiptForm sections
│   │   ├── BrandingForm.tsx            # UNCHANGED
│   │   ├── BusinessDetailsForm.tsx     # NEW: address, phone, IRD/GST
│   │   └── ReceiptForm.tsx             # NEW: header textarea, footer textarea
│   └── promos/page.tsx                 # UNCHANGED (PromoList extended separately)
├── components/admin/
│   ├── customers/
│   │   ├── CustomersPageClient.tsx     # Client: search state, pagination, modal state
│   │   ├── CustomerTable.tsx           # Table: name, email, order count, status, row click
│   │   └── DisableCustomerModal.tsx    # Confirm modal: Disable/Enable
│   ├── dashboard/
│   │   ├── SalesTrendChart.tsx         # NEW: Recharts AreaChart + LinearGradient
│   │   ├── PeriodToggle.tsx            # NEW: 7d/30d toggle buttons
│   │   ├── ComparisonStatCard.tsx      # NEW: DashboardHeroCard + delta badge
│   │   └── RecentOrdersWidget.tsx      # NEW: compact table, last 5 orders
│   ├── PromoList.tsx                   # EXTENDED: edit/delete actions, show-deleted toggle
│   └── EditPromoModal.tsx              # NEW: PromoForm in modal overlay
├── actions/
│   ├── customers/
│   │   ├── getCustomers.ts             # Server Action: paginated list + order count
│   │   ├── getCustomerDetail.ts        # Server Action: profile + order history
│   │   ├── disableCustomer.ts          # Server Action: is_active=false + auth ban
│   │   └── enableCustomer.ts           # Server Action: is_active=true + auth unban
│   ├── promos/
│   │   ├── createPromoCode.ts          # UNCHANGED
│   │   ├── updatePromoCode.ts          # NEW: Zod-validated UPDATE
│   │   └── deletePromoCode.ts          # NEW: is_active=false soft-delete
│   └── settings/
│       ├── updateBusinessDetails.ts    # NEW: address, phone, IRD/GST save
│       └── updateReceiptSettings.ts    # NEW: header/footer save
└── supabase/migrations/
    └── 028_customer_disable_settings.sql  # NEW: customers.is_active + stores new columns
```

### Pattern 1: Server Component → ClientPageComponent (Staff Page Template)

The staff page established this architecture for ALL admin list pages. Customer pages MUST follow it exactly.

```typescript
// src/app/admin/customers/page.tsx
import { getCustomers } from '@/actions/customers/getCustomers'
import CustomersPageClient from '@/components/admin/customers/CustomersPageClient'

export default async function CustomersPage() {
  const result = await getCustomers()
  if ('error' in result) {
    return <ErrorState message="Couldn't load customers. Refresh the page to try again." />
  }
  return <CustomersPageClient customers={result.data} />
}
```

```typescript
// src/actions/customers/getCustomers.ts
'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { POS_ROLES } from '@/config/roles'

export async function getCustomers() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }
  const storeId = user.app_metadata?.store_id as string
  if (!storeId) return { error: 'No store context' }

  // Use admin client for order count aggregation (bypasses RLS complexity)
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .select('id, name, email, is_active, created_at, auth_user_id, orders(count)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Failed to fetch customers' }
  return { data: data ?? [] }
}
```

**Source:** Confirmed pattern from `src/actions/staff/getStaffList.ts` + `src/app/admin/staff/page.tsx`

### Pattern 2: Customer Disable — Two-Step Operation (CRITICAL)

Disabling a customer requires BOTH steps. Either alone is insufficient.

```typescript
// src/actions/customers/disableCustomer.ts
'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function disableCustomer(input: unknown) {
  // 1. Auth: owner only
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'owner') return { error: 'INSUFFICIENT_ROLE' }
  const storeId = user.app_metadata?.store_id as string

  // 2. Validate input (customerId = customers.id, authUserId = customers.auth_user_id)
  // Zod parse...

  const admin = createSupabaseAdminClient()

  // Step A: Set is_active = false in customers table (DB flag for UI display)
  const { data, error: dbError } = await admin
    .from('customers')
    .update({ is_active: false })
    .eq('id', customerId)
    .eq('store_id', storeId)
    .select('auth_user_id')
    .single()

  if (dbError || !data) return { error: 'Customer not found' }

  // Step B: Ban in Supabase Auth (prevents actual login)
  // ban_duration: '876600h' = 100 years (effectively permanent)
  const { error: banError } = await admin.auth.admin.updateUserById(
    data.auth_user_id,
    { ban_duration: '876600h' }
  )
  if (banError) {
    // Rollback DB flag to keep state consistent
    await admin.from('customers').update({ is_active: true }).eq('id', customerId)
    return { error: 'Failed to disable account' }
  }

  revalidatePath('/admin/customers')
  return { success: true }
}
```

**Re-enable:** Same pattern with `is_active: true` + `ban_duration: 'none'`.

**Source:** Supabase admin client `updateUserById` pattern confirmed in `src/actions/auth/provisionStore.ts:78` and `src/actions/auth/retryProvisioning.ts:73`. The `ban_duration` approach is the established Supabase mechanism for blocking user login without deleting the account (HIGH confidence — verified in codebase usage patterns).

### Pattern 3: Recharts AreaChart with LinearGradient

```typescript
// src/components/admin/dashboard/SalesTrendChart.tsx
'use client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, defs, linearGradient, stop
} from 'recharts'
import { formatNZD } from '@/lib/money'

// Gradient: amber (#E67E22) opacity 0.15 at top, 0 at bottom — per UI-SPEC
// Navy (#1E293B) stroke — per UI-SPEC
// CartesianGrid: horizontal only, stroke="#E7E5E4", strokeDasharray="4 4" — per UI-SPEC
// No dots on line — per UI-SPEC
// height={240}, same as SalesBarChart — per UI-SPEC
```

**Source:** UI-SPEC.md Interaction Contracts → Sales Trend Chart section. Recharts API pattern confirmed from `src/components/admin/reports/SalesBarChart.tsx`.

### Pattern 4: Promo Soft-Delete via `is_active = false`

The `promo_codes` table already has `is_active BOOLEAN` (confirmed in `src/types/database.ts` Row type). No migration needed for promos. The existing `PromoList` already uses `getPromoStatus()` which reads `promo.is_active`. Soft-delete = set `is_active = false`. The "Show deleted" toggle filters the list client-side.

```typescript
// src/actions/promos/deletePromoCode.ts
'use server'
import 'server-only'
// ... auth/validation boilerplate ...
const { error } = await supabase
  .from('promo_codes')
  .update({ is_active: false })
  .eq('id', promoId)
  .eq('store_id', storeId)
  .eq('is_active', true) // optimistic lock

revalidatePath('/admin/promos')
return { success: true }
```

**Source:** `src/types/database.ts` promo_codes.Row confirmed `is_active: boolean`. Pattern mirrors `deactivateStaff.ts` optimistic lock.

### Pattern 5: Settings Server Action (BrandingForm Template)

```typescript
// src/actions/settings/updateBusinessDetails.ts
'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const BusinessDetailsSchema = z.object({
  business_address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  ird_gst_number: z.string().max(50).optional(),
})

export async function updateBusinessDetails(input: unknown) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'owner') return { error: 'INSUFFICIENT_ROLE' }
  const storeId = user.app_metadata?.store_id as string

  const parsed = BusinessDetailsSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { error } = await supabase
    .from('stores')
    .update(parsed.data)
    .eq('id', storeId)

  if (error) return { error: "Couldn't save settings. Check your connection and try again." }
  revalidatePath('/admin/settings')
  return { success: true }
}
```

**Source:** Mirrors `src/actions/setup/updateBranding.ts` pattern exactly.

### Pattern 6: Dashboard Comparison Queries

```typescript
// In dashboard/page.tsx — server-side date math
const now = new Date()

// Today
const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
// Yesterday
const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
// This week (Mon-based)
const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - dayOfWeek); thisWeekStart.setHours(0,0,0,0)
// Last week
const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7)
const lastWeekEnd = new Date(thisWeekStart)
```

Delta calculation: `delta = previous === 0 ? null : Math.round((current - previous) / previous * 100)`

### Anti-Patterns to Avoid

- **Client-side Supabase for admin queries:** All admin data fetching uses `createSupabaseServerClient()` (RLS-enforced) or `createSupabaseAdminClient()` (for cross-tenant admin ops). Never use anon client for admin pages.
- **Trusting JWT role for mutations:** All owner-only actions check `user.app_metadata?.role !== POS_ROLES.OWNER` — never skip this check.
- **Banning without DB flag:** Setting `ban_duration` without setting `is_active = false` leaves UI showing the customer as active. Both steps required.
- **Disabling without auth ban:** Setting `is_active = false` without banning allows the customer to still log in (Supabase Auth doesn't consult the DB `is_active` flag). Both steps required.
- **Raw `Date` math without NZ timezone:** Reports use UTC dates from DB. Dashboard comparison metrics (today/yesterday) should use server-side UTC midnight boundaries — consistent with existing `todayStart.setHours(0,0,0,0)` pattern in the current `dashboard/page.tsx`.
- **PromoForm `useActionState` without initialValues prop:** The current `PromoForm` has no `initialValues` prop — the EditPromoModal needs a modified version that accepts pre-filled values. The safest approach is creating a separate `EditablePromoForm` or adding optional defaultValue props, NOT modifying `PromoForm` in a way that breaks the create flow.
- **Recharts SSR issues:** Recharts components must be `'use client'` — they use browser APIs. Wrap in `Suspense` with a skeleton fallback in the Server Component parent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced search input | Custom setTimeout logic | Pattern from staff search or `useEffect + setTimeout(fn, 300)` | Debounce is 5 lines — but must clear on unmount to avoid state updates after unmount. Simple enough to inline. |
| Auth user ban | Custom JWT blacklist | `admin.auth.admin.updateUserById(id, { ban_duration })` | Supabase handles token invalidation across all sessions |
| Area chart gradient | Custom SVG/Canvas | Recharts `<defs><linearGradient>` inside `AreaChart` | Already in recharts — 10 lines |
| Modal backdrop/portal | React Portal + body scroll lock | Same fixed-inset pattern from StaffPageClient | No need for portals — existing modals use fixed positioning without portals |
| Pagination component | Custom prev/next logic | Inline `useState` for page offset, slice client-side or Supabase `.range()` | Staff page does client-side slice; adopt same for customers |

**Key insight:** Every "new" problem in this phase has already been solved in the codebase. The primary job is extending, not inventing.

---

## Common Pitfalls

### Pitfall 1: Customer Disable is a Two-Step Operation
**What goes wrong:** Setting only `customers.is_active = false` but not banning in Supabase Auth — customer can still log in, just sees wrong UI state. OR banning in Auth without updating `is_active` — customer is blocked but UI shows "Active".
**Why it happens:** The customers table `is_active` is a display/query flag only. Supabase Auth session validity is controlled separately by the `ban_duration` mechanism.
**How to avoid:** `disableCustomer` Server Action must do BOTH: update DB flag AND call `admin.auth.admin.updateUserById`. Use rollback on auth ban failure.
**Warning signs:** If disable appears to work but customer can still reach `/account` — auth ban was skipped.

### Pitfall 2: Migration Needed for `customers.is_active`
**What goes wrong:** Attempting to UPDATE `customers` table with `is_active` without adding the column first.
**Why it happens:** Migration 012 created the customers table WITHOUT `is_active` (verified in schema). The generated types in `src/types/database.ts` also confirm no `is_active` on customers.
**How to avoid:** Migration 028 must be the FIRST task executed. Add `is_active BOOLEAN NOT NULL DEFAULT true` to `customers` table. Regenerate types after migration (`npx supabase gen types typescript`).
**Warning signs:** TypeScript error on `.update({ is_active: false })` targeting customers table.

### Pitfall 3: Recharts Must Be `'use client'`
**What goes wrong:** Importing Recharts components in a Server Component causes `window is not defined` runtime error.
**Why it happens:** Recharts uses browser APIs internally.
**How to avoid:** `SalesTrendChart`, `PeriodToggle` must be `'use client'` components. The dashboard `page.tsx` wraps them in `<Suspense fallback={<ChartSkeleton />}>`.
**Warning signs:** Build error or runtime SSR error mentioning `window` or `document`.

### Pitfall 4: PromoForm Mutation Pattern
**What goes wrong:** Trying to reuse `PromoForm` component for edit without modifying it — the form action is hardcoded to `createPromoCode`.
**Why it happens:** Current `PromoForm` uses `useActionState(async (_prev, formData) => createPromoCode(...))` — the action is baked in.
**How to avoid:** `EditPromoModal` should either (a) accept an `action` prop or (b) duplicate the form JSX wired to `updatePromoCode`. Option (b) is safer to avoid breaking the create flow. Extract shared field JSX into a sub-component or duplicate — both are valid for this scope.
**Warning signs:** "Create Promo Code" button appearing inside the edit modal.

### Pitfall 5: Order Count Query Performance
**What goes wrong:** N+1 queries — fetching customers then querying orders for each one individually.
**Why it happens:** Naive implementation loops over customers and queries orders per customer.
**How to avoid:** Use Supabase's embed syntax: `.select('*, orders(count)')` — Postgres aggregates in a single query. Or use a separate aggregation query with `GROUP BY customer_id`.
**Warning signs:** Slow customer list page; N network requests in Supabase dashboard.

### Pitfall 6: Period Toggle State Requires Dashboard Refetch
**What goes wrong:** Period toggle changes from 7 to 30 days but chart data doesn't update because the data was fetched server-side.
**Why it happens:** Dashboard is a Server Component; period is client-side state.
**How to avoid:** Dashboard chart section must be a Client Component that accepts initial data OR fetches its own data. Two options: (a) Pass both 7-day and 30-day data from server, toggle hides/shows, OR (b) Client component calls a Server Action on toggle. Option (a) is simpler — fetch both datasets in `page.tsx`, pass both to `SalesTrendChart` as props.
**Warning signs:** Chart shows the same data regardless of period selection.

### Pitfall 7: `stores` Table Type Mismatch After Migration
**What goes wrong:** Settings page Server Action fails because `database.ts` types don't include new columns.
**Why it happens:** Generated types are a snapshot — they don't auto-update after migrations.
**How to avoid:** After running migration 028, run `npx supabase gen types typescript --local > src/types/database.ts`. Until types are regenerated, cast the Supabase client as `as unknown as SupabaseClient` or use `// @ts-ignore` temporarily (flag in code comment for cleanup).
**Warning signs:** TypeScript error: "Object literal may only specify known properties, and 'business_address' does not exist in type."

---

## Code Examples

### Migration 028 — Customer is_active + Store Settings Columns

```sql
-- supabase/migrations/028_customer_disable_settings.sql
-- Add is_active to customers table (required for CUST-04 disable flow)
ALTER TABLE public.customers
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Expand stores table for business details and receipt customization (SETTINGS-01/02/03)
ALTER TABLE public.stores
  ADD COLUMN business_address TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN ird_gst_number TEXT,
  ADD COLUMN receipt_header TEXT,
  ADD COLUMN receipt_footer TEXT;
```

**Note:** No RLS policy changes needed. Existing `staff_read_customers` policy covers SELECT on the new column. The `is_active` check for customer login prevention is enforced by Supabase Auth ban — RLS does not block login.

### SalesTrendChart Data Query

```typescript
// In dashboard/page.tsx — fetch data for both periods server-side
async function getSalesTrendData(storeId: string, days: 7 | 30, supabase: SupabaseClient) {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('orders')
    .select('created_at, total_cents')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true })

  // Group by date string (YYYY-MM-DD)
  const grouped: Record<string, number> = {}
  for (const order of data ?? []) {
    const date = order.created_at.slice(0, 10)
    grouped[date] = (grouped[date] ?? 0) + order.total_cents
  }

  // Fill missing days with 0
  const result = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key.slice(5), totalCents: grouped[key] ?? 0 })
  }
  return result
}
```

### Comparison Delta Calculation

```typescript
// ComparisonStatCard props
interface ComparisonStatCardProps {
  label: string
  value: string         // formatted NZD
  subLabel: string      // "vs. yesterday"
  delta: number | null  // percentage, null if no previous data
}

// Delta calculation
const delta = previousCents === 0
  ? null
  : Math.round(((currentCents - previousCents) / previousCents) * 100)
```

### AdminSidebar — Customers Link Missing

The current `BASE_NAV_LINKS` array in `AdminSidebar.tsx` does NOT include a Customers link (confirmed in source). It must be added:

```typescript
// In src/components/admin/AdminSidebar.tsx BASE_NAV_LINKS
{ href: '/admin/customers', label: 'Customers' },
// Insert between 'Orders' and 'Reports' based on logical flow
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Auth `signOut` to disable user | `admin.auth.admin.updateUserById(id, { ban_duration })` | Supabase JS v2 | Non-destructive disable without deleting account |
| Recharts v2 Bar only | Recharts v3 Area + LinearGradient + CartesianGrid | recharts 3.x | AreaChart API is stable in v3.8.1 |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Project uses `@supabase/ssr` — do NOT use auth-helpers.
- `PromoForm` hardcoded action: Phase 25 requires a variant with configurable action — acknowledge this in implementation.

---

## Open Questions

1. **Order count via embed vs aggregation query**
   - What we know: Supabase supports `.select('*, orders(count)')` which triggers a subquery. This works for moderate volumes.
   - What's unclear: Whether the Postgres generated type for `orders(count)` returns `[{ count: number }]` or a numeric scalar — may require type assertion.
   - Recommendation: Use `.select('id, name, email, is_active, created_at, auth_user_id')` and fetch order counts in a second aggregation query grouped by `customer_id`. Cleaner types, same SQL cost.

2. **Period toggle approach: dual fetch vs client fetch**
   - What we know: Fetching both 7-day and 30-day datasets server-side adds ~2 extra DB queries but keeps the page fully server-rendered for the default state.
   - What's unclear: Volume of orders data — at high volume, passing both datasets as props may be significant payload.
   - Recommendation: Fetch both server-side (simple, matches established pattern). Dashboard is not a high-traffic page. Revisit if data payload becomes large.

3. **Types regeneration after migration**
   - What we know: After migration 028, `src/types/database.ts` will be stale for `customers.is_active` and new `stores` columns.
   - What's unclear: Whether the planner should include a `npx supabase gen types` step as an explicit task.
   - Recommendation: YES — include type regeneration as a Wave 0 task immediately after migration runs.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — phase is purely code/config changes within existing Next.js + Supabase stack).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CUST-01 | `getCustomers` returns paginated list with order count, owner-only | unit | `npx vitest run src/actions/customers/__tests__/getCustomers.test.ts -x` | ❌ Wave 0 |
| CUST-02 | Search filter narrows customer list by name/email | unit (pure filter fn) | `npx vitest run src/actions/customers/__tests__/getCustomers.test.ts -x` | ❌ Wave 0 |
| CUST-03 | `getCustomerDetail` returns profile + paginated orders | unit | `npx vitest run src/actions/customers/__tests__/getCustomerDetail.test.ts -x` | ❌ Wave 0 |
| CUST-04 | `disableCustomer` sets is_active=false AND calls auth ban; `enableCustomer` reverses both | unit | `npx vitest run src/actions/customers/__tests__/disableCustomer.test.ts -x` | ❌ Wave 0 |
| PROMO-01 | `updatePromoCode` validates input with Zod, updates correct store's promo | unit | `npx vitest run src/actions/promos/__tests__/updatePromoCode.test.ts -x` | ❌ Wave 0 |
| PROMO-02 | `deletePromoCode` sets is_active=false, rejects if already deleted | unit | `npx vitest run src/actions/promos/__tests__/deletePromoCode.test.ts -x` | ❌ Wave 0 |
| SETTINGS-01 | `updateBusinessDetails` validates + updates stores.business_address + phone | unit | `npx vitest run src/actions/settings/__tests__/updateSettings.test.ts -x` | ❌ Wave 0 |
| SETTINGS-02 | `updateReceiptSettings` validates + updates stores.receipt_header + footer | unit | `npx vitest run src/actions/settings/__tests__/updateSettings.test.ts -x` | ❌ Wave 0 |
| SETTINGS-03 | `updateBusinessDetails` validates + updates stores.ird_gst_number | unit | `npx vitest run src/actions/settings/__tests__/updateSettings.test.ts -x` | ❌ Wave 0 |
| DASH-01 | `getSalesTrendData` returns N data points, fills zero for days with no orders | unit | `npx vitest run src/lib/__tests__/dashboardQueries.test.ts -x` | ❌ Wave 0 |
| DASH-02 | Delta calculation: `(current - previous) / previous * 100`, handles zero previous | unit | `npx vitest run src/lib/__tests__/dashboardQueries.test.ts -x` | ❌ Wave 0 |
| DASH-03 | `getRecentOrders` returns max 5 orders, ordered by created_at desc | unit | `npx vitest run src/lib/__tests__/dashboardQueries.test.ts -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/customers/__tests__/getCustomers.test.ts` — covers CUST-01, CUST-02
- [ ] `src/actions/customers/__tests__/getCustomerDetail.test.ts` — covers CUST-03
- [ ] `src/actions/customers/__tests__/disableCustomer.test.ts` — covers CUST-04 (mock `admin.auth.admin.updateUserById`)
- [ ] `src/actions/promos/__tests__/updatePromoCode.test.ts` — covers PROMO-01
- [ ] `src/actions/promos/__tests__/deletePromoCode.test.ts` — covers PROMO-02
- [ ] `src/actions/settings/__tests__/updateSettings.test.ts` — covers SETTINGS-01/02/03
- [ ] `src/lib/__tests__/dashboardQueries.test.ts` — covers DASH-01/02/03

Mock pattern to follow: `src/actions/staff/__tests__/staff-actions.test.ts` — uses `vi.hoisted()` for mock setup, `vi.mock('server-only', () => ({}))`, mocks Supabase clients and `next/cache`.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/actions/staff/getStaffList.ts` — Server Action owner-only pattern
- Codebase: `src/actions/staff/deactivateStaff.ts` — Two-step deactivation with optimistic lock
- Codebase: `src/components/admin/reports/SalesBarChart.tsx` — Recharts v3 styling reference
- Codebase: `src/components/admin/staff/StaffPageClient.tsx` — Modal state machine pattern
- Codebase: `src/components/admin/dashboard/DashboardHeroCard.tsx` — Stat card base for extension
- Codebase: `src/types/database.ts` lines 140-180 — Confirms `customers` table has NO `is_active` column
- Codebase: `src/types/database.ts` lines 414-466 — Confirms `promo_codes.is_active` already exists
- Codebase: `src/actions/auth/provisionStore.ts:78` — `admin.auth.admin.updateUserById` usage pattern
- Codebase: `src/components/admin/AdminSidebar.tsx` — Confirms "Customers" link is MISSING from `BASE_NAV_LINKS`
- Phase artifacts: `25-CONTEXT.md` — Locked decisions D-01 through D-13
- Phase artifacts: `25-UI-SPEC.md` — Complete interaction contracts and visual specifications

### Secondary (MEDIUM confidence)
- Supabase `ban_duration` API: `'876600h'` for effective permanent ban, `'none'` to unban — consistent with supabase-js v2 admin API patterns (cross-verified with codebase usage of `admin.auth.admin`)

### Tertiary (LOW confidence)
- Supabase `.select('*, orders(count)')` embed syntax for order count aggregation — requires runtime verification; fallback is separate GROUP BY query

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, verified in package.json patterns
- Architecture: HIGH — all patterns directly derived from existing Phase 24 codebase
- Pitfalls: HIGH — customer disable two-step requirement verified from auth and DB source analysis; migration gap verified from types file
- Test infrastructure: HIGH — vitest.config.mts confirmed, mock pattern confirmed from staff tests

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable stack — Recharts, Supabase, Next.js versions unchanged)
