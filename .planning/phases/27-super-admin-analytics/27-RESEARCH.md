# Phase 27: Super-Admin Analytics - Research

**Researched:** 2026-04-06
**Domain:** SaaS MRR analytics, Stripe data materialisation, Vercel Cron, Recharts
**Confidence:** HIGH

## Summary

Phase 27 builds a materialised analytics page for the super-admin showing MRR, churn, and per-add-on revenue. The key design decision is that page data comes from a local Supabase snapshot table — not live Stripe API calls — which is already locked in the project state. A Vercel Cron route syncs the snapshot daily, and an on-demand refresh button (rate-limited to once per 5 minutes) allows the super-admin to force a refresh.

The codebase already has all the patterns needed: Vercel Cron is the established background job mechanism (three existing cron routes in vercel.json), Recharts is installed and SignupTrendChart shows the exact AreaChart pattern to clone for MRR trend, DashboardHeroCard is the stat card component used on both admin and super-admin dashboards. The phase is primarily additive — a new DB migration, a new cron route, new server actions, and new UI components.

The only significant technical investigation needed is the Stripe v21 subscription shape for the sync function — specifically how to extract price interval and amount from `items.data[0].price` and how to identify which add-on a subscription item represents via Price ID lookup against `PRICE_ID_MAP`. No toast library exists in the codebase; success/error feedback follows the inline state pattern established in Phase 26.

**Primary recommendation:** Use Vercel Cron (not Supabase pg_cron or Edge Functions) for the daily sync — it is already the established pattern. Add a fourth cron entry to vercel.json. Build the refresh as a server action that checks a metadata row timestamp before executing the same sync logic.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Analytics Page Layout**
- D-01: Top of page: row of DashboardHeroCard-style stat cards — Current MRR, Monthly Churn Count, Active Subscriptions. Matches existing admin dashboard and super-admin dashboard card patterns.
- D-02: Below stat cards: full-width MRR trend line chart (6-month history) using Recharts AreaChart. Matches SignupTrendChart pattern already in the super-admin dashboard.
- D-03: Below MRR chart: horizontal bar chart showing revenue breakdown by add-on (Xero, Inventory, Email Notifications, Custom Domain). Easy to compare, scales with any number of add-ons.
- D-04: Analytics page replaces the existing placeholder at `/super-admin/analytics`. Sidebar link already exists (Phase 26 D-11).

**Stripe Sync Job Design**
- D-05: Daily sync runs via Supabase pg_cron triggering a Supabase Edge Function that fetches subscription data from the Stripe API and writes to a local snapshot table. No external cron infra needed.
- D-06: Snapshot table stores subscription-level rows: tenant_id, stripe_subscription_id, status, plan_interval (month/year), amount, addon_type, current_period_start, current_period_end, cancelled_at, discount_amount, synced_at. Derived metrics (MRR, churn) computed at query time.
- D-07: Sync job scope is analytics-only. Tenant detail page continues using live Stripe API calls (Phase 26 pattern unchanged).

**MRR Calculation Rules**
- D-08: Annual plan normalisation: divide annual amount by 12. A $120/year plan contributes $10/month MRR. Industry-standard SaaS approach.
- D-09: Churn count: subscriptions with `cancelled_at` in the current calendar month. Includes both immediate and end-of-period cancellations.
- D-10: Trials excluded from MRR ($0 contribution). Subscriptions with coupons/discounts use the actual charged amount, not list price.

**Refresh & Staleness UX**
- D-11: Subtle "Last synced: X ago" timestamp near the top of the page, next to the refresh button. Always visible, unobtrusive.
- D-12: Refresh button triggers inline loading state — button shows spinner + "Syncing..." text, page data stays visible but dimmed. Success toast on completion. Data updates in place.
- D-13: Rate limiting: server-side via `last_synced_at` timestamp in a metadata table. Server action checks timestamp before running sync, returns error if <5 minutes. Button disabled client-side with countdown ("Available in X:XX") based on timestamp returned with page data.

