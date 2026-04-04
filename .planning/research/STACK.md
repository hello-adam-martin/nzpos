# Technology Stack

**Project:** NZPOS — NZ Retail POS System
**Researched:** 2026-04-01 (v1.0 core stack) + 2026-04-03 (v2.0 SaaS additions) + 2026-04-04 (v2.1 hardening tooling) + 2026-04-04 (v3.0 inventory management) + 2026-04-05 (v4.0 admin platform)
**Confidence:** HIGH (core stack verified against live Next.js 16.2.1 official docs)

---

## Verdict on Chosen Stack

**Next.js App Router + Supabase + Stripe + Tailwind CSS is the correct choice.** This is the dominant production stack for this type of application in 2026. The combination has proven interoperability, strong documentation, and is AI-friendly for a solo developer. No changes recommended to the core stack. The research below validates specific package versions and flags one significant version-specific consideration: Next.js is now on v16, not v15.

---

## Core Stack

### Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | **16.2** (latest stable, released 2026-03-18) | Full-stack framework | App Router provides Server Components, Server Actions, file-system routing, and built-in image optimisation. v16 introduced Cache Components (`use cache` directive) as stable. Vercel is a verified deployment target. |
| React | **19** (bundled with Next.js 16) | UI rendering | Concurrent features, `useActionState` for form state in Server Actions, `use()` for streaming client components. |
| TypeScript | **5.x** | Type safety | Required for this codebase. Next.js 16 ships with TS support built in. |

**Version note (HIGH confidence):** Current Next.js is 16.2.1, confirmed from official docs dated 2026-03-25. The team likely has "Next.js" in mind but may be thinking v14/v15. Make sure to scaffold with `npx create-next-app@latest` to get v16.

---

### Database & Backend-as-a-Service

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | **@supabase/supabase-js ^2.x** (use latest 2.x) | Postgres DB, Auth, Storage, RLS | Managed Postgres with Row Level Security is the correct choice for multi-tenant data isolation via `store_id`. Built-in auth handles owner email/password. Free tier sufficient for initial launch. Supabase Auth integrates with Next.js App Router via `@supabase/ssr`. |
| @supabase/ssr | **^0.x** (latest) | Supabase + Next.js App Router cookie handling | Required adapter for App Router. Replaces the deprecated `@supabase/auth-helpers-nextjs`. Do NOT use the old auth-helpers package. |
| PostgreSQL | Managed by Supabase | Relational DB | Supabase provides Postgres 15+. Direct access via Supabase client or pg for raw queries if needed. |

**Supabase free tier relevant limits (MEDIUM confidence — pricing page blocked, from training data):** 500MB database, 1GB storage, 50,000 MAU auth, 5GB bandwidth. Sufficient for v1 with a single store. Upgrade path to Pro ($25/mo) is straightforward.

**Custom JWT claims (HIGH confidence):** The decision to use custom JWT claims for RLS is well-founded. Supabase supports this via Database Functions that inject `app_metadata` or by calling `auth.jwt()` in RLS policies. The correct pattern is to set `store_id` and `role` as JWT claims in `raw_app_meta_data` via a Supabase Auth hook (auth.users trigger), then reference `(auth.jwt()->'app_metadata'->>'store_id')::uuid` in RLS policies. This avoids per-row user table joins that cause 2–11x query overhead.

---

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (node) | **^17.x** | Server-side Stripe API, webhooks | stripe-node ^17 is current as of 2025. Use for creating PaymentIntents, Checkout Sessions, handling webhooks in Route Handlers. |
| @stripe/stripe-js | **^4.x** | Client-side Stripe Elements | Loads Stripe.js for online storefront card UI. Use Stripe Checkout (hosted) rather than custom Elements for v1 — less scope, PCI-compliant out of the box. |

**Stripe API version (MEDIUM confidence):** Pin to `2024-06-20` or later in your Stripe dashboard and stripe-node instantiation. The online storefront uses Stripe Checkout Sessions. EFTPOS is manual entry — no Stripe involvement for POS cash flow in v1.

**What NOT to use:** Do not use Stripe Terminal SDK in v1. Project explicitly defers hardware EFTPOS integration to v1.1. Do not use Stripe Elements custom card UI for the online storefront — Stripe Checkout hosted page is simpler, handles 3DS, and is adequate for a small NZ retail storefront.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | **4.2** (latest stable, released April 2025) | Utility-first CSS | v4 is a major rewrite — CSS-native config via `@import "tailwindcss"`, no `tailwind.config.js` needed by default. The design system (deep navy + amber) maps cleanly to Tailwind utility classes. |
| @tailwindcss/postcss | **^4.x** | PostCSS integration for Next.js | Required for Tailwind v4 with Next.js. Replaces the old `tailwind.config.js` + `postcss.config.js` pattern. |

