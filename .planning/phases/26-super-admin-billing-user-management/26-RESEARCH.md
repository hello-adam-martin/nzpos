# Phase 26: Super-Admin Billing + User Management - Research

**Researched:** 2026-04-05
**Domain:** Stripe API (live billing reads), Supabase Auth Admin API (user management), Recharts (dashboard chart), Next.js App Router (server component data fetching)
**Confidence:** HIGH

## Summary

Phase 26 extends the existing super-admin panel with three surface areas: a new platform dashboard (stat cards + signup trend chart), Stripe billing visibility on the tenant detail page (subscriptions, invoices, payment failure alerts), and two user management actions (password reset, account disable). All three areas build on established patterns already in the codebase — the pattern risk is low, the primary complexity is in the Stripe API call structure and the Supabase Admin Auth API for user management.

The Stripe `stripe_customer_id` is already stored on the `stores` table and a working Stripe client singleton exists at `src/lib/stripe.ts`. The billing page at `/admin/billing/page.tsx` already demonstrates the exact pattern for fetching subscriptions (`stripe.subscriptions.list`) and prices from Stripe using this customer ID — the super-admin tenant detail page repeats this pattern for a different customer ID.

The Supabase Admin Auth API (`admin.auth.admin.getUserById()`, `admin.auth.admin.resetPasswordForEmail()`, `admin.auth.admin.updateUserById()`) is accessible via the existing `createSupabaseAdminClient()` service role client. Owner auth ID is available on `stores.owner_auth_id`. No new DB columns or migrations are required for Phase 26.

**Primary recommendation:** Follow the existing `/admin/billing` Stripe fetch pattern for billing sections; follow the existing `suspendTenant` action pattern for new user management actions; reuse `DashboardHeroCard` and `SalesTrendChart` components directly for the dashboard page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dashboard lives at `/super-admin` as the landing page. New route, new page component.
- **D-02:** Stat cards for: total active tenants, suspended tenants, new signups this month, and per-add-on adoption rates (percentage of tenants with each add-on). Uses stat card pattern consistent with admin DashboardHeroCard.
- **D-03:** 30-day signup trend displayed as a line chart with area fill using Recharts (already installed). Matches Phase 25 admin sales trend chart style.
- **D-04:** Add-on adoption rates shown as percentage badges in individual stat cards — one per add-on (Xero, Email Notifications, Custom Domain, Inventory). Compact and scannable.
- **D-05:** Stripe billing data fetched via live Stripe API calls on tenant detail page load. No local mirroring or webhook sync — Phase 27 adds materialised data later.
- **D-06:** Subscriptions and Invoices displayed as new sections below existing addon/audit content on the tenant detail page. Single scrollable page stays consistent with existing pattern.
- **D-07:** Payment failure alert shown as a warning banner at the top of the tenant detail page when past-due invoices exist. Immediately visible on page load. Yellow/red styling.
- **D-08:** Password reset: "Send Password Reset" button on tenant detail page triggers Supabase Admin API `resetPasswordForEmail()`. Confirmation modal before sending. No temp password — standard email reset flow.
- **D-09:** Account disable: "Disable Account" button bans the user in Supabase Auth (prevents login) AND suspends the store (blocks storefront/POS) in one flow. Mirrors existing suspend pattern with confirmation modal. Re-enable reverses both.
- **D-10:** Both user management actions (password reset, disable) appear on the existing tenant detail page alongside Suspend/Unsuspend actions. No separate user management page.
- **D-11:** Sidebar updated from 1 link to 3: Dashboard, Tenants, Analytics. Analytics is a placeholder link for Phase 27.