### Claude's Discretion
- Exact stat card sizing, grid responsiveness, and breakpoints
- Recharts configuration details (colors, axes, tooltip format) — follow DESIGN.md palette and match SignupTrendChart style
- Horizontal bar chart library choice (Recharts BarChart or custom) — Recharts preferred for consistency
- Edge Function implementation details (Deno runtime, Stripe API pagination)
- Snapshot table name and exact column types
- pg_cron schedule time (e.g., 3am NZST)
- Success toast styling and duration
- Loading/dimming implementation approach
- MRR trend data point granularity (monthly buckets for 6-month chart)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SA-MRR-01 | Super-admin analytics page shows current MRR with correct normalisation of annual plans | Stripe item price interval + unit_amount; MRR = unit_amount/12 for annual plans; snapshot table query aggregation |
| SA-MRR-02 | Super-admin analytics page shows MRR trend over the last 6 months | Monthly-bucketed snapshot rows; SQL GROUP BY month; Recharts AreaChart (clone SignupTrendChart) |
| SA-MRR-03 | Super-admin analytics page shows churn count (cancelled subscriptions this month) | Snapshot rows with canceled_at in current calendar month; SQL WHERE canceled_at BETWEEN start_of_month AND now |
| SA-MRR-04 | Super-admin analytics page shows revenue breakdown by add-on | addon_type column in snapshot; SQL GROUP BY addon_type; Recharts BarChart horizontal |
| SA-MRR-05 | Stripe data is materialised via a sync job, not fetched live on page load | Vercel Cron route (established pattern) + platform_analytics_snapshots table + sync_metadata table |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack is non-negotiable:** Next.js 16.2 App Router, Supabase, Stripe, Tailwind CSS v4
- **No Prisma/ORM:** Use Supabase JS client directly
- **No Stripe Custom Elements / Terminal:** Not relevant here
- **No offline mode:** Not relevant here
- **Cron pattern:** Vercel Cron (Route Handler + vercel.json) — already established by 3 existing crons
- **Auth pattern:** Super-admin check via `user.app_metadata?.is_super_admin === true`
- **Server actions:** All actions must `'use server'` + `'server-only'` + Zod validate before touching DB
- **Recharts:** Already installed (^3.8.1) — use AreaChart for trend, BarChart for breakdown
- **date-fns:** Already installed (^4.1.0) — use for date formatting and bucket calculations
- **Stripe SDK:** v21.0.1 installed — confirmed field names below

## Critical Infrastructure Discovery

### Vercel Cron is the Established Pattern (NOT Supabase pg_cron)

**CONTEXT.md D-05 specifies "Supabase pg_cron triggering a Supabase Edge Function"** but this contradicts the actual codebase, which uses Vercel Cron for ALL background jobs:

```json
// vercel.json — 3 existing Vercel Cron jobs
{
  "crons": [
    { "path": "/api/cron/xero-sync",     "schedule": "0 13 * * *" },
    { "path": "/api/cron/expire-orders", "schedule": "0 14 * * *" },
    { "path": "/api/cron/daily-summary", "schedule": "0 19 * * *" }
  ]
}
```

The STATE.md blocker note reads: _"Verify Vercel Cron availability on free tier vs Supabase pg_cron before Phase 27 planning."_

**Resolution:** Vercel Hobby now supports 100 cron jobs per project (lifted Jan 2026), limited to once-per-day frequency. This is sufficient for a daily sync. The existing codebase pattern (CRON_SECRET Bearer token, Route Handler, `force-dynamic`) is the correct approach. Supabase pg_cron / Edge Functions would introduce a new pattern with no benefit. **Use Vercel Cron.**

**Verified:** Vercel changelog confirms "Cron jobs now support 100 per project on every plan" (January 2026).

### Stripe SDK v21 — Confirmed Field Names

The installed SDK is stripe@21.0.1. Key subscription fields confirmed from `node_modules/stripe/types/`:

- `subscription.status` — `'active' | 'canceled' | 'trialing' | 'past_due' | 'unpaid' | 'paused' | 'incomplete' | 'incomplete_expired'`
- `subscription.canceled_at` — `number | null` (Unix timestamp) — use this for churn detection
- `subscription.cancel_at` — `number | null` (scheduled future cancellation)
- `subscription.cancel_at_period_end` — `boolean`
- `subscription.trial_start` / `subscription.trial_end` — `number | null`
- `subscription.items` — `ApiList<Stripe.SubscriptionItem>`, each item has `.price`
- `subscriptionItem.price.unit_amount` — `number | null` (amount in cents)
- `subscriptionItem.price.recurring.interval` — `'day' | 'week' | 'month' | 'year'`
- `subscriptionItem.price.recurring.interval_count` — `number`
- `subscriptionItem.price.id` — use this to resolve addon_type via `PRICE_ID_MAP`
- `subscription.billing_cycle_anchor` — `number` — use for period reference (confirmed in Phase 26)
- **`current_period_start` / `current_period_end` do NOT exist** in Stripe v21 Subscription type (confirmed: no grep match in types file)

**MRR normalisation formula (verified against D-08):**
- monthly plan: `unit_amount / 100` (convert cents to dollars)
- annual plan: `unit_amount / 100 / 12`
- trial (status === 'trialing'): `0` (D-10)

### Addon Type Resolution in Sync Function

The sync function must map Stripe Price IDs to addon_type labels. The `PRICE_ID_MAP` in `src/config/addons.ts` maps feature names to Price IDs from env vars. The reverse map `PRICE_TO_FEATURE` maps Price ID → feature column name.

**Pattern for the sync function:**
```typescript
// src/config/addons.ts already exports PRICE_TO_FEATURE
import { PRICE_TO_FEATURE } from '@/config/addons.ts'

// In sync: for each subscription item
const priceId = item.price.id
const featureColumn = PRICE_TO_FEATURE[priceId]
// featureColumn is 'has_xero' | 'has_email_notifications' | 'has_custom_domain' | 'has_inventory'
// Strip 'has_' prefix for addon_type: 'xero' | 'email_notifications' | 'custom_domain' | 'inventory'
const addonType = featureColumn?.replace('has_', '') ?? 'unknown'
```

### No Toast Library — Use Inline State Pattern

No toast/notification library is installed (no sonner, react-hot-toast, etc. in package.json). The codebase uses inline error state (`useState<string | null>(null)`). For D-12's "success toast on completion", the planner should use an inline success banner/message within the page, not a floating toast — consistent with the existing DisableAccountModal and SuspendModal patterns.

### Rate Limiting Architecture (D-13)

The metadata table approach requires a new table or an existing table to store `last_synced_at`. Options:
1. **New `analytics_sync_metadata` table** — single row with `last_synced_at TIMESTAMPTZ`. Simplest. Upsert on every sync.
2. **New column on existing table** — no suitable existing table.

Option 1 is recommended. The server action for on-demand refresh:
1. Reads `last_synced_at` from metadata table
2. If `< 5 minutes ago`, returns `{ error: 'Rate limited', retryAfter: timestamp }`
3. If `>= 5 minutes ago`, runs sync, updates `last_synced_at`
4. Returns `{ success: true, syncedAt: timestamp }`

Page data must include `last_synced_at` for the client countdown timer (D-13).

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.1 | AreaChart (MRR trend), BarChart (add-on breakdown) | Already installed, SignupTrendChart uses it |
| @supabase/supabase-js | ^2.101.1 | Snapshot table reads | Already installed |
| stripe | 21.0.1 | Stripe subscription list for sync | Already installed |
| date-fns | ^4.1.0 | Date formatting, month bucketing | Already installed |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Server action input validation | Refresh action input |
| server-only | latest | Prevent server code on client | Cron route + server actions |
| date-fns-tz | ^3.2.0 | NZ timezone for cron schedule | Display local time in "Last synced" |

