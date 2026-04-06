---
phase: 27-super-admin-analytics
verified: 2026-04-06T14:17:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
---

# Phase 27: Super-Admin Analytics Verification Report

**Phase Goal:** Stripe snapshot sync + analytics UI — daily cron syncs subscription data to local table; super-admin analytics page shows MRR, churn, subscription counts, trend charts, and add-on revenue breakdown from snapshot data (not live Stripe API).
**Verified:** 2026-04-06T14:17:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Snapshot table exists with subscription-level rows including mrr_cents, addon_type, canceled_at, current_period_start, current_period_end, discount_amount, and snapshot_month | VERIFIED | `030_analytics_snapshot.sql` creates `platform_analytics_snapshots` with all columns confirmed present |
| 2 | Cron route authenticates via CRON_SECRET and calls the shared sync function daily | VERIFIED | `route.ts` checks `'Bearer ' + process.env.CRON_SECRET`, imports and calls `syncStripeSnapshot()`, `vercel.json` has `"0 15 * * *"` entry |
| 3 | On-demand refresh server action enforces 5-minute rate limit via metadata table timestamp | VERIFIED | `triggerStripeSync.ts` reads `analytics_sync_metadata.last_synced_at`, computes elapsed vs `RATE_LIMIT_MS = 5 * 60 * 1000`, returns `{ error: 'Rate limited', retryAfter }` |
| 4 | Annual plan MRR is normalised by dividing amount_cents by 12 | VERIFIED | `normaliseMrrCents` returns `Math.round(amountCents / 12)` for `interval === 'year'`; 18 unit tests pass covering this case |
| 5 | Trialing subscriptions contribute $0 MRR | VERIFIED | `syncStripeSnapshot.ts` line 87: `sub.status === 'trialing' ? 0 : normaliseMrrCents(amountCents, interval)` |
| 6 | Sync deletes only current month rows before reinserting (preserves historical months) | VERIFIED | `.delete().eq('snapshot_month', currentMonth)` — scoped delete confirmed; unit test "deletes only current month rows" passes |
| 7 | Analytics page shows current MRR stat card with annual plans normalised to monthly | VERIFIED | `page.tsx` sums `mrr_cents` (pre-normalised at sync time) from snapshot table; `AnalyticsContent` renders `DashboardHeroCard` with label "Current MRR" |
| 8 | Analytics page shows monthly churn count stat card | VERIFIED | `page.tsx` queries `status = 'canceled'` rows; `AnalyticsContent` renders card with label "Monthly Churn" |
| 9 | Analytics page shows active subscriptions count stat card | VERIFIED | `page.tsx` queries `status IN ('active', 'past_due', 'trialing')`; `AnalyticsContent` renders card with label "Active Subscriptions" |
| 10 | MRR trend chart renders 6 months of data as an AreaChart with amber accent | VERIFIED | `MrrTrendChart.tsx` uses `AreaChart`, amber stroke `#E67E22`, gradient ID `mrrGradient`, height 240px |
| 11 | Revenue by add-on chart renders horizontal bars with navy fill | VERIFIED | `AddonRevenueChart.tsx` uses `layout="vertical"` BarChart, `fill="#1E293B"` (navy), `width={140}` for Y axis |
| 12 | Last synced timestamp and refresh button are visible at top of page | VERIFIED | `AnalyticsSyncControls` renders `lastSyncedText` + button in heading row; `AnalyticsContent` places controls outside dimmed wrapper |
| 13 | Refresh button shows spinner during sync, countdown during cooldown | VERIFIED | `AnalyticsSyncControls` has loading state with `animate-spin` SVG + "Syncing...", cooldown state with `formatCountdown(retrySeconds)` + "Available in X:XX" |
| 14 | Page data comes from snapshot table, not live Stripe API | VERIFIED | `page.tsx` imports only `createSupabaseAdminClient` and `date-fns`; no `stripe` import; all queries target `platform_analytics_snapshots`; confirmed no `stripe.subscriptions` call |
| 15 | Page content dims with transition-opacity during sync refresh | VERIFIED | `AnalyticsContent.tsx` line 63: `className="transition-opacity duration-150 ${isSyncing ? 'opacity-50' : 'opacity-100'}"` |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/030_analytics_snapshot.sql` | DB tables + RLS | VERIFIED | Both tables created with all D-06 columns, `snapshots_read_super_admin` + `sync_metadata_read_super_admin` RLS policies present |
| `src/lib/stripe/syncStripeSnapshot.ts` | Shared sync logic | VERIFIED | Exports `normaliseMrrCents` (pure) and `syncStripeSnapshot` (async), `server-only` guard, 169 lines |
| `src/lib/stripe/syncStripeSnapshot.test.ts` | Unit tests | VERIFIED | 18 tests, all passing — covers MRR normalisation, trialing exclusion, addon resolution, period timestamp conversion, discount extraction, month-scoped delete |
| `src/app/api/cron/stripe-snapshot-sync/route.ts` | Cron GET handler | VERIFIED | `dynamic = 'force-dynamic'`, `maxDuration = 60`, CRON_SECRET auth, calls `syncStripeSnapshot()` |
| `src/actions/super-admin/triggerStripeSync.ts` | On-demand sync action | VERIFIED | `'use server'`, `server-only`, `is_super_admin` auth check, `RATE_LIMIT_MS` rate limit, `revalidatePath('/super-admin/analytics')`, returns `retryAfter` |
| `vercel.json` | 4th cron entry | VERIFIED | `/api/cron/stripe-snapshot-sync` with schedule `"0 15 * * *"` as entry 4 |
| `src/app/super-admin/analytics/page.tsx` | Full analytics page (was placeholder) | VERIFIED | 137 lines, `force-dynamic`, all queries from `platform_analytics_snapshots`, `Promise.all` parallel fetch, passes data to `AnalyticsContent` |
| `src/components/super-admin/MrrTrendChart.tsx` | Recharts AreaChart | VERIFIED | `'use client'`, amber `#E67E22` stroke, `mrrGradient` ID, `height={240}`, empty state message |
| `src/components/super-admin/AddonRevenueChart.tsx` | Recharts horizontal BarChart | VERIFIED | `'use client'`, `layout="vertical"`, navy `#1E293B` fill, `width={140}`, dynamic height, empty state |
| `src/components/super-admin/AnalyticsSyncControls.tsx` | Sync controls component | VERIFIED | `'use client'`, `triggerStripeSync` import, `aria-busy`, `role="status"`, `role="alert"`, `formatDistanceToNow`, countdown timer |
| `src/components/super-admin/AnalyticsContent.tsx` | Client wrapper for dimming | VERIFIED | `'use client'`, `transition-opacity`, `opacity-50`, `DashboardHeroCard`, `MrrTrendChart`, `AddonRevenueChart`, `AnalyticsSyncControls`, all three stat card labels |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `stripe-snapshot-sync/route.ts` | `syncStripeSnapshot.ts` | `import { syncStripeSnapshot }` | WIRED | Import + call on line 18 confirmed |
| `triggerStripeSync.ts` | `syncStripeSnapshot.ts` | `import { syncStripeSnapshot }` | WIRED | Import on line 5, call on line 42 confirmed |
| `syncStripeSnapshot.ts` | `src/config/addons.ts` | `PRICE_TO_FEATURE` import | WIRED | Import line 5, used line 90 for addon resolution |
| `analytics/page.tsx` | `platform_analytics_snapshots` | Supabase admin client queries | WIRED | 4 queries target this table; no Stripe SDK import found |
| `AnalyticsSyncControls.tsx` | `triggerStripeSync.ts` | `import { triggerStripeSync }` | WIRED | Import line 5, called in `handleRefresh()` |
| `analytics/page.tsx` | `DashboardHeroCard` | import + JSX usage | WIRED | `AnalyticsContent` imports and renders 3 `DashboardHeroCard` instances |
| `AnalyticsContent.tsx` | `AnalyticsSyncControls` | renders in heading row | WIRED | `<AnalyticsSyncControls>` rendered outside dimmed div |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `analytics/page.tsx` | `mrrRows`, `churnResult.count`, `activeResult.count` | Supabase admin client `.from('platform_analytics_snapshots')` queries | Yes — DB queries, not static returns | FLOWING |
| `analytics/page.tsx` | `mrrTrendData` | 6 parallel Supabase queries per `monthKeys` array | Yes — one query per month bucket | FLOWING |
| `analytics/page.tsx` | `addonRevenueData` | `platform_analytics_snapshots` filtered by `addon_type IS NOT NULL`, grouped in JS | Yes — DB rows, JS aggregation | FLOWING |
| `analytics/page.tsx` | `lastSyncedAt` | `analytics_sync_metadata` `.select('last_synced_at').eq('id', 1).single()` | Yes — single-row metadata table | FLOWING |
| `AnalyticsSyncControls.tsx` | `retrySeconds` | Computed from `lastSyncedAt` prop at mount; updated by countdown interval | Yes — derived from real server timestamp | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| `normaliseMrrCents` pure function — monthly pass-through, annual /12 rounded, trialing $0 | 18/18 tests pass | PASS |
| Sync function scopes deletes to current month | Unit test "deletes only current month rows" passes | PASS |
| All 4 commits documented in SUMMARYs exist in git history | `451c98b`, `aa0bfe3`, `f58a5bd`, `72d77a2` all found | PASS |
| TypeScript in phase 27 files | 0 errors in phase 27 files (3 pre-existing errors in unrelated files) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SA-MRR-01 | 27-01, 27-02 | Super-admin analytics page shows current MRR with correct normalisation of annual plans | SATISFIED | `page.tsx` sums `mrr_cents` (pre-normalised at sync by `normaliseMrrCents`); "Current MRR" card confirmed in `AnalyticsContent` |
| SA-MRR-02 | 27-01, 27-02 | Super-admin analytics page shows MRR trend over the last 6 months | SATISFIED | `MrrTrendChart` receives 6-month `mrrTrendData` computed via `monthKeys` array in `page.tsx` |
| SA-MRR-03 | 27-01, 27-02 | Super-admin analytics page shows churn count (cancelled subscriptions this month) | SATISFIED | `page.tsx` queries `status = 'canceled'` + `canceled_at >= start of month`; "Monthly Churn" card rendered |
| SA-MRR-04 | 27-01, 27-02 | Super-admin analytics page shows revenue breakdown by add-on | SATISFIED | `AddonRevenueChart` receives `addonRevenueData` aggregated from snapshot rows; horizontal bars confirmed |
| SA-MRR-05 | 27-01, 27-02 | Stripe data is materialised via a sync job, not fetched live on page load | SATISFIED | `page.tsx` has zero `stripe.` imports; all data from `platform_analytics_snapshots`; cron + server action populate the table |