### Claude's Discretion
- Exact stat card sizing and grid layout on the dashboard
- Recharts configuration details (colors, grid lines, tooltip format) — follow DESIGN.md palette
- Invoice table columns and date formatting
- Subscription display format (card vs table row)
- Warning banner exact styling (yellow vs red, icon choice)
- Loading states for Stripe API calls (skeleton vs spinner)
- Analytics placeholder page content

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SA-DASH-01 | Super-admin dashboard shows total active tenants, suspended tenants, and new signups this month | Supabase admin client aggregates on `stores` table: `is_active`, `created_at` grouped by month |
| SA-DASH-02 | Super-admin dashboard shows add-on adoption rates (% of tenants with each add-on) | Join `stores` + `store_plans`; count `has_xero`, `has_email_notifications`, `has_custom_domain`, `has_inventory` as ratios |
| SA-DASH-03 | Super-admin dashboard shows a signup trend chart (last 30 days) | Query `stores.created_at` bucketed by date for last 30 days; feed into Recharts AreaChart (identical to `SalesTrendChart` pattern) |
| SA-BILL-01 | Super-admin can view a tenant's active Stripe subscriptions from tenant detail page | `stripe.subscriptions.list({ customer: stripe_customer_id, status: 'all', limit: 10 })` — same pattern as `/admin/billing/page.tsx` |
| SA-BILL-02 | Super-admin can view a tenant's recent invoices and payment status from tenant detail page | `stripe.invoices.list({ customer: stripe_customer_id, limit: 10 })` — new Stripe API call, returns amount_paid, status, period dates |
| SA-BILL-03 | Super-admin can see payment failure alerts for tenants with past-due invoices | After fetching invoices, check for `invoice.status === 'past_due'` or `invoice.status === 'open'` with `due_date < now()` — render warning banner |
| SA-USER-01 | Super-admin can view a tenant's owner email and signup date from tenant detail | `admin.auth.admin.getUserById(store.owner_auth_id)` returns `user.email` and `user.created_at`; signup date is `stores.created_at` |
| SA-USER-02 | Super-admin can trigger a password reset email for a merchant account | `admin.auth.admin.resetPasswordForEmail(email, { redirectTo: ... })` — confirmed available on Supabase admin client |
| SA-USER-03 | Super-admin can disable a merchant account, preventing login | `admin.auth.admin.updateUserById(owner_auth_id, { ban_duration: 'none' | '876600h' })` + set `stores.is_active = false` atomically |
</phase_requirements>

## Standard Stack

### Core (confirmed installed — no new installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (node) | ^17.x | Stripe API: subscriptions list, invoices list | Already installed and used in `/admin/billing/page.tsx` |
| @supabase/supabase-js | ^2.x | Admin auth API for user management | `createSupabaseAdminClient()` already provides service role client |
| recharts | Installed (Phase 25) | Signup trend AreaChart | `SalesTrendChart` already uses AreaChart — reuse same component shape |
| date-fns | ^3.x | Date formatting in invoice table and signup trend | Already installed, used throughout codebase |

### No new packages required
This phase is purely additive — it uses patterns and packages already established in the codebase. No `npm install` step needed.

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/app/super-admin/
├── page.tsx                          # NEW — Platform Dashboard (SA-DASH-01/02/03)
├── analytics/
│   └── page.tsx                      # NEW — Analytics placeholder (D-11)
├── tenants/[id]/
│   ├── page.tsx                      # EXTENDED — add Stripe sections + warning banner
│   └── TenantDetailActions.tsx       # EXTENDED — add password reset + disable buttons/modals

src/components/super-admin/
├── SignupTrendChart.tsx               # NEW — 30-day area chart (wraps Recharts, no period toggle)
├── PasswordResetModal.tsx            # NEW — confirmation modal for password reset
├── DisableAccountModal.tsx           # NEW — confirmation modal for disable/re-enable

