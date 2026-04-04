# Architecture Research

**Domain:** Admin platform features — staff RBAC, Stripe analytics, merchant impersonation, customer management
**Researched:** 2026-04-05
**Confidence:** HIGH (direct codebase analysis + verified patterns from official docs)

---

## Existing Architecture Summary

Before documenting new integration points, this is what already exists and must not be changed.

### Auth Layer (Dual-path, already working)

```
Owner login  → Supabase Auth → app_metadata.role='owner', store_id, is_super_admin
Staff login  → staffPin.ts   → jose JWT in staff_session cookie (role, store_id, staff_id)
Super admin  → Supabase Auth → app_metadata.is_super_admin=true (no store_id)
Customer     → Supabase Auth → app_metadata.role='customer'
```

`resolveAuth()` tries Supabase owner session first, falls back to staff JWT cookie.
`resolveStaffAuth()` reads staff JWT only — used in POS actions.
Both return `{ store_id, staff_id, role? }` or null.

### Feature Gating (JWT fast-path + DB fallback)

`requireFeature(feature, { requireDbCheck })` in `src/lib/requireFeature.ts`:
- Default: reads `user.app_metadata[feature]` from JWT (no DB roundtrip)
- `requireDbCheck: true`: queries `store_plans` table via admin client (used on mutations)

### Tenant Resolution (Middleware)

Middleware resolves `store_id` from subdomain slug, injects `x-store-id` header.
Server Components and Server Actions read it via `resolveAuth()` or directly from `headers()`.

### Super Admin Pattern (Established)

- Route protection: `super-admin/layout.tsx` checks `user.app_metadata.is_super_admin === true`
- Actions: `createSupabaseAdminClient()` (service_role) for all super-admin mutations
- Audit trail: `super_admin_actions` table — every mutation inserts an audit row
- Tenant cache invalidation: `invalidateCachedStoreId(slug)` after store state changes

### Existing `staff` Table Schema

```sql
staff (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  auth_user_id UUID REFERENCES auth.users(id),  -- only owners
  name TEXT NOT NULL,
  pin_hash TEXT,           -- bcrypt, 4-digit PIN
  role TEXT CHECK (role IN ('owner', 'staff')),  -- CURRENT: only 2 values
  is_active BOOLEAN DEFAULT true,
  pin_attempts INTEGER DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at, updated_at
)
```

Role values in JWT claims: `'owner'` | `'staff'`. No `'manager'` yet.

### Existing `stores` Table (Relevant Columns)

Columns confirmed present across migrations 001–026:
```
slug, name, logo_url, primary_color, store_description
address, phone, gst_number   -- migration 010
opening_hours                -- migration 011
stripe_customer_id           -- migration 014
is_active, suspended_at, suspension_reason  -- migration 014/020
setup_wizard_dismissed       -- migration 018
```

Missing for v4.0: `receipt_header`, `receipt_footer`. The `gst_number` column serves as the IRD number field — no separate column needed.

---

## New Integration Points

### 1. Staff Role-Based Permissions (RBAC)

**Current state:** `staff.role` accepts `'owner'` | `'staff'`. Middleware only allows `role='owner'` into `/admin`. Staff use POS only via PIN JWT. No admin UI exists for managing staff.

**New requirement:** Three-tier roles (`Owner / Manager / Staff`). Manager can view admin read-only areas (orders, reports). Owner retains all write access. Admin UI for creating, editing, deactivating, and resetting PINs for staff members.

**Schema change (new migration):**
```sql
-- Drop existing CHECK constraint and add 'manager'
ALTER TABLE public.staff DROP CONSTRAINT staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));
```

CHECK constraint (not ENUM) — follows established `product_type` pattern, allows easy future extension.

**JWT claims:** Staff PIN JWT already embeds `role` in payload. `resolveStaffAuth()` already returns `role`. No JWT structure changes needed — new enum value flows through automatically once the DB constraint allows it.

**New `requireRole()` utility** (new file, does not replace `resolveAuth()`):
```typescript
// src/lib/requireRole.ts
import 'server-only'
import { resolveAuth } from './resolveAuth'

type AllowedRole = 'owner' | 'manager' | 'staff'
const HIERARCHY: Record<AllowedRole, number> = { owner: 3, manager: 2, staff: 1 }

export async function requireRole(minimumRole: AllowedRole) {
  const auth = await resolveAuth()
  if (!auth) return null
  const userLevel = HIERARCHY[(auth as { role?: AllowedRole }).role ?? 'staff'] ?? 0
  return userLevel >= HIERARCHY[minimumRole] ? auth : null
}
```