**Tailwind v4 caution (from Key Decisions):** Spacing tokens caused bugs with the CSS-native config approach. Use `@theme` block in `globals.css` and test spacing utilities before relying on them.

---

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | **^3.x** | Schema validation on Server Actions and API inputs | The Next.js official auth documentation explicitly recommends Zod for Server Action validation (confirmed in official docs 2026-03-25). Zod 3.x is the current stable series. Every Server Action must validate inputs with `z.safeParse()` before touching the database. |

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth (via @supabase/ssr) | included with Supabase | Owner email/password auth | Supabase Auth is listed explicitly in the Next.js official auth library recommendations (confirmed 2026-03-25). Handles JWT issuance, refresh tokens, and cookie management via `@supabase/ssr`. |
| jose | **^5.x** | JWT verification for custom staff PIN sessions | Next.js official docs use `jose` for stateless session encryption (JWT signing with HS256). Staff PIN login is a custom session separate from Supabase Auth — use jose to sign/verify short-lived PIN sessions stored in HttpOnly cookies. Compatible with Edge Runtime. |

---

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | **latest (^2.x or ^3.x)** | Unit tests for utilities, GST calculations, state machines | Official Next.js docs (2026-03-25) recommend Vitest + React Testing Library for unit testing. Critical for GST rounding logic — per-line calculations must be deterministic. Does not support async Server Components directly; use for pure functions. |
| @testing-library/react | **^16.x** | Component testing for Client Components | Pairs with Vitest for rendering Client Component tests (POS cart, PIN pad, etc). |
| Playwright | **latest** | E2E tests for checkout flows, auth flows | Official Next.js docs (2026-03-25) recommend Playwright for E2E. Critical paths to test: online Stripe checkout, POS sale completion with EFTPOS confirmation, stock decrement after transaction. |

---

### Deployment & Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Free tier | Next.js hosting | Verified adapter — full Next.js feature support including Server Actions, middleware, image optimisation. Zero config for a Next.js project. Free tier sufficient for v1 (100GB bandwidth, serverless functions). |
| Supabase | Free tier | Managed Postgres + Auth + Storage | Co-located data and auth. Free tier sufficient for single-store v1. |
| Supabase Storage | included | Product images | Use Supabase Storage buckets for product images. Serves directly via CDN URL. Integrate with `next/image` `remotePatterns` config pointing to `*.supabase.co`. |

---

## v3.0 Inventory Management — Stack Additions

**No new npm packages are required.** The existing stack handles all v3.0 features. What changes are database schema (migrations), Server Actions, and `config/addons.ts` wiring.

---

### Database Schema Changes

The following schema additions are needed. All are pure SQL migrations — no new Supabase features or extensions required.

#### 1. `products` table: add `product_type` column

```sql
-- Migration: 024_inventory_management.sql (new migration)
ALTER TABLE public.products
  ADD COLUMN product_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service'));
```

**Why `product_type` not `is_service` boolean:** The type system will likely expand (e.g. `digital`, `bundle`). An enum-style TEXT CHECK is more forward-compatible than a boolean. `DEFAULT 'physical'` ensures backwards compatibility with all existing products.

**Impact on existing logic:** The `complete_pos_sale` RPC currently does an unconditional stock check and decrement for all items. It must be updated to skip both checks for `product_type = 'service'` items. The RPC must query `product_type` alongside `stock_quantity` in its lock step.

#### 2. `store_plans` table: add `has_inventory` column

```sql
-- In same migration 024
ALTER TABLE public.store_plans
  ADD COLUMN has_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_inventory_manual_override BOOLEAN NOT NULL DEFAULT false;
```

**Pattern:** Matches the existing `has_xero` / `has_xero_manual_override` pair established in migrations 014 and 020. The `_manual_override` column lets super admins comp the add-on without a Stripe subscription — already the established pattern.

#### 3. `stock_adjustments` table: new table

```sql
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  adjusted_by UUID REFERENCES public.staff(id),  -- NULL if system (sale/refund)
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('sale', 'refund', 'manual', 'stocktake', 'import')),
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,               -- positive = increase, negative = decrease
  quantity_after INTEGER NOT NULL,
  reason TEXT,                                    -- free-text reason for manual adjustments
  reference_order_id UUID REFERENCES public.orders(id),  -- populated for sale/refund types
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_adjustments_store ON public.stock_adjustments(store_id);
CREATE INDEX idx_stock_adjustments_product ON public.stock_adjustments(product_id, created_at DESC);
```