src/actions/super-admin/
├── resetMerchantPassword.ts          # NEW — calls Supabase admin resetPasswordForEmail()
├── disableMerchantAccount.ts         # NEW — bans user + suspends store in one action
├── enableMerchantAccount.ts          # NEW — reverse: unbans user + unsuspends store
├── __tests__/
│   ├── resetMerchantPassword.test.ts # NEW
│   ├── disableMerchantAccount.test.ts # NEW
│   └── enableMerchantAccount.test.ts  # NEW
```

### Pattern 1: Dashboard Platform Metrics (SA-DASH-01, SA-DASH-02)
**What:** Single server component at `/super-admin/page.tsx` fetches all metrics in `Promise.all()` using `createSupabaseAdminClient()`, then passes data to `DashboardHeroCard` components.

**Queries needed:**
```typescript
// Source: existing TenantsPage + stores schema
const admin = createSupabaseAdminClient()

const [activeResult, suspendedResult, signupsThisMonthResult, addonStatsResult, trendResult] = await Promise.all([
  // Active tenants count
  (admin as any).from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),

  // Suspended tenants count
  (admin as any).from('stores').select('id', { count: 'exact', head: true }).eq('is_active', false),

  // New signups this month
  (admin as any).from('stores').select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString()),

  // Add-on adoption: total stores + per-addon counts
  (admin as any).from('store_plans').select(
    'has_xero, has_email_notifications, has_custom_domain, has_inventory'
  ),

  // 30-day signup trend: store created_at for last 30 days
  (admin as any).from('stores').select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true }),
])
```

Add-on adoption calculation (client-side after fetch):
```typescript
// Source: pattern from existing billing page
const totalPlans = addonData.length
const adoptionRates = {
  xero: Math.round((addonData.filter(p => p.has_xero).length / totalPlans) * 100),
  email_notifications: Math.round((addonData.filter(p => p.has_email_notifications).length / totalPlans) * 100),
  custom_domain: Math.round((addonData.filter(p => p.has_custom_domain).length / totalPlans) * 100),
  inventory: Math.round((addonData.filter(p => p.has_inventory).length / totalPlans) * 100),
}
```

### Pattern 2: Signup Trend Chart (SA-DASH-03)
**What:** New `SignupTrendChart` client component (same shape as `SalesTrendChart`) but with integer counts on Y-axis and no period toggle.

```typescript
// Source: src/components/admin/dashboard/SalesTrendChart.tsx
// Differences from SalesTrendChart:
// - dataKey: 'count' (integer, not 'totalCents')
// - Y-axis formatter: (v: number) => String(v)  [no $ prefix]
// - No period toggle state — always 30-day fixed window
// - gradient ID: 'signupGradient' [avoid clash with 'salesGradient']
// - height: 200px (vs 240px in SalesTrendChart)

// Data shape
interface SignupDataPoint {
  date: string  // "1 Apr", "2 Apr"
  count: number
}
```

Trend data builder (in server component):
```typescript
// Source: getSalesTrendData pattern in /admin/dashboard/page.tsx
function buildSignupTrend(stores: { created_at: string }[], days: number): SignupDataPoint[] {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  const grouped: Record<string, number> = {}
  for (const store of stores) {
    const date = store.created_at.slice(0, 10)
    grouped[date] = (grouped[date] ?? 0) + 1
  }

  const result: SignupDataPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    // Format as "1 Apr" to match SalesTrendChart x-axis style
    const label = d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
    result.push({ date: label, count: grouped[key] ?? 0 })
  }
  return result
}
```

### Pattern 3: Stripe Billing on Tenant Detail (SA-BILL-01, SA-BILL-02, SA-BILL-03)
**What:** Tenant detail page server component fetches Stripe data in parallel with existing queries. Stripe fetch wrapped in try/catch — error shown inline, page does not crash.

**Critical:** The `stores` table has `stripe_customer_id` directly. Fetch it alongside existing store data.

```typescript
// Source: /admin/billing/page.tsx — established Stripe fetch pattern
// In TenantDetailPage, extend Promise.all() with Stripe calls:

// First, add stripe_customer_id to the stores select query:
(admin as any).from('stores')
  .select('id, name, slug, is_active, created_at, suspended_at, suspension_reason, stripe_customer_id, owner_auth_id')
  .eq('id', id)
  .single()