**Admin route access for managers:** Middleware currently blocks non-owner from `/admin` (line 158: `if (role !== 'owner') redirect`). The manager role comes via staff PIN JWT, not Supabase Auth, so `role` is extracted from a different path than owner. Two options:

- Option A: Keep middleware unchanged. Managers only use POS. Admin read-only is an owner-only concern. (Simpler — defers manager complexity entirely.)
- Option B: Extend middleware to detect valid staff JWT with `role='manager'` on admin routes, inject `x-staff-role: manager` header. Admin Server Components gate write-only UI behind `x-staff-role !== 'manager'`.

**Recommendation:** Option A for Phase 1. The PROJECT.md v4.0 target lists "basic roles (Owner/Manager/Staff)" but the initial constraint is admin UI for staff management, not manager access to admin. Build the CRUD UI and schema first; middleware extension is a second task if product demands it.

**How Server Actions consume roles:**
```typescript
// Write-only actions (create product, update settings): unchanged
const auth = await resolveAuth()
if (!auth || auth.role !== 'owner') return { error: 'Unauthorized' }

// New staff management actions: owner only
const auth = await requireRole('owner')
if (!auth) return { error: 'Unauthorized' }
```

**UI permission rendering:** Pass `role` from server component as prop to client components. Client components gate edit buttons with `role === 'owner'` check. No separate permission lookup on client — server already verified.

**Schema update:** `src/schemas/staff.ts` `CreateStaffSchema` role field:
```typescript
role: z.enum(['owner', 'manager', 'staff'])
```

**New admin routes:**
```
src/app/admin/staff/page.tsx        ← Staff list
src/app/admin/staff/new/page.tsx    ← Create staff
src/app/admin/staff/[id]/page.tsx   ← Edit / deactivate / reset PIN
```

**New Server Actions:**
```
src/actions/staff/createStaff.ts       ← Zod validate, bcrypt PIN, insert
src/actions/staff/updateStaff.ts       ← Update name/role/is_active
src/actions/staff/resetStaffPin.ts     ← Owner resets a staff PIN
```

**Data flow:**
```
Admin staff page (Server Component)
  → supabase.from('staff').select().eq('store_id', storeId)
  → StaffListClient (Client Component)
    → StaffForm (modal/page, role-gated)
      → createStaff / updateStaff / resetStaffPin Server Actions
        → requireRole('owner')   [only owners manage staff]
        → Zod validate
        → supabase admin client: insert / update
        → revalidatePath('/admin/staff')
```

---

### 2. Admin Dashboard Improvements (Sales Trend Chart + Metrics)

**Current state:** `src/app/admin/dashboard/page.tsx` fetches today's orders inline, renders `DashboardHeroCard` + `LowStockAlertList`. No charts, no period comparison.

**New requirement:** 7/30-day sales trend chart, recent orders widget, current-vs-prior-period metric comparison.

**Library:** Recharts. Confirmed requirement: `'use client'` — Recharts uses browser-only APIs and cannot render in Server Components. Use `recharts@2.x` (React 19 compatible as of v2.13+). Do not use v3 (alpha).

**Pattern — server fetches, client renders (established in `admin/billing/page.tsx`):**

```typescript
// dashboard/page.tsx (Server Component) — add to existing page
const thirtyDaysAgo = subDays(new Date(), 30)
const { data: historicalOrders } = await supabase
  .from('orders')
  .select('created_at, total_cents')
  .eq('store_id', storeId)
  .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
  .gte('created_at', thirtyDaysAgo.toISOString())

// Group by day in TypeScript — pass serialized array to Client Component
const dailyTotals = groupByDay(historicalOrders ?? [])
return <SalesTrendChart data={dailyTotals} />
```

**New components:**
```
src/components/admin/dashboard/SalesTrendChart.tsx      ← 'use client', recharts AreaChart
src/components/admin/dashboard/RecentOrdersList.tsx     ← Server Component (no interactivity)
src/components/admin/dashboard/MetricsComparisonRow.tsx ← Server Component (pure display)
```

**No new routes** — all additions go into the existing `dashboard/page.tsx` and new component files.

---

### 3. Store Settings Expansion

**Current state:** `stores` table already has `address`, `phone`, `gst_number`, `opening_hours`. Admin settings page only shows branding (name, slug, logo, primary_color).

**New requirement:** Business address, phone, IRD number, receipt header/footer, store hours.