**Why a separate table, not an event log on `products`:** The history needs to be queryable by product, by date, by type, and filterable by adjustment type. A dedicated table with appropriate indexes is cleaner than a JSONB audit column on products. The `quantity_before` / `quantity_after` snapshot makes history self-contained and auditable without needing to replay events.

**Why `adjusted_by` is nullable:** Sales and refunds create implicit adjustments via the `complete_pos_sale` RPC. These have no staff actor in the adjustment itself (the sale has a staff_id) — linking via `reference_order_id` provides traceability.

#### 4. `stocktakes` and `stocktake_items` tables: new tables

```sql
CREATE TABLE public.stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  created_by UUID NOT NULL REFERENCES public.staff(id),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID NOT NULL REFERENCES public.stocktakes(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,         -- snapshot at time of count
  system_quantity INTEGER NOT NULL,   -- stock_quantity at time count started
  counted_quantity INTEGER,           -- NULL until counted
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stocktake_id, product_id)
);

CREATE INDEX idx_stocktakes_store ON public.stocktakes(store_id, created_at DESC);
CREATE INDEX idx_stocktake_items_stocktake ON public.stocktake_items(stocktake_id);
```

**Why a two-table model:** Separates the session (stocktake) from the per-product counts. This lets the UI load only the stocktake header, then paginate or stream line items. The `GENERATED ALWAYS AS` computed column for `variance` avoids application-level arithmetic and keeps the DB as the source of truth.

**Why `system_quantity` snapshot:** At commit time, the system quantity may have changed due to concurrent sales. Snapshotting at session-start makes variance calculation consistent and auditable.

#### 5. RLS policies for new tables

New tables need RLS policies following the established pattern: `store_id = (auth.jwt()->'app_metadata'->>'store_id')::uuid`.

```sql
-- stock_adjustments: store members read, admin client writes
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_adjustments_store_read" ON public.stock_adjustments
  FOR SELECT USING (
    store_id = (auth.jwt()->'app_metadata'->>'store_id')::UUID
  );
-- No INSERT/UPDATE/DELETE via RLS — all writes go through SECURITY DEFINER RPCs

-- stocktakes: store members read/write
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stocktakes_store_read" ON public.stocktakes
  FOR SELECT USING (store_id = (auth.jwt()->'app_metadata'->>'store_id')::UUID);

-- stocktake_items: store members read/write
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stocktake_items_store_read" ON public.stocktake_items
  FOR SELECT USING (store_id = (auth.jwt()->'app_metadata'->>'store_id')::UUID);
```

**Pattern note:** Writes to `stock_adjustments` happen only via SECURITY DEFINER RPCs (same pattern as `complete_pos_sale`). This prevents application code from writing raw adjustments that bypass the `quantity_before`/`quantity_after` bookkeeping invariant.

#### 6. Update `custom_access_token_hook` to inject `has_inventory` claim

Following the exact pattern from `019_billing_claims.sql`, add `v_has_inventory BOOLEAN` to the hook and inject it into JWT claims. This enables `requireFeature('inventory')` fast path without a DB query.

---

### `complete_pos_sale` RPC Update

The existing RPC in `005_pos_rpc.sql` must be updated (via a new migration) to:

1. **Query `product_type`** in the lock step: `SELECT stock_quantity, product_type INTO v_current_stock, v_product_type FROM products WHERE ...`
2. **Skip stock check for services:** Only raise `OUT_OF_STOCK` if `v_product_type = 'physical'`
3. **Skip stock decrement for services:** Only `UPDATE products SET stock_quantity = ...` for physical items
4. **Write a `stock_adjustments` row for each physical item sold** (type = `'sale'`, quantity_change = negative quantity)

This keeps the RPC as the single authoritative path for stock mutations — no stock change happens outside a SECURITY DEFINER function.

---

### `config/addons.ts` Changes

Add `'inventory'` to the `SubscriptionFeature` union and update all three maps:

```typescript
// Before
export type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain'

// After
export type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain' | 'inventory'
```