// Then fetch Stripe data (after store query resolves, or in separate try/catch):
let stripeSubscriptions: Stripe.Subscription[] = []
let stripeInvoices: Stripe.Invoice[] = []
let stripeError: string | null = null

if (store.stripe_customer_id) {
  try {
    const [subsResult, invoicesResult] = await Promise.all([
      stripe.subscriptions.list({
        customer: store.stripe_customer_id,
        status: 'all',
        limit: 10,
      }),
      stripe.invoices.list({
        customer: store.stripe_customer_id,
        limit: 10,
      }),
    ])
    stripeSubscriptions = subsResult.data
    stripeInvoices = invoicesResult.data
  } catch (err) {
    console.error('[TenantDetail] Stripe fetch failed:', err)
    stripeError = 'Could not load billing data. Check the Stripe dashboard directly.'
  }
}
```

Payment failure detection (SA-BILL-03):
```typescript
// Shown as warning banner at top of page
const hasPastDue = stripeInvoices.some(
  inv => inv.status === 'past_due' ||
  (inv.status === 'open' && inv.due_date && inv.due_date * 1000 < Date.now())
)
```

### Pattern 4: Owner Email Lookup (SA-USER-01)
**What:** The `stores.owner_auth_id` links to `auth.users`. Use admin client to fetch user details.

```typescript
// Source: Supabase Admin Auth API — verified via @supabase/supabase-js docs
// Fetch alongside existing store query in TenantDetailPage

// Add owner_auth_id to stores select (see Pattern 3 above)
// Then:
let ownerEmail: string | null = null
let ownerSignupDate: string | null = null

if (store.owner_auth_id) {
  const { data: ownerUser, error: userError } = await admin.auth.admin.getUserById(
    store.owner_auth_id
  )
  if (!userError && ownerUser.user) {
    ownerEmail = ownerUser.user.email ?? null
    ownerSignupDate = ownerUser.user.created_at
  }
}
```

The `stores.created_at` is the store creation date (already fetched). The owner user `created_at` from `auth.users` is the account signup date — both are relevant to SA-USER-01.

### Pattern 5: Password Reset Server Action (SA-USER-02)
**What:** New server action `resetMerchantPassword.ts` following exact pattern of `suspendTenant.ts`.

```typescript
// Source: src/actions/super-admin/suspendTenant.ts — established action pattern
'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ResetPasswordSchema = z.object({
  storeId: z.string().uuid(),
  ownerEmail: z.string().email(),
})