**Schema addition (new migration):**
```sql
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS receipt_header TEXT,
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
-- address, phone, gst_number, opening_hours already exist (migrations 010/011)
```

**No new routes** — expand existing `src/app/admin/settings/page.tsx` with additional form sections, following the `BrandingForm.tsx` pattern.

**New form components:**
```
src/components/admin/settings/BusinessInfoForm.tsx     ← address, phone, gst_number
src/components/admin/settings/ReceiptSettingsForm.tsx  ← receipt_header, receipt_footer
src/components/admin/settings/HoursForm.tsx            ← opening_hours
```

**New Server Action:** `src/actions/settings/updateBusinessInfo.ts` — follows `updateBranding.ts` pattern (Zod validate, `requireRole('owner')`, supabase update, revalidatePath).

---

### 4. Customer Management (Admin UI)

**Current state:** `customers` table exists (migration 012). RLS policy `staff_read_customers` allows `role IN ('owner', 'staff')` to read. `orders.customer_id` references `auth.users.id`. No admin UI exists.

**New requirement:** Customer list, search, order history per customer, basic account management.

**No schema changes needed.** RLS already allows owner to read customers.

**New admin routes:**
```
src/app/admin/customers/page.tsx       ← Paginated list with search
src/app/admin/customers/[id]/page.tsx  ← Customer detail: profile + order history
```

**Data fetching (follows `admin/orders/page.tsx` pattern):**
```typescript
// Customer list — standard Supabase client (RLS enforces store_id isolation)
const { data: customers } = await supabase
  .from('customers')
  .select('id, name, email, created_at, auth_user_id')
  .eq('store_id', storeId)
  .ilike('email', `%${q}%`)
  .order('created_at', { ascending: false })
  .range(offset, offset + PAGE_SIZE - 1)

// Customer orders — join via auth_user_id -> customer_id on orders
const { data: orders } = await supabase
  .from('orders')
  .select('id, total_cents, status, created_at, channel')
  .eq('store_id', storeId)
  .eq('customer_id', customer.auth_user_id)
  .order('created_at', { ascending: false })
```

**Important relationship:** `orders.customer_id` = `auth.users.id` = `customers.auth_user_id`. The join is `customers.auth_user_id = orders.customer_id`, not `customers.id`.

**No new Server Actions** for read-only view. Account deactivation (if required) uses `supabase.auth.admin.updateUserById` via service_role — wrap in a Server Action with `requireRole('owner')` guard.

**New components:**
```
src/components/admin/customers/CustomerTable.tsx        ← Paginated, searchable
src/components/admin/customers/CustomerDetailPanel.tsx  ← Order history + profile
```

---

### 5. Promo Management Edit/Delete

**Current state:** `PromoList.tsx` and `PromoForm.tsx` exist in `src/components/admin/`. Create flow exists. No edit or delete.

**No schema changes needed.** `promo_codes` table already exists.

**Additions only:**
- Extend `PromoList.tsx` with edit/delete buttons
- New Server Actions: `updatePromo.ts`, `deletePromo.ts` (follows existing `createPromo` pattern)

---

### 6. Super-Admin Dashboard (Platform Overview)

**Current state:** Super admin has tenant list and tenant detail. No aggregate platform metrics.

**New requirement:** Platform overview — total tenants, signups (30d), revenue breakdown.

**New route:** `src/app/super-admin/page.tsx` (or promote existing redirect to a real dashboard page).

**Data sources:** Supabase `stores` count (admin client) + Stripe subscriptions.

**New components:**
```
src/components/super-admin/PlatformMetricsGrid.tsx   ← Tenant/signup/MRR counts
```

---

### 7. Super-Admin Stripe Analytics (MRR, Churn, Revenue per Add-on)

**Current state:** No Stripe analytics in super-admin. The pattern for Stripe subscription queries exists in `src/app/admin/billing/page.tsx`.

**New requirement:** Platform-wide MRR, active subscriber count, revenue per add-on, payment failures.

**Stripe API does NOT have a pre-built MRR endpoint.** MRR is calculated by aggregating active subscription items. This is confirmed by official Stripe documentation — the analytics UI is not an API.

**Key Stripe calls:**