Update `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, and `ADDONS` arrays. Add `STRIPE_PRICE_INVENTORY` env var.

---

### New Server Actions Required

All follow the existing pattern: `'use server'`, `import 'server-only'`, Zod validation, admin client for mutations, `revalidatePath` after writes.

| Action | File | Gating |
|--------|------|--------|
| `adjustStock` | `src/actions/inventory/adjustStock.ts` | `requireFeature('inventory', { requireDbCheck: true })` |
| `createStocktake` | `src/actions/inventory/createStocktake.ts` | `requireFeature('inventory', { requireDbCheck: true })` |
| `updateStocktakeItem` | `src/actions/inventory/updateStocktakeItem.ts` | `requireFeature('inventory', { requireDbCheck: true })` |
| `commitStocktake` | `src/actions/inventory/commitStocktake.ts` | `requireFeature('inventory', { requireDbCheck: true })` |

**Why `requireDbCheck: true` on all inventory mutations:** Stock adjustments are irreversible — a stale JWT claim granting inventory access when the subscription has been cancelled would create incorrect stock records. DB check on every mutation is the correct tradeoff. This matches the pattern already established for Xero disconnect/sync actions.

**`adjustStock` Zod schema:**
```typescript
const AdjustStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity_change: z.number().int().refine(n => n !== 0, 'Change must be non-zero'),
  adjustment_type: z.enum(['manual', 'import']),
  reason: z.string().max(500).optional(),
})
```

**`commitStocktake` requirements:** Must be atomic — use a SECURITY DEFINER RPC `commit_stocktake(p_stocktake_id)` that:
1. Locks all affected product rows
2. Updates `stock_quantity` on each product to `counted_quantity`
3. Writes `stock_adjustments` rows for each variance (type = `'stocktake'`)
4. Sets `stocktake.status = 'completed'` and `completed_at = now()`

This follows the same rationale as `complete_pos_sale`: stock changes must be atomic and go through a SECURITY DEFINER function.

---

### New Zod Schemas Required

Add to `src/schemas/`:

- `src/schemas/inventory.ts` — `AdjustStockSchema`, `CreateStocktakeSchema`, `UpdateStocktakeItemSchema`, `CommitStocktakeSchema`

Update `src/schemas/product.ts` to include `product_type`:

```typescript
export const CreateProductSchema = z.object({
  // existing fields...
  product_type: z.enum(['physical', 'service']).default('physical'),
})
```

---

### Environment Variables

One new env var needed:

```bash
# Stripe Price ID for Inventory Management add-on
STRIPE_PRICE_INVENTORY=price_xxxx
```

Add to `.env.local.example` and `.env.example`. The pattern matches `STRIPE_PRICE_XERO` etc.

---

## v4.0 Admin Platform — Stack Additions

**One new npm package required: recharts.** All other features (staff roles, impersonation, Stripe analytics, customer management) are handled by extending existing patterns — database schema, Server Actions, and the established super-admin service-role client.

---

### New Package: recharts

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| recharts | **^3.x** (latest stable: 3.8.1 as of March 2025) | Charts for admin dashboard and super-admin analytics | React-native SVG charting built on D3. No canvas/WebGL overhead. Ships client components only (requires `'use client'`) — keeps the pattern clean with Server Components fetching data and passing to chart wrappers. React 19 compatible in 3.x series. Best fit for the existing Tailwind design system: style with `className`, no theme provider required. |

**Why recharts over alternatives:**
- **Tremor:** Tremor uses recharts under the hood but adds a component layer and Radix UI dependency. For this project's design system (custom navy + amber tokens), stripping Tremor's opinionated styling would require more work than using recharts directly. Reject.
- **Chart.js / react-chartjs-2:** Canvas-based. Harder to make responsive on iPad POS. SVG is preferable for crisp rendering on high-DPI displays.
- **Victory:** Heavier bundle, less active maintenance relative to recharts.
- **D3 directly:** Too low-level for the charting volume needed. recharts is the appropriate abstraction.

**React 19 compatibility note (HIGH confidence):** recharts 3.x supports React 16.8+, 17, 18, and 19. React 19 support landed in 2.13.0-alpha and was stabilised in 3.x. No peer dependency override needed with Next.js 16 / React 19.

**Server Component usage pattern:**
```typescript
// Server Component fetches data
// app/admin/dashboard/page.tsx
async function DashboardPage() {
  const data = await fetchSalesTrend() // Server Action or direct Supabase call
  return <SalesTrendChart data={data} />
}