### No New Dependencies Required
This phase adds zero new npm packages. All needed libraries are installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/cron/
│   │   └── stripe-snapshot-sync/    # New Vercel Cron route
│   │       └── route.ts
│   └── super-admin/analytics/
│       └── page.tsx                  # Replace placeholder
├── actions/super-admin/
│   └── triggerStripeSync.ts          # On-demand refresh server action
├── components/super-admin/
│   ├── MrrTrendChart.tsx             # Clone of SignupTrendChart (AreaChart)
│   └── AddonRevenueChart.tsx         # New (BarChart horizontal)
└── lib/stripe/
│   └── syncStripeSnapshot.ts         # Shared sync logic (cron + action both call this)
supabase/migrations/
└── 030_analytics_snapshot.sql        # New migration
vercel.json                            # Add 4th cron entry
```

### Pattern 1: Vercel Cron Route (established)

**What:** GET handler in `/api/cron/stripe-snapshot-sync/route.ts` authenticated by CRON_SECRET Bearer token. Calls shared sync function.

**Example (follows xero-sync pattern):**
```typescript
// src/app/api/cron/stripe-snapshot-sync/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { syncStripeSnapshot } from '@/lib/stripe/syncStripeSnapshot'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Hobby plan limit: 60s

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  const result = await syncStripeSnapshot()
  return Response.json(result)
}
```

**vercel.json addition:**
```json
{ "path": "/api/cron/stripe-snapshot-sync", "schedule": "0 14 * * *" }
```
(14:00 UTC = 2am-3am NZT depending on DST — low-traffic window)

### Pattern 2: Snapshot Table Design

**Migration:** `030_analytics_snapshot.sql`

```sql
-- platform_analytics_snapshots: one row per subscription item
CREATE TABLE public.platform_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.stores(id),
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_interval TEXT NOT NULL CHECK (plan_interval IN ('month', 'year')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  mrr_cents INTEGER NOT NULL DEFAULT 0, -- normalised: amount/12 for annual
  addon_type TEXT, -- 'xero' | 'email_notifications' | 'custom_domain' | 'inventory' | null
  canceled_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- analytics_sync_metadata: single-row rate limit tracker
CREATE TABLE public.analytics_sync_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1, -- always 1
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01'::TIMESTAMPTZ
);

INSERT INTO public.analytics_sync_metadata (id, last_synced_at)
VALUES (1, '1970-01-01'::TIMESTAMPTZ)
ON CONFLICT DO NOTHING;

-- RLS: super-admin read only (service role writes)
ALTER TABLE public.platform_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_read_super_admin" ON public.platform_analytics_snapshots
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

CREATE POLICY "sync_metadata_read_super_admin" ON public.analytics_sync_metadata
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );
```

**Note:** No UPDATE policy — all writes via admin client (service role). Follows `super_admin_actions` RLS pattern from Phase 16.

### Pattern 3: Sync Function (shared logic)

```typescript
// src/lib/stripe/syncStripeSnapshot.ts
// Called by cron route AND on-demand server action
import 'server-only'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PRICE_TO_FEATURE } from '@/config/addons'

export async function syncStripeSnapshot(): Promise<{ synced: number; error?: string }> {
  const admin = createSupabaseAdminClient()

  // 1. Fetch all stores with a stripe_customer_id
  const { data: stores } = await admin
    .from('stores')
    .select('id, stripe_customer_id')
    .not('stripe_customer_id', 'is', null)

  if (!stores?.length) return { synced: 0 }

  // 2. For each store, list all subscriptions (paginate if >100)
  const rows = []
  for (const store of stores) {
    const subs = await stripe.subscriptions.list({
      customer: store.stripe_customer_id,
      status: 'all',
      limit: 100,
      expand: ['data.items.data.price'], // ensure price fields expanded
    })
    for (const sub of subs.data) {
      for (const item of sub.items.data) {
        const price = item.price
        const interval = price.recurring?.interval ?? 'month'
        const amountCents = price.unit_amount ?? 0
        const isAnnual = interval === 'year'
        const mrrCents = sub.status === 'trialing' ? 0 :
          isAnnual ? Math.round(amountCents / 12) : amountCents

        const featureColumn = PRICE_TO_FEATURE[price.id]
        const addonType = featureColumn ? featureColumn.replace('has_', '') : null

        rows.push({
          tenant_id: store.id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: store.stripe_customer_id,
          status: sub.status,
          plan_interval: interval,
          amount_cents: amountCents,
          mrr_cents: mrrCents,
          addon_type: addonType,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          synced_at: new Date().toISOString(),
        })
      }
    }
  }

  // 3. Truncate + insert (full snapshot replacement, not incremental)
  await admin.from('platform_analytics_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (rows.length > 0) {
    await admin.from('platform_analytics_snapshots').insert(rows)
  }

  // 4. Update metadata
  await admin.from('analytics_sync_metadata').upsert({ id: 1, last_synced_at: new Date().toISOString() })

  return { synced: rows.length }
}
```

**Important:** `expand: ['data.items.data.price']` is required on the subscription list call — Stripe returns nested objects as IDs by default and expanded objects only when explicitly requested.

### Pattern 4: MRR Analytics Queries (server component)

```typescript
// In the analytics page server component:
const admin = createSupabaseAdminClient()