```typescript
// All active subscriptions — paginate if tenant count exceeds 100
const activeSubs = await stripe.subscriptions.list({
  status: 'active',
  limit: 100,
  expand: ['data.items.data.price'],
})

// Open/past-due invoices (payment failures)
const failedInvoices = await stripe.invoices.list({
  status: 'open',
  limit: 50,
})

// Recent new subscriptions for growth trend
const recentSubs = await stripe.subscriptions.list({
  created: { gte: Math.floor(subDays(new Date(), 30).getTime() / 1000) },
  limit: 100,
})
```

**MRR calculation (normalize all intervals to monthly):**
```typescript
const mrrCents = activeSubs.data.reduce((sum, sub) => {
  return sum + sub.items.data.reduce((itemSum, item) => {
    const amount = item.price.unit_amount ?? 0
    const interval = item.price.recurring?.interval ?? 'month'
    const count = item.price.recurring?.interval_count ?? 1
    const monthly = interval === 'year' ? amount / (12 * count) : amount / count
    return itemSum + monthly * (item.quantity ?? 1)
  }, 0)
}, 0)
```

**Revenue per add-on:** Group active subscription items by `price.id`, map to feature via `PRICE_TO_FEATURE` (already exists in `src/config/addons.ts`).

**Caching:** Stripe API calls are slow and super-admin analytics do not need real-time data. Use page-level revalidation:
```typescript
// src/app/super-admin/analytics/page.tsx
export const revalidate = 300 // 5-minute cache
```

This is compatible with `force-dynamic` already used on tenant pages — only the analytics page gets the cache.

**New routes:**
```
src/app/super-admin/analytics/page.tsx    ← Platform analytics dashboard
```

**New components:**
```
src/components/super-admin/PlatformMetricsGrid.tsx     ← MRR, subscriber count, failure count
src/components/super-admin/AddOnRevenueTable.tsx        ← Revenue breakdown per add-on
src/components/super-admin/PaymentFailuresList.tsx      ← Open/past-due invoices
src/components/super-admin/PlatformGrowthChart.tsx      ← 'use client' + recharts (signup trend)
```

---

### 8. Super-Admin Billing Visibility (View Tenant Invoices)

**Current state:** Tenant detail page shows add-on status from `store_plans`. No Stripe invoice history.

**New requirement:** Super-admin can view a tenant's subscription history and invoices.

**Integration approach:** `stores.stripe_customer_id` already exists. `admin/billing/page.tsx` already shows the exact query pattern.

**Addition to existing tenant detail page** (`/super-admin/tenants/[id]/page.tsx`):
```typescript
// Add to parallel Promise.all in tenant detail page
stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all' }),
stripe.invoices.list({ customer: stripeCustomerId, limit: 10 }),
```

**No new routes.** New component only:
```
src/components/super-admin/TenantBillingPanel.tsx  ← Invoice list + subscription history
```

---

### 9. Super-Admin User Management + Impersonation

**Current state:** Tenant detail shows store info, can suspend/unsuspend and override add-ons. No user account management.

**New requirement:** View merchant accounts, password resets, disable accounts, impersonation.

**Password reset:** `supabase.auth.admin.generateLink({ type: 'recovery', email })` (service_role). New Server Action follows `suspendTenant.ts` pattern with `is_super_admin` guard + audit row.

**Disable account:** `supabase.auth.admin.updateUserById(userId, { ban_duration: '876600h' })` (service_role). Effectively permanent. Combines with `stores.is_active = false` (suspension already does this via `suspendTenant` action).

**Impersonation approach:**

Direct session impersonation (magic-link sign-in as merchant) creates session complexity and risks the super-admin losing their own session. The simpler and more auditable approach for this codebase is a **short-lived impersonation JWT that injects merchant store context**:

1. Super-admin clicks "Impersonate" on tenant detail page
2. `startImpersonation` Server Action: verifies `is_super_admin`, creates a 15-minute jose JWT containing `{ store_id, super_admin_id }`, sets it in an httpOnly cookie `sa_impersonation`
3. Inserts `super_admin_actions` audit row: action='impersonate_start'
4. Redirects to `/admin/dashboard` on the root domain (not the merchant's subdomain)
5. New middleware branch detects `sa_impersonation` cookie on root-domain `/admin` routes: verifies the JWT, injects `x-store-id` = merchant's store ID and `x-impersonating: 'true'` header
6. Admin Server Components render merchant data (they already read `x-store-id` from headers via `resolveAuth()`)
7. `ImpersonationBanner` component reads `x-impersonating` header from a layout and renders a dismissal bar
8. `endImpersonation` Server Action clears the cookie and inserts audit row: action='impersonate_end'

**New utility file:**
```typescript
// src/lib/impersonation.ts  (NEW)
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.SUPER_ADMIN_JWT_SECRET!)

export async function createImpersonationToken(storeId: string, superAdminId: string) {
  return new SignJWT({ store_id: storeId, super_admin_id: superAdminId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret)
}

export async function verifyImpersonationToken(token: string) {
  const { payload } = await jwtVerify(token, secret)
  return payload as { store_id: string; super_admin_id: string }
}
```

**Middleware addition** (new branch before existing `/admin` route check):
```typescript
// In middleware.ts, before the "Admin routes" block:
const impersonationToken = request.cookies.get('sa_impersonation')?.value
if (isRoot && pathname.startsWith('/admin') && impersonationToken) {
  const supabase = createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.is_super_admin === true) {
    try {
      const { store_id } = await verifyImpersonationToken(impersonationToken)
      // Inject merchant store context into request headers
      requestHeaders.set('x-store-id', store_id)
      requestHeaders.set('x-impersonating', 'true')
      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch {
      // Token expired — fall through to normal admin auth check
    }
  }
}
```

**New env var required:** `SUPER_ADMIN_JWT_SECRET` (separate from `STAFF_JWT_SECRET` for independent rotation).

**New Server Actions:**
```
src/actions/super-admin/startImpersonation.ts       ← Create token, set cookie, audit
src/actions/super-admin/endImpersonation.ts         ← Clear cookie, audit
src/actions/super-admin/sendPasswordReset.ts        ← auth.admin.generateLink recovery
src/actions/super-admin/disableMerchantAccount.ts   ← auth.admin.updateUserById ban
```

**New component:**
```
src/components/super-admin/ImpersonationBanner.tsx  ← 'use client', "Impersonating X / Exit"
```

---

## Component Boundaries Summary

| Component | Type | Receives From | Calls |
|-----------|------|---------------|-------|
| `SalesTrendChart` | Client | Dashboard Server Component (serialized daily sales array) | Nothing (pure render) |
| `MetricsComparisonRow` | Server | Dashboard page (computed period comparison) | Nothing |
| `StaffListClient` | Client | Staff page Server Component (staff rows, owner role) | `updateStaff`, `resetStaffPin` Server Actions |
| `CustomerTable` | Client | Customers Server Component (customer rows) | Navigation only |
| `PlatformMetricsGrid` | Server | Analytics page (MRR, counts computed server-side) | Nothing |
| `PlatformGrowthChart` | Client | Analytics page (time series serialized) | Nothing |
| `AddOnRevenueTable` | Server | Analytics page (per-add-on revenue map) | Nothing |
| `TenantBillingPanel` | Server | Tenant detail page (Stripe sub + invoice data) | Nothing |
| `ImpersonationBanner` | Client | Admin layout (reads `x-impersonating` header via cookie/prop) | `endImpersonation` Server Action |

---

## Data Flow Diagrams

### Staff RBAC Flow

```
POST /admin/staff/new
  → createStaff Server Action
    → requireRole('owner')   [only owners manage staff]
    → Zod: CreateStaffSchema.safeParse (name, pin, role IN ['manager','staff'])
    → bcrypt.hash(pin, 12)
    → supabase.from('staff').insert({ store_id, name, pin_hash, role })
    → revalidatePath('/admin/staff')
    → { success: true }
```

### Stripe Analytics Flow

```
GET /super-admin/analytics  (revalidate: 300s)
  → Auth check via super-admin layout (already done)
  → Server Component:
    → stripe.subscriptions.list({ status: 'active', expand: ['data.items.data.price'] })
    → stripe.invoices.list({ status: 'open', limit: 50 })
    → Calculate MRR, revenue per add-on, failure count
    → supabase admin: SELECT COUNT(*) FROM stores WHERE created_at >= 30daysAgo
    → Render PlatformMetricsGrid (Server Component, computed values)
    → Render PlatformGrowthChart (Client Component, serialized time series)
```

### Impersonation Flow

```
Super Admin → "Impersonate" button on /super-admin/tenants/[id]
  → startImpersonation Server Action
    → verify user.app_metadata.is_super_admin === true
    → createImpersonationToken(storeId, superAdminId)
    → Set httpOnly cookie 'sa_impersonation' (15min, Secure, SameSite=Lax)
    → Insert super_admin_actions { action: 'impersonate_start', store_id, note }
    → Return { success: true }  → Client redirects to /admin/dashboard

Root domain GET /admin/dashboard
  → Middleware detects 'sa_impersonation' cookie
    → Verifies super admin session (Supabase Auth)
    → verifyImpersonationToken(cookie)
    → Injects x-store-id: merchantStoreId, x-impersonating: 'true'
    → NextResponse.next() with modified headers

Admin dashboard renders
  → resolveAuth() reads x-store-id → returns merchant's store_id
  → All queries use merchant's store_id (RLS via JWT, but admin actions use admin client)
  → ImpersonationBanner receives x-impersonating prop from layout, renders exit button
```

### Customer Management Flow

```
GET /admin/customers
  → Server Component
    → resolveAuth() → storeId
    → supabase.from('customers').select().eq('store_id', storeId).ilike('email', ...)
    → CustomerTable (Client Component) — search/pagination
      → URL search params drive re-fetches (Server Component re-runs on navigation)

GET /admin/customers/[id]
  → Server Component
    → Fetch customer by id + store_id
    → Fetch customer.auth_user_id
    → supabase.from('orders').eq('customer_id', auth_user_id)
    → CustomerDetailPanel (Server Component — no interactivity needed)
```

---

## Recommended Build Order

Dependencies drive the ordering. Each item below is unblocked by items above it.

**1. Store Settings Expansion** (no dependencies, simple schema add + form extension)
- Migration: `receipt_header`, `receipt_footer` columns
- Expand settings page with BusinessInfoForm, ReceiptSettingsForm, HoursForm
- New `updateBusinessInfo` Server Action

**2. Promo Management Edit/Delete** (no dependencies, extends existing list)
- `updatePromo.ts` + `deletePromo.ts` Server Actions
- Extend `PromoList.tsx` with edit/delete buttons

**3. Staff Management CRUD** (depends on schema migration for `'manager'` role)
- Migration: update role CHECK constraint to allow `'manager'`
- New `requireRole()` utility
- Staff admin pages + Server Actions
- Update `schemas/staff.ts`

**4. Admin Dashboard Charts** (depends on recharts install, no schema changes)
- `npm install recharts`
- Add historical sales query to dashboard page
- `SalesTrendChart`, `RecentOrdersList`, `MetricsComparisonRow` components

**5. Customer Management** (no schema changes, RLS already covers it)
- New `/admin/customers` routes and components

**6. Super-Admin Platform Dashboard** (depends on understanding existing admin patterns)
- Simple tenant count + signup count from Supabase
- `PlatformMetricsGrid` component

**7. Super-Admin Stripe Analytics** (depends on Stripe patterns, no schema changes)
- New `/super-admin/analytics` page with Stripe API calls
- `AddOnRevenueTable`, `PaymentFailuresList`, `PlatformGrowthChart` components

**8. Super-Admin Billing Visibility** (depends on 7 for Stripe familiarity)
- Additions to existing tenant detail page
- `TenantBillingPanel` component

**9. Super-Admin User Management + Impersonation** (most complex, build last)
- New env var `SUPER_ADMIN_JWT_SECRET`
- `src/lib/impersonation.ts` utility
- Middleware extension (impersonation cookie branch)
- New super-admin actions: sendPasswordReset, disableMerchantAccount, startImpersonation, endImpersonation
- `ImpersonationBanner` component
- Super-admin sidebar additions (Analytics, Billing links)

---

## Full New Files List

### New Source Files

| File | Type | Purpose |
|------|------|---------|
| `src/lib/requireRole.ts` | Utility | Role hierarchy guard (owner > manager > staff) |
| `src/lib/impersonation.ts` | Utility | Impersonation JWT creation/verification |
| `src/app/admin/staff/page.tsx` | Server Component | Staff list |
| `src/app/admin/staff/new/page.tsx` | Server Component | Create staff form |
| `src/app/admin/staff/[id]/page.tsx` | Server Component | Edit/deactivate staff |
| `src/app/admin/customers/page.tsx` | Server Component | Customer list |
| `src/app/admin/customers/[id]/page.tsx` | Server Component | Customer detail + order history |
| `src/app/super-admin/analytics/page.tsx` | Server Component | Platform Stripe analytics |
| `src/app/super-admin/billing/page.tsx` | Server Component | Platform billing overview |
| `src/actions/staff/createStaff.ts` | Server Action | Create staff member with PIN |
| `src/actions/staff/updateStaff.ts` | Server Action | Update name/role/is_active |
| `src/actions/staff/resetStaffPin.ts` | Server Action | Owner resets a staff PIN |
| `src/actions/settings/updateBusinessInfo.ts` | Server Action | Update address/phone/IRD/receipt |
| `src/actions/promos/updatePromo.ts` | Server Action | Edit existing promo |
| `src/actions/promos/deletePromo.ts` | Server Action | Delete promo code |
| `src/actions/super-admin/startImpersonation.ts` | Server Action | Begin merchant impersonation |
| `src/actions/super-admin/endImpersonation.ts` | Server Action | Clear impersonation cookie |
| `src/actions/super-admin/sendPasswordReset.ts` | Server Action | Email merchant recovery link |
| `src/actions/super-admin/disableMerchantAccount.ts` | Server Action | Ban merchant auth account |
| `src/components/admin/dashboard/SalesTrendChart.tsx` | Client Component | Recharts area chart |
| `src/components/admin/dashboard/RecentOrdersList.tsx` | Server Component | Latest orders widget |
| `src/components/admin/dashboard/MetricsComparisonRow.tsx` | Server Component | Period comparison |
| `src/components/admin/settings/BusinessInfoForm.tsx` | Client Component | Address/phone/IRD form |
| `src/components/admin/settings/ReceiptSettingsForm.tsx` | Client Component | Receipt header/footer |
| `src/components/admin/settings/HoursForm.tsx` | Client Component | Opening hours |
| `src/components/admin/customers/CustomerTable.tsx` | Client Component | Paginated customer list |
| `src/components/admin/customers/CustomerDetailPanel.tsx` | Server Component | Order history + profile |
| `src/components/super-admin/PlatformMetricsGrid.tsx` | Server Component | MRR/subscriber metrics |
| `src/components/super-admin/AddOnRevenueTable.tsx` | Server Component | Revenue breakdown |
| `src/components/super-admin/PaymentFailuresList.tsx` | Server Component | Failed invoice list |
| `src/components/super-admin/PlatformGrowthChart.tsx` | Client Component | Recharts signup trend |
| `src/components/super-admin/TenantBillingPanel.tsx` | Server Component | Tenant Stripe history |
| `src/components/super-admin/ImpersonationBanner.tsx` | Client Component | "Impersonating X / Exit" bar |

### Modified Files

| File | Change |
|------|--------|
| `src/middleware.ts` | Add impersonation cookie branch before admin route check |
| `src/schemas/staff.ts` | Add `'manager'` to role enum in `CreateStaffSchema` |
| `src/app/admin/settings/page.tsx` | Add business info + receipt settings form sections |
| `src/app/admin/dashboard/page.tsx` | Add 30-day historical orders query + chart component |
| `src/app/super-admin/tenants/[id]/page.tsx` | Add Stripe billing data fetch + TenantBillingPanel |
| `src/components/super-admin/SuperAdminSidebar.tsx` | Add Analytics + Billing nav links |
| `src/components/admin/AdminSidebar.tsx` | Add Staff + Customers nav links |
| `src/components/admin/PromoList.tsx` | Add edit/delete buttons + actions |

### New Migration

| File | Contents |
|------|----------|
| `supabase/migrations/027_v4_admin_platform.sql` | `manager` role in staff CHECK constraint; `receipt_header`, `receipt_footer` columns on stores |

---

## Architectural Patterns to Follow

### Pattern: Server Component → Client Component Data Bridge

**What:** Server Component fetches and serializes data, passes to Client Component as plain props.
**When:** All charts, tables with interactive state (search/pagination), forms.
**Established in codebase:** `admin/billing/page.tsx` → `BillingClient.tsx`

### Pattern: Super-Admin Action Guard

**What:** Every super-admin Server Action checks `is_super_admin === true` before executing.
**Established in codebase:** `suspendTenant.ts`, `activateAddon.ts`

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user || user.app_metadata?.is_super_admin !== true) {
  return { error: 'Unauthorized' }
}
```

### Pattern: Audit Every Super-Admin Mutation

**What:** All super-admin mutations insert into `super_admin_actions` table.
**When:** Any state change (suspend, override, impersonate, disable, password reset).
**Established in codebase:** `suspendTenant.ts` step 6

### Pattern: Admin Client for Super-Admin Data Access

**What:** Super-admin pages use `createSupabaseAdminClient()` (service_role), bypassing RLS.
**Why:** Super-admin has no `store_id` in JWT — RLS would block all tenant data reads.
**Established in codebase:** All super-admin pages and actions.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Supabase Realtime for UI Sync

**What people do:** Subscribe to real-time changes for live dashboard updates.
**Why wrong:** Established project decision — refresh-on-transaction, not WebSocket.
**Do this instead:** `revalidatePath('/admin/...')` in Server Actions + `export const dynamic = 'force-dynamic'` on pages.

### Anti-Pattern: MRR from a Single Stripe API Endpoint

**What people do:** Look for `stripe.billing.mrr` or similar endpoint.
**Why wrong:** No such endpoint. Stripe analytics dashboard is UI-only, not an API.
**Do this instead:** Calculate MRR by aggregating `stripe.subscriptions.list()` items (pattern documented above).

### Anti-Pattern: Client-Side Stripe API Calls

**What people do:** Call Stripe from a Client Component.
**Why wrong:** Secret key exposure. Stripe secret key must remain server-only.
**Do this instead:** All Stripe calls in Server Components or Server Actions. Enforced by `server-only` import in `src/lib/stripe.ts`.

### Anti-Pattern: Magic-Link Session Swap for Impersonation

**What people do:** Use `auth.admin.generateLink()` + `verifyOtp()` to log in as the merchant, replacing the super-admin's session.
**Why wrong:** Super-admin loses their session. Session management becomes complex. Rolling back requires another magic link.
**Do this instead:** Short-lived impersonation JWT that injects `store_id` context into request headers — super-admin session remains untouched.

### Anti-Pattern: Role Checks Only in Middleware

**What people do:** Trust middleware role check, skip guard in Server Actions.
**Why wrong:** Server Actions can be called directly without going through middleware. Every Server Action must independently verify authentication and authorization.
**Do this instead:** `requireRole('owner')` (or equivalent) as first step in every write Server Action.

---

## Integration Points: External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe (platform analytics) | `stripe.subscriptions.list()` + `stripe.invoices.list()` in Server Components | Cache with `revalidate: 300`. Paginate if tenants > 100 (use `autoPagingEach`). Existing `stripe` singleton in `src/lib/stripe.ts`. |
| Stripe (tenant billing) | `stripe.subscriptions.list({ customer })` + `stripe.invoices.list({ customer })` | Same pattern as `admin/billing/page.tsx`. No new Stripe setup. |
| Supabase Auth Admin API | `auth.admin.generateLink()`, `auth.admin.updateUserById()` | Service role only. Available via `createSupabaseAdminClient()` — already exists. |
| jose (impersonation JWT) | `SignJWT` / `jwtVerify` | New env var `SUPER_ADMIN_JWT_SECRET`. Same library already used for staff PINs. |

---

## Scaling Considerations

| Concern | Now (0-50 tenants) | At 500+ tenants |
|---------|---------------------|-----------------|
| Stripe analytics | `subscriptions.list(limit: 100)` is fine | Must use `autoPagingEach` for >100 active subscriptions |
| Customer list | Simple Supabase query | Add composite index `(store_id, email)` if search is slow |
| Staff RBAC check | `resolveAuth()` + string compare — fast | No change needed |
| Impersonation | Short-lived jose JWT — stateless, no DB | No change needed |

---

## Sources

- Existing codebase: `src/lib/resolveAuth.ts`, `src/lib/requireFeature.ts`, `src/middleware.ts`, `src/actions/super-admin/suspendTenant.ts`, `src/app/admin/billing/page.tsx`, `supabase/migrations/001–026` — HIGH confidence (direct read)
- Stripe subscriptions list API: [docs.stripe.com/api/subscriptions/list](https://docs.stripe.com/api/subscriptions/list) — HIGH confidence
- Stripe MRR calculation: [support.stripe.com/questions/calculating-monthly-recurring-revenue-mrr-in-billing](https://support.stripe.com/questions/calculating-monthly-recurring-revenue-mrr-in-billing) — HIGH confidence (official Stripe)
- Recharts + Next.js App Router (client component requirement): [app-generator.dev/docs/technologies/nextjs/integrate-recharts.html](https://app-generator.dev/docs/technologies/nextjs/integrate-recharts.html) — MEDIUM confidence (verified against React 19 compatibility notes)
- Supabase impersonation patterns: [catjam.fi/articles/supabase-admin-impersonation](https://catjam.fi/articles/supabase-admin-impersonation) and [github.com/orgs/supabase/discussions/31244](https://github.com/orgs/supabase/discussions/31244) — MEDIUM confidence
- Supabase RBAC + custom claims: [supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence

---
*Architecture research for: NZPOS v4.0 Admin Platform milestone*
*Researched: 2026-04-05*