All 5 requirements: SATISFIED. No orphaned requirements.

---

### Anti-Patterns Found

None. No TODO/FIXME markers, no placeholder returns, no hardcoded empty arrays passed as rendered data, no empty handler stubs found in any phase 27 file.

---

### Human Verification Required

#### 1. Full interactive flow — refresh button cycle

**Test:** Navigate to `/super-admin/analytics` as a super-admin user. Click "Refresh Data". Observe spinner + page content dims. Observe success banner appears and auto-dismisses after ~4 seconds. Click again immediately — confirm button shows "Available in X:XX" countdown.
**Expected:** Spinner visible during sync, data section opacity drops to 50%, success banner appears with green border, auto-dismisses, button enters cooldown state with countdown.
**Why human:** Real-time UI state transitions, opacity animation, and countdown timer are not verifiable through static code analysis.

#### 2. Empty state display when no snapshot data exists

**Test:** Before any sync has run (or against a test store with no Stripe customer), load `/super-admin/analytics`.
**Expected:** Both charts show their empty state messages ("No MRR data yet. Run a sync to populate." and "No revenue data yet. Run a sync to populate."). Stat cards show $0 / 0 values gracefully.
**Why human:** Requires a database state with zero snapshot rows, which cannot be induced programmatically in this verification context.

#### 3. Chart visual rendering — colors and layout

**Test:** After a sync produces data, verify MRR chart uses amber area fill/stroke and add-on chart uses navy horizontal bars.
**Expected:** Amber (`#E67E22`) gradient visible under MRR trend line. Navy (`#1E293B`) bars in horizontal layout for add-on revenue.
**Why human:** Recharts rendering is browser-side; colors only verifiable visually.

---

### Gaps Summary

No gaps. All must-haves from both plans are verified at all four levels (exists, substantive, wired, data-flowing). Test suite is clean (18/18 passing). All 5 requirements (SA-MRR-01 through SA-MRR-05) are satisfied with direct code evidence.

---

_Verified: 2026-04-06T14:17:00Z_
_Verifier: Claude (gsd-verifier)_