// Client Component wraps recharts
// components/SalesTrendChart.tsx
'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
```

**Installation:**
```bash
npm install recharts
```

---

### Staff Role Permissions — No New Packages

The existing `staff` table already has `role TEXT CHECK (role IN ('owner', 'staff'))`. v4.0 adds `'manager'` to this enum via a migration.

**Pattern: extend the existing CHECK constraint — no library needed.**

```sql
-- Migration: 027_staff_roles.sql
ALTER TABLE public.staff
  DROP CONSTRAINT staff_role_check,
  ADD CONSTRAINT staff_role_check
    CHECK (role IN ('owner', 'manager', 'staff'));
```

**RBAC enforcement strategy (no new auth library):**
- Owner/Manager/Staff roles are stored in the `staff` table `role` column.
- The existing `jose` JWT for staff PIN sessions already embeds `role` in the payload (confirmed by existing auth pattern).
- Server Actions check `role` from the PIN session JWT before performing sensitive operations.
- No third-party RBAC library (Permit.io, Casbin, etc.) is needed — the permission matrix is simple enough for explicit checks.

**Permission matrix for v4.0:**

| Action | Owner | Manager | Staff |
|--------|-------|---------|-------|
| Ring up sale | Yes | Yes | Yes |
| Apply discount | Yes | Yes | No |
| View reports | Yes | Yes | No |
| Manage staff | Yes | No | No |
| Manage products | Yes | Yes | No |
| Manage customers | Yes | Yes | No |
| Access billing | Yes | No | No |

**Implementation pattern (no new dependencies):**

```typescript
// src/lib/staffPermissions.ts
export type StaffRole = 'owner' | 'manager' | 'staff'

export const PERMISSIONS = {
  applyDiscount: ['owner', 'manager'],
  viewReports:   ['owner', 'manager'],
  manageStaff:   ['owner'],
  manageProducts:['owner', 'manager'],
  manageCustomers:['owner', 'manager'],
  accessBilling: ['owner'],
} satisfies Record<string, StaffRole[]>

export function can(role: StaffRole, action: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[action].includes(role)
}
```

This `can()` utility is called in Server Actions before performing the operation. The check is server-side only — UI gating is defense-in-depth, not the security boundary.

---

### Stripe Analytics (MRR, Churn, Revenue) — No New Packages

**Use the existing `stripe` (node ^17.x) package. No Stripe Sigma API required.**

**What Stripe's REST API provides directly (no Sigma subscription needed):**
- `stripe.subscriptions.list({ status: 'active', limit: 100 })` — enumerate all active subscriptions with `items.data[].price.unit_amount` for MRR calculation
- `stripe.subscriptions.list({ status: 'canceled' })` — canceled subscriptions for churn calculation
- `stripe.invoices.list({ status: 'open' })` — payment failures / outstanding invoices
- `stripe.customers.list()` — merchant account overview

**MRR calculation pattern (server-side, no external library):**

```typescript
// src/actions/super-admin/getStripeMrr.ts
'use server'
import 'server-only'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function getStripeMrr() {
  // Paginate all active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    expand: ['data.items'],
    limit: 100,
  })

  const mrrCents = subscriptions.data.reduce((sum, sub) => {
    return sum + sub.items.data.reduce((itemSum, item) => {
      const price = item.price
      // Normalize to monthly: price.recurring.interval * interval_count
      const monthlyAmount = price.recurring?.interval === 'year'
        ? Math.round((price.unit_amount ?? 0) / 12)
        : (price.unit_amount ?? 0)
      return itemSum + monthlyAmount * (item.quantity ?? 1)
    }, 0)
  }, 0)

  return { mrrCents, subscriptionCount: subscriptions.data.length }
}
```

**Why not Stripe Sigma:** Sigma is a separate paid product (requires Stripe's Sigma add-on). It provides SQL query access to Stripe data but has 3–7 hour data freshness and is overkill for a small NZ SaaS platform. The REST API provides real-time data and is already available. Reject Sigma for v4.0.

**Why not Stripe Dashboard embed:** No public embed API exists. Data must be fetched via REST and rendered with recharts.

**Caching strategy:** Super-admin analytics pages should use `unstable_cache` or the `use cache` directive (Next.js 16 stable) with a 1-hour revalidation. Stripe API calls are rate-limited (100 read requests/second in live mode) — caching avoids hammering the API on every page load.

---

### Merchant Impersonation — No New Packages

**Use `supabase.auth.admin.generateLink()` from the existing Supabase admin client. No new library needed.**

The pattern uses Supabase's magic link generation to create a time-limited, single-use login link for a target merchant user, then signs the super-admin into that session while preserving an impersonation cookie.

**Implementation using existing tools:**

```typescript
// src/actions/super-admin/impersonateMerchant.ts
'use server'
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