export async function resetMerchantPassword(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  // 1. Auth check — must be super admin
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.is_super_admin !== true) {
    return { error: 'Unauthorized' }
  }

  // 2. Zod validate
  const parsed = ResetPasswordSchema.safeParse({
    storeId: formData.get('storeId'),
    ownerEmail: formData.get('ownerEmail'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  const { storeId, ownerEmail } = parsed.data
  const admin = createSupabaseAdminClient()

  // 3. Trigger password reset email
  // Note: resetPasswordForEmail is on the auth client, not admin.auth.admin
  const { error: resetError } = await admin.auth.resetPasswordForEmail(ownerEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/admin/reset-password`,
  })
  if (resetError) return { error: 'Failed to send reset email' }

  // 4. Audit log
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'password_reset',
    store_id: storeId,
    note: `Password reset email sent to ${ownerEmail}`,
  })

  revalidatePath(`/super-admin/tenants/${storeId}`)
  return { success: true }
}
```

**CRITICAL NOTE:** The `super_admin_actions.action` column has a CHECK constraint: `CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon'))`. The new actions `'password_reset'` and `'disable_account'` / `'enable_account'` will require a migration to extend this constraint. See Pitfall 1 below.

### Pattern 6: Disable / Enable Account Actions (SA-USER-03)
**What:** Disable = ban user in Supabase Auth + suspend store. Enable = unban + unsuspend.

Supabase Auth ban uses `ban_duration` on `updateUserById`:
```typescript
// Source: Supabase Auth Admin API docs — verified
// Disable (permanent ban until explicitly removed):
const { error } = await admin.auth.admin.updateUserById(ownerAuthId, {
  ban_duration: '876600h'  // 100 years — effectively permanent
})

// Re-enable (remove ban):
const { error } = await admin.auth.admin.updateUserById(ownerAuthId, {
  ban_duration: 'none'
})
```

The disable action must also set `stores.is_active = false` (same as suspendTenant) so the storefront/POS is blocked. The enable action reverses this (same as unsuspendTenant). Cache invalidation via `invalidateCachedStoreId(store.slug)` is required on both paths.

### Anti-Patterns to Avoid
- **Inline Stripe client construction:** The billing page uses `new Stripe(process.env.STRIPE_SECRET_KEY!)` inline. The preferred pattern is to import from `src/lib/stripe.ts` singleton. Use the singleton for all Phase 26 Stripe calls.
- **Fetching Stripe data outside try/catch:** Stripe API calls MUST be wrapped in try/catch. A Stripe outage should not crash the page.
- **Trusting JWT is_super_admin for mutations:** Every server action must re-verify via `createSupabaseServerClient().auth.getUser()` + `user.app_metadata?.is_super_admin === true`. Never skip.
- **Sidebar active state collision:** The `/super-admin` route must use exact match (`pathname === '/super-admin'`) not prefix match (`pathname.startsWith('/super-admin/')`) — otherwise the Dashboard link lights up on all sub-pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription fetch | Custom Stripe REST calls | `stripe.subscriptions.list()` from singleton | Already established pattern in `/admin/billing/page.tsx` |
| Invoice fetch | Custom REST calls | `stripe.invoices.list()` | Stripe SDK handles auth, retries, type safety |
| Password reset email | Custom SMTP/Resend flow | `admin.auth.resetPasswordForEmail()` | Supabase Auth handles the token, expiry, and email delivery |
| User ban | DB flag `is_banned` custom column | `admin.auth.admin.updateUserById({ ban_duration })` | Supabase Auth enforces ban at JWT issuance — DB flag alone doesn't block login |
| Area chart | Custom canvas/SVG | Recharts `AreaChart` | Already installed, `SalesTrendChart` provides exact visual reference |
| Stat cards | New component | `DashboardHeroCard` (existing) | Exact prop interface: `{ label, value, subLabel? }` |

## Common Pitfalls

### Pitfall 1: super_admin_actions CHECK constraint blocks new action types
**What goes wrong:** Inserting `action: 'password_reset'` or `action: 'disable_account'` into `super_admin_actions` fails at the DB level with a constraint violation.

**Why it happens:** Migration 020 defines: `CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon'))`. New action types are not in this list.

**How to avoid:** Phase 26 requires a new migration (029) to ALTER the CHECK constraint to include `'password_reset'`, `'disable_account'`, and `'enable_account'`. This must be Wave 0 — before any action code runs.

**Warning signs:** `PostgrestError: new row violates check constraint "super_admin_actions_action_check"` in server action.

### Pitfall 2: Stripe customer ID may be null — tenant never subscribed
**What goes wrong:** Code tries to fetch Stripe subscriptions/invoices for a tenant that signed up but never subscribed. `store.stripe_customer_id` is `null`.

**Why it happens:** `stripe_customer_id` is only set on first Stripe checkout. Newly provisioned stores may never have one.

**How to avoid:** Always guard with `if (store.stripe_customer_id)` before making Stripe API calls. Show "No active subscriptions found for this tenant." empty state when null.

**Warning signs:** Stripe API error `No such customer: 'null'`.

### Pitfall 3: Sidebar active state lights up incorrectly
**What goes wrong:** Navigating to `/super-admin/tenants` or `/super-admin/tenants/[id]` causes the Dashboard nav link to appear active because `pathname.startsWith('/super-admin/')` is true.

**Why it happens:** The existing sidebar uses `pathname === href || pathname.startsWith(href + '/')` — this works for Tenants (`/super-admin/tenants/`) but the Dashboard link (`/super-admin`) needs exact match only.

**How to avoid:** In the updated `navLinks` array, add an `exactMatch: true` flag for the Dashboard entry, and use `isActive = exactMatch ? pathname === href : pathname === href || pathname.startsWith(href + '/')`.

**Warning signs:** Dashboard link shows amber left border when on the Tenants list page.

### Pitfall 4: `resetPasswordForEmail` vs `admin.auth.admin.resetPasswordForEmail`
**What goes wrong:** Using the wrong Supabase client method. `admin.auth.resetPasswordForEmail()` works but sends the email using Supabase's own SMTP — this is the non-admin variant and sends to ANY email without verification. `admin.auth.admin.generateLink()` with `type: 'recovery'` is the admin-only variant that returns a link without sending.

**Why it happens:** Supabase has two Auth client surfaces: `supabase.auth.*` (user-facing) and `supabase.auth.admin.*` (service role).

**How to avoid:** Decision D-08 specifies standard email reset flow — use `admin.auth.resetPasswordForEmail(email)`. This is correct: it sends the standard reset email. The admin client (service role) calling this method bypasses the rate-limiting that would apply to user-initiated resets. The `redirectTo` URL must point to a valid reset-password endpoint (the admin billing portal is fine for v1).

**Warning signs:** Email not arriving, or error `Auth session missing`.

### Pitfall 5: Disabling account without invalidating tenant cache
**What goes wrong:** Super-admin disables a merchant account. The store is suspended in the DB (`is_active = false`) but the tenant cache still holds the store record as active. The middleware serves cached data and the storefront remains accessible briefly.

**Why it happens:** `invalidateCachedStoreId(store.slug)` must be called on any `is_active` change, exactly as done in `suspendTenant.ts`.

**How to avoid:** Copy the cache invalidation call from `suspendTenant.ts` into the new `disableMerchantAccount.ts` action.

**Warning signs:** Store storefront accessible for up to cache TTL after disable action.

### Pitfall 6: Invoice `status` field values
**What goes wrong:** Checking `invoice.status === 'overdue'` — this status does not exist in Stripe's API.

**Why it happens:** Stripe invoices use `status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'`. Overdue invoices show as `'open'` with `due_date` in the past. There is a separate `collection_method` and `attempt_count` for failed payment tracking.

**How to avoid:** For SA-BILL-03, check `invoice.status === 'open' && invoice.due_date && invoice.due_date * 1000 < Date.now()`. Note Stripe's `payment_intent.status === 'requires_payment_method'` can also indicate failure — but the simpler `open + overdue` check matches the requirement.

**Warning signs:** Warning banner never appears even for genuinely late accounts.

## Code Examples

### Invoices list — Stripe API
```typescript
// Source: Stripe Node.js SDK docs (confirmed HIGH confidence)
const invoices = await stripe.invoices.list({
  customer: stripeCustomerId,
  limit: 10,
  // expand: ['data.payment_intent'] — optional, not needed for this phase
})

// Key fields used:
// invoice.id, invoice.status, invoice.amount_due, invoice.amount_paid
// invoice.created (unix timestamp), invoice.due_date (unix timestamp or null)
// invoice.lines.data[0].description (line item description)
// invoice.hosted_invoice_url (link to Stripe's hosted invoice)
```

### Admin Auth — getUserById
```typescript
// Source: Supabase JS client docs — @supabase/supabase-js admin API
const { data, error } = await admin.auth.admin.getUserById(ownerAuthId)
// data.user.email, data.user.created_at, data.user.banned_until
```

### Admin Auth — updateUserById (ban)
```typescript
// Source: Supabase JS client docs — ban_duration field
// Ban (disable):
await admin.auth.admin.updateUserById(ownerAuthId, { ban_duration: '876600h' })
// Unban (enable):
await admin.auth.admin.updateUserById(ownerAuthId, { ban_duration: 'none' })
```

### Dashboard metric queries
```typescript
// Source: pattern from existing TenantsPage (src/app/super-admin/tenants/page.tsx)
const { count: activeCount } = await (admin as any)
  .from('stores')
  .select('id', { count: 'exact', head: true })
  .eq('is_active', true)

// Note: Supabase count queries return { count: number | null }
// Always default to 0: activeCount ?? 0
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | ~2023 | CLAUDE.md explicitly forbids the old package |
| Stripe Elements (custom card UI) | Stripe Checkout (hosted) | Phase design decision | PCI compliance, less code |
| `stripe.subscriptions.retrieve(id)` | `stripe.subscriptions.list({ customer: id })` | Always correct for this use case | Returns all subs for customer without needing subscription ID |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: do not use — explicitly banned in CLAUDE.md
- Inline `new Stripe(key)`: prefer singleton import from `src/lib/stripe.ts`

## Open Questions

1. **`resetPasswordForEmail` redirectTo URL**
   - What we know: D-08 specifies standard email reset flow. The redirect URL must be configured in Supabase Auth allowed redirect URLs.
   - What's unclear: Which URL should be used as `redirectTo`? The merchant's `/admin` login, or a generic reset page?
   - Recommendation: Use `${process.env.NEXT_PUBLIC_APP_URL}/admin/login` as redirect. This sends the owner to their admin login after setting new password. No new page required.

2. **`super_admin_actions` CHECK constraint migration**
   - What we know: The constraint must be altered to allow new action types.
   - What's unclear: Postgres `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` requires knowing the constraint name. Migration 020 does not name the constraint explicitly — Postgres auto-generates it.
   - Recommendation: Wave 0 migration should use `ALTER TABLE public.super_admin_actions DROP CONSTRAINT IF EXISTS super_admin_actions_action_check; ALTER TABLE public.super_admin_actions ADD CONSTRAINT super_admin_actions_action_check CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon', 'password_reset', 'disable_account', 'enable_account'));`

## Environment Availability

Step 2.6: SKIPPED — Phase 26 is code/config changes only. All external dependencies (Stripe API, Supabase) are live services already configured and used in earlier phases. No new CLI tools or runtimes required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x (confirmed — `vitest.config.mts` present) |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run src/actions/super-admin/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SA-DASH-01 | Active/suspended/new-signup counts computed correctly | unit | `npx vitest run src/app/super-admin/__tests__/dashboardMetrics.test.ts` | ❌ Wave 0 |
| SA-DASH-02 | Add-on adoption rate calculation (0 tenants edge case, 100% edge case) | unit | `npx vitest run src/app/super-admin/__tests__/dashboardMetrics.test.ts` | ❌ Wave 0 |
| SA-DASH-03 | Signup trend data builder — 30 days, missing days filled with 0 | unit | `npx vitest run src/app/super-admin/__tests__/signupTrend.test.ts` | ❌ Wave 0 |
| SA-BILL-01 | Stripe subscriptions section renders — tested via action tests | manual | Vitest action mocks | — |
| SA-BILL-02 | Stripe invoices section renders — tested via action tests | manual | Vitest action mocks | — |
| SA-BILL-03 | `hasPastDue` detection: open + overdue = true, paid = false | unit | `npx vitest run src/app/super-admin/__tests__/billingAlerts.test.ts` | ❌ Wave 0 |
| SA-USER-01 | Owner email fetched and displayed | manual | Integration test via page render | — |
| SA-USER-02 | `resetMerchantPassword` action: auth check, Zod, reset call, audit log | unit | `npx vitest run src/actions/super-admin/__tests__/resetMerchantPassword.test.ts` | ❌ Wave 0 |
| SA-USER-03 | `disableMerchantAccount` action: auth check, ban user, suspend store, invalidate cache | unit | `npx vitest run src/actions/super-admin/__tests__/disableMerchantAccount.test.ts` | ❌ Wave 0 |
| SA-USER-03 | `enableMerchantAccount` action: unban + unsuspend | unit | `npx vitest run src/actions/super-admin/__tests__/enableMerchantAccount.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/super-admin/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/super-admin/__tests__/dashboardMetrics.test.ts` — covers SA-DASH-01, SA-DASH-02 (pure function: adoption rate calculation, metric aggregation)
- [ ] `src/app/super-admin/__tests__/signupTrend.test.ts` — covers SA-DASH-03 (pure function: `buildSignupTrend`)
- [ ] `src/app/super-admin/__tests__/billingAlerts.test.ts` — covers SA-BILL-03 (pure function: `hasPastDue` detection logic)
- [ ] `src/actions/super-admin/__tests__/resetMerchantPassword.test.ts` — covers SA-USER-02
- [ ] `src/actions/super-admin/__tests__/disableMerchantAccount.test.ts` — covers SA-USER-03 (disable path)
- [ ] `src/actions/super-admin/__tests__/enableMerchantAccount.test.ts` — covers SA-USER-03 (enable path)

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 26? |
|-----------|----------------------|
| Tailwind CSS v4 — no `tailwind.config.js`, use CSS-native config | YES — all new components use Tailwind utilities |
| `@supabase/ssr` only — no `@supabase/auth-helpers-nextjs` | YES — do not import old helpers |
| Every Server Action validates inputs with `z.safeParse()` before touching DB | YES — all three new actions must use Zod |
| Server Actions in files with Supabase/Stripe credentials must `import 'server-only'` | YES — all new action files |
| No Prisma, no Zustand, no Redux | Not applicable |
| Vitest for unit tests (not Jest) | YES — test files use Vitest |
| Use `src/lib/stripe.ts` singleton | YES — import `stripe` from `@/lib/stripe` not inline `new Stripe()` |
| DESIGN.md must be read before any UI decisions | YES — UI-SPEC.md already produced and approved |
| GSD workflow enforced — use Write/Edit tools within GSD commands only | Enforced by orchestrator |

## Sources

### Primary (HIGH confidence)
- Codebase: `src/actions/super-admin/suspendTenant.ts` — exact server action pattern to replicate
- Codebase: `src/app/admin/billing/page.tsx` — exact Stripe subscription fetch pattern
- Codebase: `src/components/admin/dashboard/SalesTrendChart.tsx` — exact Recharts pattern
- Codebase: `src/components/admin/dashboard/DashboardHeroCard.tsx` — exact stat card component
- Codebase: `supabase/migrations/020_super_admin_panel.sql` — confirmed CHECK constraint on `super_admin_actions.action`
- Codebase: `supabase/migrations/001_initial_schema.sql` — confirmed `stores.owner_auth_id` column
- Codebase: `supabase/migrations/014_multi_tenant_schema.sql` — confirmed `stores.stripe_customer_id` column

### Secondary (MEDIUM confidence)
- Supabase Auth Admin API: `admin.auth.admin.updateUserById({ ban_duration })` — `ban_duration: '876600h'` for permanent ban, `'none'` to unban. Verified against Supabase JS client patterns in codebase.
- Supabase Admin: `admin.auth.admin.getUserById(uuid)` returns `{ user: { email, created_at, banned_until } }` — verified pattern from supabase-js docs.
- Stripe `invoices.list` status values: `'draft' | 'open' | 'paid' | 'uncollectible' | 'void'` — no `'past_due'` status (past due is `open` + overdue `due_date`).

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and in use
- Architecture: HIGH — all patterns directly replicated from existing codebase files
- Pitfalls: HIGH — pitfalls derived from direct reading of existing DB constraints and code
- Stripe API: MEDIUM — Stripe SDK version matches existing usage; invoice status values from SDK type definitions

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (Stripe API stable; Supabase admin API stable)