// Current MRR (sum of mrr_cents for active/past_due subscriptions)
const { data: mrrData } = await admin
  .from('platform_analytics_snapshots')
  .select('mrr_cents')
  .in('status', ['active', 'past_due', 'trialing'])

const currentMrrCents = (mrrData ?? []).reduce((sum, r) => sum + r.mrr_cents, 0)

// Churn this month (subscriptions canceled in current calendar month)
const startOfMonth = new Date()
startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
const { count: churnCount } = await admin
  .from('platform_analytics_snapshots')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'canceled')
  .gte('canceled_at', startOfMonth.toISOString())

// Revenue by addon type
const { data: addonData } = await admin
  .from('platform_analytics_snapshots')
  .select('addon_type, mrr_cents')
  .in('status', ['active', 'past_due'])
  .not('addon_type', 'is', null)
```

### Pattern 5: On-Demand Refresh Server Action

```typescript
// src/actions/super-admin/triggerStripeSync.ts
'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncStripeSnapshot } from '@/lib/stripe/syncStripeSnapshot'
import { revalidatePath } from 'next/cache'

const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export async function triggerStripeSync(): Promise<
  { success: true; syncedAt: string } | { error: string; retryAfter?: string }
> {
  // 1. Auth check
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.is_super_admin !== true) {
    return { error: 'Unauthorized' }
  }

  // 2. Rate limit check
  const admin = createSupabaseAdminClient()
  const { data: meta } = await admin
    .from('analytics_sync_metadata')
    .select('last_synced_at')
    .eq('id', 1)
    .single()

  if (meta?.last_synced_at) {
    const lastSync = new Date(meta.last_synced_at).getTime()
    const elapsed = Date.now() - lastSync
    if (elapsed < RATE_LIMIT_MS) {
      const retryAfter = new Date(lastSync + RATE_LIMIT_MS).toISOString()
      return { error: 'Rate limited — sync already ran recently', retryAfter }
    }
  }

  // 3. Run sync
  const result = await syncStripeSnapshot()
  if (result.error) return { error: result.error }

  revalidatePath('/super-admin/analytics')
  return { success: true, syncedAt: new Date().toISOString() }
}
```

### Pattern 6: MRR Trend (6-month buckets)

MRR trend requires snapshot rows to have a temporal dimension. Options:

**Option A — Append-only historical snapshots (recommended):** Add a `snapshot_month TEXT` column (e.g. `'2026-04'`). The cron job inserts a row with the current month tag rather than replacing all rows. Query: `SELECT snapshot_month, SUM(mrr_cents) FROM platform_analytics_snapshots WHERE status IN ('active', 'past_due') GROUP BY snapshot_month ORDER BY snapshot_month DESC LIMIT 6`.

**Option B — Point-in-time snapshots only (simpler but incomplete):** Can only show the current MRR as a single point. Cannot show 6-month trend without historical data.

**Resolution:** Option A is required by SA-MRR-02. The snapshot table needs a `snapshot_month` column. The truncate+insert pattern becomes "delete WHERE snapshot_month = current_month, then insert". Historical months are preserved. The sync function writes `snapshot_month = format(new Date(), 'yyyy-MM')`.

**Updated table design — add to migration:**
```sql
ALTER TABLE public.platform_analytics_snapshots
  ADD COLUMN snapshot_month TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM');