export async function impersonateMerchant(targetUserId: string) {
  // 1. Verify caller is super admin (existing pattern)
  // 2. Look up target user's email
  const supabaseAdmin = createAdminClient()
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

  // 3. Generate magic link
  const { data } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.user!.email!,
  })

  // 4. Store impersonation context in HttpOnly cookie (using jose — already installed)
  const impersonationToken = await new SignJWT({
    super_admin_user_id: currentUserId,
    impersonating: targetUserId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.STAFF_JWT_SECRET!))

  const cookieStore = await cookies()
  cookieStore.set('impersonation_session', impersonationToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 3600,
  })

  // 5. Audit log the action
  await supabaseAdmin.from('super_admin_actions').insert({
    super_admin_user_id: currentUserId,
    action: 'impersonate',
    store_id: targetStoreId,
    note: `Impersonating ${user.user!.email}`,
  })

  // 6. Redirect to magic link (signs in as merchant)
  redirect(data.properties!.action_link)
}
```

**Key security requirements:**
- Only callable by verified super admins (existing `is_super_admin` JWT claim check)
- Impersonation token stored as `httpOnly: true` cookie — not accessible to client JS
- 1-hour expiry on impersonation session
- All impersonations logged to `super_admin_actions` table (existing audit trail)
- Extend `super_admin_actions.action` CHECK to include `'impersonate'` and `'end_impersonation'` via migration

**Schema change needed:**

```sql
-- Migration: 027_staff_roles.sql (or separate 028_impersonation.sql)
ALTER TABLE public.super_admin_actions
  DROP CONSTRAINT super_admin_actions_action_check,
  ADD CONSTRAINT super_admin_actions_action_check
    CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon', 'impersonate', 'end_impersonation', 'password_reset', 'disable_account'));
