# Phase 27: Super-Admin Analytics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 27-super-admin-analytics
**Areas discussed:** Analytics page layout, Stripe sync job design, MRR calculation rules, Refresh & staleness UX

---

## Analytics Page Layout

### Top-level metrics display

| Option | Description | Selected |
|--------|-------------|----------|
| Hero stat cards row | Row of DashboardHeroCard-style cards — Current MRR, Monthly Churn, Active Subscriptions. Matches existing patterns. | ✓ |
| Single large MRR card + sidebar stats | One prominent MRR number with trend arrow, churn and subscription counts in a sidebar column. | |
| You decide | Let Claude choose based on existing patterns and DESIGN.md | |

**User's choice:** Hero stat cards row
**Notes:** Recommended option, consistent with admin dashboard and super-admin dashboard

### MRR trend chart and revenue breakdown arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked vertically | MRR trend line chart full-width, addon revenue breakdown below. Matches signup trend chart pattern. | ✓ |
| Side by side | MRR trend 2/3 width, addon revenue 1/3 width. More compact but tighter on small screens. | |
| You decide | Let Claude choose based on content density and screen real estate | |

**User's choice:** Stacked vertically
**Notes:** Recommended option, matches existing vertical scroll pattern

### Add-on revenue breakdown chart type

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bar chart | Simple bars per add-on. Easy to compare, scales with any number of add-ons. | ✓ |
| Donut/pie chart | Proportional share of total revenue per add-on. Harder to read exact values. | |
| Table with inline bars | Table rows per add-on with name, subscriber count, MRR contribution, mini progress bar. | |

**User's choice:** Horizontal bar chart
**Notes:** Recommended option

---

## Stripe Sync Job Design

### Daily sync job mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase pg_cron | PostgreSQL cron extension triggers a Supabase Edge Function daily. No external infra. | ✓ |
| Next.js API route + external cron | Route Handler at /api/cron/stripe-sync triggered by Vercel Cron or external service. | |
| Supabase Edge Function standalone | Deno-based Edge Function triggered by pg_cron or webhook. Outside Next.js. | |

**User's choice:** Supabase pg_cron
**Notes:** Recommended option, stays within Supabase free tier

### Stripe data snapshot schema

| Option | Description | Selected |
|--------|-------------|----------|
| Subscription-level rows | One row per subscription with tenant_id, status, plan_interval, amount, addon_type, etc. Derived metrics at query time. | ✓ |
| Pre-aggregated monthly summary | One row per month per tenant with pre-calculated MRR. Faster queries but harder to recompute. | |
| Both: raw + materialised view | Raw rows plus Postgres materialised view. Most flexible but more complex. | |

**User's choice:** Subscription-level rows
**Notes:** Recommended option

### Sync scope

| Option | Description | Selected |
|--------|-------------|----------|
| Analytics only | Sync only populates analytics snapshot table. Tenant detail keeps live Stripe API. | ✓ |
| Replace tenant billing too | Sync also snapshots per-tenant data so tenant detail reads from local DB. | |

**User's choice:** Analytics only
**Notes:** Recommended option, keeps scope tight for this phase

---

## MRR Calculation Rules

### Annual plan normalisation

| Option | Description | Selected |
|--------|-------------|----------|
| Simple divide by 12 | $120/year = $10/month MRR. Industry standard. | ✓ |
| Amortise remaining months | Only count remaining months' value. Non-standard for MRR. | |

**User's choice:** Simple divide by 12
**Notes:** Matches SA-MRR-01 success criteria

### Churn counting method

| Option | Description | Selected |
|--------|-------------|----------|
| Count cancellations this calendar month | Any subscription with cancelled_at in current month = 1 churn. | ✓ |
| Count by effective end date | Only count when subscription actually expires (current_period_end passes). | |

**User's choice:** Count cancellations this calendar month
**Notes:** Matches SA-MRR-03 wording

### Trials and discounts

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude trials, use discounted amount | Trialing = $0 MRR. Coupons use actual charged amount. | ✓ |
| Include trials at full value | Count trials at post-trial price as expected MRR. | |
| You decide | Let Claude pick standard SaaS approach | |

**User's choice:** Exclude trials, use discounted amount
**Notes:** Recommended option, keeps MRR honest

---

## Refresh & Staleness UX

### Staleness communication

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle timestamp | Small "Last synced: 6 hours ago" text near top of page. Always visible, unobtrusive. | ✓ |
| Warning banner when stale | Yellow banner if data >24 hours old. More prominent but alarming. | |
| You decide | Let Claude pick based on page design | |

**User's choice:** Subtle timestamp
**Notes:** Recommended option

### Refresh button behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Inline loading state | Button shows spinner, page data dimmed. Success toast on completion. Rate-limit shows countdown. | ✓ |
| Full page loading | Skeleton/loading state for whole page during sync. | |
| Background sync with notification | Sync runs in background, toast when complete. | |

**User's choice:** Inline loading state
**Notes:** Recommended option

### Rate limiting approach

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side with DB timestamp | last_synced_at in metadata table. Server action checks before running. Button disabled with countdown. | ✓ |
| Client-side only | Track last refresh in browser state. Simpler but bypassable. | |
| You decide | Let Claude pick implementation approach | |

**User's choice:** Server-side with DB timestamp
**Notes:** Recommended option, enforces rate limit regardless of client

---

## Claude's Discretion

- Exact stat card sizing, grid responsiveness, breakpoints
- Recharts configuration (colors, axes, tooltips) — follow DESIGN.md
- Horizontal bar chart implementation details
- Edge Function implementation (Deno runtime, Stripe API pagination)
- Snapshot table name and column types
- pg_cron schedule time
- Success toast styling
- Loading/dimming approach
- MRR trend data point granularity

## Deferred Ideas

None — discussion stayed within phase scope