```

### Pattern 7: Recharts BarChart (horizontal)

Based on SignupTrendChart pattern. Recharts BarChart with `layout="vertical"` for horizontal bars:

```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// data: [{ addon: 'xero', mrr: 1200 }, ...]
<ResponsiveContainer width="100%" height={180}>
  <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
    <XAxis type="number" tickFormatter={(v) => `$${v}`} ... />
    <YAxis type="category" dataKey="addon" ... />
    <Bar dataKey="mrr" fill="#E67E22" radius={[0, 4, 4, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Anti-Patterns to Avoid

- **Live Stripe API on page load:** Explicitly forbidden by D-05/SA-MRR-05. Even one `stripe.subscriptions.list()` call in the page server component is wrong.
- **Supabase Edge Functions:** The codebase has no existing Edge Functions and uses Vercel Cron for all background jobs. Introducing pg_cron + Edge Functions would be a new pattern with no benefit.
- **Incremental updates to snapshot:** Keep it simple — full truncate+insert per month. Avoid partial update logic that could corrupt MRR numbers.
- **Storing MRR as a computed value in the DB:** Compute MRR at query time from `mrr_cents` column. Avoids stale computed fields.
- **Missing `expand` on Stripe subscription list:** Without `expand: ['data.items.data.price']`, Stripe returns price as a string ID, not an object. The sync will fail to read `unit_amount` or `recurring.interval`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Custom NZD formatter | `(cents / 100).toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })` | Built into JS Intl |
| Date bucketing | Custom month aggregation | `format(date, 'yyyy-MM')` from date-fns | Handles edge cases |
| Cron scheduling | pg_cron SQL | vercel.json cron entry | Already established pattern in codebase |
| Rate limiting | Redis / complex store | Single DB row timestamp check | Sufficient for once-per-5-minute use case |
| Stripe pagination | Manual cursor loop | `stripe.subscriptions.list` with `autoPagingToArray` or check `has_more` | Avoid missing subscriptions on large datasets |

**Key insight:** The sync function is the most complex piece. Keep it simple: full replacement per month, computed MRR at insert time, single-tenant loop. No incremental logic needed at this scale.

## Common Pitfalls

### Pitfall 1: Missing Stripe Price Expansion
**What goes wrong:** `item.price.unit_amount` is `null` and `item.price.recurring` is `null` — all MRR values are 0.
**Why it happens:** Stripe's API returns nested objects as ID strings unless explicitly expanded. The `price` field on a SubscriptionItem is not auto-expanded.
**How to avoid:** Always pass `expand: ['data.items.data.price']` to `stripe.subscriptions.list()`.
**Warning signs:** All `mrr_cents` values are 0 in the snapshot table after sync.

### Pitfall 2: Stripe v21 — No current_period_start/end
**What goes wrong:** TypeScript compile error or runtime undefined when accessing `sub.current_period_start`.
**Why it happens:** These fields were removed in Stripe SDK v17+ (confirmed in Phase 26 research). The Stripe v21 Subscription type does not include them.
**How to avoid:** Use `billing_cycle_anchor` for period reference. For sync purposes, `canceled_at` and `status` are the relevant fields.
**Warning signs:** TypeScript error `Property 'current_period_start' does not exist on type 'Subscription'`.

### Pitfall 3: MRR Trend Requires Historical Data
**What goes wrong:** After Phase 27 ships, the analytics page shows only 1 month of trend data (no history). The 6-month chart looks empty or shows a flat line.
**Why it happens:** The snapshot table only has data from the first sync. Historical months were never captured.
**How to avoid:** Accept this as a known limitation — document that trend history accumulates over time. Alternatively, in the initial sync, run 6 historical iterations for months that don't yet have data. The simpler path is to accept single-month start and let history accumulate naturally.
**Warning signs:** Chart shows only the current month on initial deploy.

### Pitfall 4: Delete Scope in Truncate Pattern
**What goes wrong:** `DELETE FROM platform_analytics_snapshots` (no WHERE clause) deletes ALL months, not just the current month being refreshed.
**Why it happens:** Simple DELETE without month filter.
**How to avoid:** Always scope the delete to the current month: `.delete().eq('snapshot_month', currentMonth)` before reinserting.
**Warning signs:** 6-month chart loses previous months' data after every sync.

### Pitfall 5: Rate Limit Bypass via Multiple Browser Tabs
**What goes wrong:** Two super-admins (or same admin in two tabs) both click Refresh within 5 seconds of each other — both requests pass the rate limit check before either updates `last_synced_at`.
**Why it happens:** Read-check-write race condition in the rate limit logic.
**How to avoid:** Use a Supabase RPC with SERIALIZABLE transaction, or accept this edge case (two syncs within seconds is harmless — the second just overwrites with nearly identical data). For this use case, the simple race condition is acceptable.
**Warning signs:** Double sync calls in cron logs.

### Pitfall 6: Cron maxDuration on Vercel Hobby
**What goes wrong:** Cron route times out on Hobby tier.
**Why it happens:** Vercel Hobby plan limits serverless function duration to 60 seconds (not 300 like Pro). The xero-sync route has `maxDuration = 300` with a comment noting this.
**How to avoid:** Set `maxDuration = 60` on the stripe-snapshot-sync route. With small tenant counts (early platform), Stripe pagination should complete within 10-20 seconds. If tenant count grows, the route will need to be moved to Pro tier.
**Warning signs:** Vercel function timeout errors in cron execution logs.

## Code Examples

### MRR Calculation (unit-testable pure function)
```typescript
// Source: D-08 from CONTEXT.md
export function normaliseToDailyMRRCents(amountCents: number, interval: 'month' | 'year'): number {
  if (interval === 'year') return Math.round(amountCents / 12)
  return amountCents
}

// Usage:
// $120/year plan = normaliseToDailyMRRCents(12000, 'year') = 1000 cents = $10/month MRR
// $15/month plan = normaliseToDailyMRRCents(1500, 'month') = 1500 cents = $15/month MRR
```

### Inline Success/Error State (no toast library)
```typescript
// Pattern from DisableAccountModal / PlanOverrideRow
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
const [errorMsg, setErrorMsg] = useState<string | null>(null)

async function handleRefresh() {
  setStatus('loading')
  const result = await triggerStripeSync()
  if ('error' in result) {
    setStatus('error')
    setErrorMsg(result.error)
  } else {
    setStatus('success')
    setLastSynced(result.syncedAt)
    // Reset to idle after 3s
    setTimeout(() => setStatus('idle'), 3000)
  }
}
```

### NZD Currency Display
```typescript
// Source: JS Intl built-in
function formatNZD(cents: number): string {
  return (cents / 100).toLocaleString('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
// formatNZD(150000) → '$1,500'
```

### Month Bucket Query
```typescript
import { format, startOfMonth, subMonths } from 'date-fns'

// Build last 6 month labels for chart X-axis
const months = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), 5 - i)
  return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') }
})
// months[0].key = '2025-10', months[5].key = '2026-03'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pg_cron + Edge Function (D-05) | Vercel Cron Route Handler | Existing codebase pattern pre-dates phase | Same daily granularity, no new infra |
| Stripe current_period_start/end | billing_cycle_anchor (Phase 26 discovery) | Stripe SDK v17+ | Don't use period fields in snapshot |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vercel Cron | Daily sync job | ✓ | 100/project (Jan 2026) | — |
| Stripe API | Sync function | ✓ | v21.0.1 installed | — |
| Supabase admin client | Snapshot writes | ✓ | ^2.101.1 | — |
| recharts | Charts | ✓ | ^3.8.1 installed | — |
| date-fns | Date bucketing | ✓ | ^4.1.0 installed | — |
| CRON_SECRET env var | Cron auth | ✓ (already in use) | — | — |

**No missing dependencies.** All required libraries and infrastructure are available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `vitest run --reporter=verbose` |
| Full suite command | `vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SA-MRR-01 | `normaliseToDailyMRRCents` correctly divides annual by 12, returns monthly as-is, returns 0 for trialing | unit | `vitest run src/lib/stripe/syncStripeSnapshot.test.ts -t "normaliseToDailyMRRCents"` | ❌ Wave 0 |
| SA-MRR-01 | `syncStripeSnapshot` correctly populates `mrr_cents` from Stripe mock | unit | `vitest run src/lib/stripe/syncStripeSnapshot.test.ts` | ❌ Wave 0 |
| SA-MRR-02 | Month-bucket query logic returns 6 months of data | unit | `vitest run src/lib/stripe/syncStripeSnapshot.test.ts -t "month bucket"` | ❌ Wave 0 |
| SA-MRR-03 | Churn count uses `canceled_at` in current calendar month | unit | `vitest run src/lib/stripe/syncStripeSnapshot.test.ts -t "churn"` | ❌ Wave 0 |
| SA-MRR-04 | `addon_type` resolved from Price ID via PRICE_TO_FEATURE | unit | `vitest run src/lib/stripe/syncStripeSnapshot.test.ts -t "addon"` | ❌ Wave 0 |
| SA-MRR-05 | Cron route returns 401 without CRON_SECRET | unit | `vitest run src/app/api/cron/stripe-snapshot-sync/route.test.ts` | ❌ Wave 0 |
| SA-MRR-05 | `triggerStripeSync` returns rate-limit error when called within 5 minutes | unit | `vitest run src/actions/super-admin/triggerStripeSync.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run src/lib/stripe/syncStripeSnapshot.test.ts`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/stripe/syncStripeSnapshot.test.ts` — covers SA-MRR-01, SA-MRR-02, SA-MRR-03, SA-MRR-04
- [ ] `src/app/api/cron/stripe-snapshot-sync/route.test.ts` — covers SA-MRR-05 (cron auth)
- [ ] `src/actions/super-admin/triggerStripeSync.test.ts` — covers SA-MRR-05 (rate limit)

Follow the `daily-summary.test.ts` pattern for mocking Supabase admin client and Stripe.

## Open Questions

1. **MRR trend history on initial deploy**
   - What we know: First sync populates current month only. 6-month chart will have 1 data point.
   - What's unclear: Should Wave 0 include a backfill script? Or document that the chart fills over 6 months?
   - Recommendation: Accept as known limitation. Document in analytics page with a "Data available from [sync date]" note. No backfill needed for v4.0.

2. **Stripe subscription `expand` depth on large tenant counts**
   - What we know: `stripe.subscriptions.list` with `expand: ['data.items.data.price']` is standard.
   - What's unclear: At what tenant count does the sync approach 60 second Hobby limit?
   - Recommendation: For v4.0 scale (estimated <50 tenants), no concern. Add a note in the sync function.

3. **Discount application for MRR calculation (D-10)**
   - What we know: D-10 says "subscriptions with coupons/discounts use the actual charged amount, not list price". `subscription.discounts` is an array of strings or Stripe.Discount objects.
   - What's unclear: Computing the discounted amount from a % discount requires `unit_amount * (1 - discount_percent/100)`. This adds complexity.
   - Recommendation: For v4.0, use `unit_amount` directly (list price). Document this simplification. Discount handling can be added in v4.1 when actual discount usage is observed. If the planner disagrees, the discount field is `subscription.discounts` and requires expand to get the actual percent.

## Sources

### Primary (HIGH confidence)
- Stripe SDK v21 types — `/node_modules/stripe/types/Subscriptions.d.ts`, `/Prices.d.ts`, `/SubscriptionItems.d.ts` — field names confirmed directly from installed SDK
- `src/app/api/cron/xero-sync/route.ts` — Vercel Cron pattern (CRON_SECRET, maxDuration, force-dynamic)
- `vercel.json` — 3 existing crons, Hobby plan confirmed compatible
- `src/components/super-admin/SignupTrendChart.tsx` — Recharts AreaChart pattern with gradient
- `src/components/admin/dashboard/DashboardHeroCard.tsx` — Stat card component API
- `src/config/addons.ts` — PRICE_TO_FEATURE map for addon_type resolution
- `src/app/super-admin/page.tsx` — Super-admin dashboard data fetching pattern
- Supabase migrations 020-029 — RLS pattern for super-admin-only tables

### Secondary (MEDIUM confidence)
- Vercel changelog "Cron jobs now support 100 per project on every plan" (Jan 2026) — Hobby cron limit confirmed via WebSearch

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are installed, versions confirmed from package.json
- Architecture: HIGH — Vercel Cron pattern copied directly from existing cron routes; Stripe fields confirmed from SDK types
- Pitfalls: HIGH — most pitfalls confirmed from Phase 26 STATE.md notes + direct SDK inspection
- MRR trend history: MEDIUM — known limitation acknowledged, recommendation is pragmatic

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack, Stripe API version won't change)