```

---

### Admin Dashboard Charts — recharts Integration Pattern

Charts needed for v4.0:

| Chart | Type | Data Source | Component |
|-------|------|------------|-----------|
| Sales trend (7/30/90 day) | `<AreaChart>` | `orders` table grouped by date | `SalesTrendChart` |
| Revenue by channel (POS vs online) | `<BarChart>` | `orders` grouped by channel | `ChannelRevenueChart` |
| Platform MRR trend | `<AreaChart>` | Stripe `subscriptions.list` + date bucketing | `PlatformMrrChart` |
| Add-on adoption | `<BarChart>` | `store_plans` column counts | `AddonAdoptionChart` |
| Top products | `<BarChart>` | `order_items` grouped by product | `TopProductsChart` |

**Styling alignment with design system:**

```typescript
// Consistent with DESIGN.md navy + amber palette
const CHART_COLORS = {
  primary: '#E67E22',   // amber — matches design system
  secondary: '#1E293B', // navy
  muted: '#94A3B8',     // slate-400 for axis labels
}
```

All chart components are Client Components. Data is fetched in Server Components (or Server Actions) and passed as props. This pattern avoids client-side data fetching and keeps sensitive Supabase queries server-side.

---

### Customer Management — No New Packages

The `customers` table exists from v2.0. Customer management UI requires:
- Server-side paginated list (existing Supabase `.range()` pattern)
- Search by name/email (existing `ilike` pattern used in super-admin tenant search)
- Order history view (existing orders query pattern)
- Account deactivation (soft delete via `is_active` column — same pattern as staff)

No new libraries. All implemented with existing Supabase client + Server Actions + Zod validation.

---

### Store Settings Expansion — No New Packages

Additional store settings (business address, phone, IRD number, receipt header/footer, store hours) require:
- Schema additions to `stores` table (migration)
- Updated `UpdateStoreSchema` Zod schema
- Extended admin settings UI (react-hook-form already in stack)

No new libraries.

---

### Promo Management — No New Packages

Edit and delete of existing promo codes is a straightforward CRUD extension:
- `updatePromoCode` Server Action with Zod validation
- `deletePromoCode` Server Action (soft or hard delete)

No new libraries.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | latest | Prevent server code from running on client | Import in any file with Supabase credentials, session logic, or Server Actions. Causes build error if accidentally imported client-side. |
| date-fns | **^3.x** | Date manipulation | End-of-day reports, Xero sync date ranges, click-and-collect scheduling. Do not use moment.js (deprecated). |
| react-hook-form | **^7.x** | Form state management on Client Components | For complex POS forms (product creation, discount application). Use with Zod resolver (`@hookform/resolvers`). Not needed for simple Server Action forms. |
| @hookform/resolvers | **^3.x** | Zod integration for react-hook-form | Bridges Zod schemas into react-hook-form validation. |
| sharp | **latest** | Image processing | Installed automatically by Next.js for image optimisation. List in `serverExternalPackages` if needed — it is on Next.js's auto-opt-out list. |
| tsx / ts-node | dev only | Run TypeScript scripts | For database seed scripts, migration helpers. |
| recharts | **^3.x** | Chart components (v4.0+) | Admin dashboard sales trend, super-admin MRR/churn charts. Use `'use client'` wrapper components. |

---

## What NOT to Use (and Why)

| Category | Avoid | Why |
|----------|-------|-----|
| ORM | Prisma | Adds a build step (prisma generate), cold start overhead on serverless, and complexity for a project already using Supabase client SDK. Use Supabase JS client with typed queries instead. The Supabase client IS the data layer. |
| State management | Redux, Zustand | Overkill for this architecture. Server Components handle most data fetching. Use React state + Server Actions for mutations. Zustand acceptable only if POS cart state becomes complex. |
| Auth library | NextAuth / Auth.js | Supabase Auth is already the auth system. Adding another auth library creates two competing session systems. |
| Auth library | Clerk | Paid SaaS with its own user DB. Conflicts with Supabase RLS model. |
| CSS | CSS Modules, styled-components, Emotion | Not the chosen stack. Tailwind utility classes are sufficient for this project scope. |
| CSS | Tailwind v3 | v4 is current. v3 uses deprecated config model incompatible with v4 PostCSS setup. |
| Realtime | Supabase Realtime (for inventory) | Refresh-on-transaction is the established pattern. Realtime adds WebSocket failure modes for no benefit in a single-operator POS. |
| Database | Raw pg / Drizzle / Kysely | Supabase JS client handles all query needs. Adding a second query layer creates type conflicts with Supabase's generated types. |
| Payments | Stripe Terminal SDK (v1) | Hardware EFTPOS integration explicitly deferred to v1.1. Terminal SDK is complex, requires device provisioning. |
| Inventory | Dedicated inventory library (e.g. inventory.js, stock-keeping) | No meaningful NZ-ecosystem library exists. The requirements are simple enough that bespoke Server Actions + SECURITY DEFINER RPCs are the correct approach. Adding a library here would obscure the stock decrement logic rather than simplify it. |
| Testing | Jest | Vitest is the recommended alternative — faster, native ESM, better TypeScript support, compatible with Vite tooling ecosystem. Jest requires significant config to work with Next.js App Router. |
| RBAC library | Permit.io, Casbin, CASL | Permission matrix for Owner/Manager/Staff is three roles with ~7 action types. A 20-line `PERMISSIONS` object and `can()` function is sufficient. External RBAC libraries add a dependency, an external service (Permit.io), or significant setup overhead for trivial benefit at this scale. |
| Analytics | Stripe Sigma API | Separate paid Stripe add-on with 3–7 hour data freshness. Stripe REST API provides real-time subscription data sufficient for platform MRR/churn at this scale. Sigma is appropriate when you need SQL queries across historical Stripe data at high volume — not applicable here. |
| Charting | Tremor | Tremor is recharts + Radix UI + opinionated Tailwind styling. The existing design system uses custom navy/amber tokens that conflict with Tremor's defaults. Stripping Tremor's styles costs more than using recharts directly. |
| Charting | Chart.js / react-chartjs-2 | Canvas-based rendering. Lower fidelity on high-DPI displays (iPad POS). SVG (recharts) renders crisply at all resolutions. |
| Impersonation | Custom JWT impersonation (raw Supabase JWT secret manipulation) | Fragile, bypasses Supabase Auth session management, breaks cookie refresh. Use `supabase.auth.admin.generateLink()` which is the official supported path. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `product_type TEXT CHECK (...)` | `is_service BOOLEAN` | Use boolean only if the type system will never expand beyond two values. TEXT enum is safer given the domain may add `digital`, `bundle`, or `rental` types later. |
| SECURITY DEFINER RPC for stocktake commit | Application-level loop of `adjustStock` calls | Never. Application-level loops are not atomic. A crash mid-loop leaves stock partially updated. The RPC is the only correct approach. |
| `stock_adjustments` dedicated table | JSONB audit column on `products` | Use JSONB only if you never need to query by adjustment type, product, or date range. Since the stocktake report filters by all three, a proper table with indexes is the correct choice. |
| `has_inventory` + `has_inventory_manual_override` columns on `store_plans` | Separate `inventory_subscriptions` table | The existing two-column pattern (feature flag + manual override) is proven and already integrated with the JWT claims hook. A separate table would require changes to `requireFeature()`, the auth hook, and the billing webhook. |
| recharts ^3.x | Victory, Nivo | recharts has the largest ecosystem, best React 19 compatibility, and lightest bundle for the chart types needed (area, bar). Victory and Nivo are strong but recharts is the de-facto standard in 2026 for React + Tailwind dashboards. |
| Stripe REST API for MRR | Stripe Sigma | Sigma requires a paid subscription and has data latency. REST API is real-time and sufficient for this scale (tens to low-hundreds of merchants). |
| `supabase.auth.admin.generateLink()` for impersonation | Custom JWT signing against Supabase secret | Supabase's `generateLink` is the supported, maintained path. Custom JWT signing against the Supabase secret is an anti-pattern that can break on Supabase updates. |
| Bespoke `can(role, action)` function | Casbin / Permit.io | Casbin adds config file complexity. Permit.io is an external service with its own auth and pricing. For three roles and seven action types, an in-code permission map is correct. |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @supabase/supabase-js ^2.x | PostgreSQL GENERATED ALWAYS AS columns | Supabase JS client returns computed columns (variance) as regular fields in select results. No special handling needed. |
| zod ^3.x | TypeScript 5.x | Compatible. `z.enum(['physical', 'service'])` works with `.default('physical')` chaining. |
| Next.js 16.2 | SECURITY DEFINER RPCs via admin client | Admin client (service role key) bypasses RLS — required for RPCs that write across tenant boundaries. Compatible pattern confirmed through 48 existing Server Actions. |
| recharts ^3.x | React 19 | React 19 support confirmed in recharts 3.x series. No peer dependency override or `--legacy-peer-deps` needed. |
| recharts ^3.x | Next.js App Router | Must be used in `'use client'` components only. Data fetching stays in Server Components. No SSR issues — recharts is client-only. |
| jose ^5.x | Impersonation cookie signing | Already installed for staff PIN sessions. Reuse the same `STAFF_JWT_SECRET` env var (or add `IMPERSONATION_JWT_SECRET` if secret separation is preferred). |

---

## Installation

```bash
# v4.0 Admin Platform — ONE new package
npm install recharts

# No other new packages for v4.0
# All other features use existing stack:
# - Staff roles: SQL migration + bespoke permission utility
# - Stripe analytics: existing stripe ^17.x REST API
# - Merchant impersonation: existing @supabase/supabase-js admin client + jose
# - Customer management: existing Supabase client + Server Actions
# - Store settings: existing Zod + react-hook-form

# New environment variables:
# (None new for v4.0 — all Stripe/Supabase credentials already present)
```

---

## Sources

- Codebase analysis: `supabase/migrations/001_initial_schema.sql` — staff table `role CHECK ('owner', 'staff')` confirmed, basis for 'manager' extension
- Codebase analysis: `supabase/migrations/020_super_admin_panel.sql` — `super_admin_actions` audit table confirmed, action CHECK constraint identified for extension
- Codebase analysis: `src/lib/requireFeature.ts` — dual-path JWT/DB feature gating pattern confirmed HIGH confidence
- Codebase analysis: `supabase/migrations/019_billing_claims.sql` — JWT claims injection pattern confirmed HIGH confidence
- recharts releases: https://github.com/recharts/recharts/releases — v3.8.1 confirmed latest stable (March 25, 2025)
- recharts React 19 issue: https://github.com/recharts/recharts/issues/4558 — React 19 support confirmed in 3.x series
- Supabase RBAC docs: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — Auth Hook pattern for custom role claims confirmed
- Supabase impersonation guide: https://catjam.fi/articles/supabase-admin-impersonation — `generateLink` magic link pattern documented
- Stripe subscriptions API: https://docs.stripe.com/api/subscriptions/list — `list()` with status filter confirmed for MRR calculation
- Stripe analytics dashboard: https://docs.stripe.com/billing/subscriptions/analytics — Sigma confirmed as separate paid product
- WebSearch: recharts vs Tremor vs Chart.js — recharts confirmed dominant for React + Tailwind admin dashboards in 2026

---
*Stack research for: NZPOS v4.0 Admin Platform (staff management, Stripe analytics, merchant impersonation, admin charts, customer management)*
*Researched: 2026-04-05*
