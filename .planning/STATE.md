---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Admin Platform
status: verifying
stopped_at: Completed 27-super-admin-analytics plan 02 (Task 3 checkpoint approved — phase complete)
last_updated: "2026-04-06T02:13:20.887Z"
last_activity: 2026-04-06
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 11
  completed_plans: 10
  percent: 89
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 27 — super-admin-analytics

## Current Position

Phase: 27 (super-admin-analytics) — EXECUTING
Plan: 2 of 2
Status: Phase complete — ready for verification
Last activity: 2026-04-06

Progress: [█████████░] 89%

## Performance Metrics

**Velocity:**

- Total plans completed: 1 (v4.0)
- Average duration: 10 min
- Total execution time: 10 min

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 24-01 | 10 min | 2 | 7 |

*Updated after each plan completion*
| Phase 24-staff-rbac-foundation P02 | 15 min | 2 tasks | 12 files |
| Phase 24-staff-rbac-foundation P03 | 20 | 2 tasks | 12 files |
| Phase 25-admin-operational-ui P01 | 25 | 2 tasks | 12 files |
| Phase 25-admin-operational-ui P03 | 15 min | 2 tasks | 9 files |
| Phase 26-super-admin-billing-user-management P02 | 15 | 1 tasks | 2 files |
| Phase 26-super-admin-billing-user-management P01 | 8 | 2 tasks | 5 files |
| Phase 26-super-admin-billing-user-management P03 | 10 min | 2 tasks | 6 files |
| Phase 27-super-admin-analytics P01 | 18 | 2 tasks | 6 files |
| Phase 27-super-admin-analytics P02 | 3min | 2 tasks | 5 files |
| Phase 27-super-admin-analytics P02 | 25 | 3 tasks | 5 files |

## Accumulated Context

### Decisions

(Carried from v3.0)

- requireFeature() JWT/DB dual-path pattern established for all add-on gating
- Append-only audit tables with INSERT+SELECT RLS for tamper-proof history
- SECURITY DEFINER RPCs for atomic DB operations
- resolveAuth() returns snake_case { store_id, staff_id }

(v4.0 — from research)

- POS_ROLES constant centralised in src/config/roles.ts — import in middleware, staffPin.ts, and staff.ts Zod schema before adding manager role to DB
- resolveStaffAuthVerified() does DB role lookup on all role-gated mutations — never trust JWT role for writes
- On role change, force re-login by setting pin_locked_until = now() to invalidate stale JWT
- Stripe analytics materialised via platform_analytics_snapshots table — never fetch live Stripe API on page load
- Annual plan MRR normalised by dividing amount by 12 in sync job — unit test required
- Customer management routes use standard server client (RLS-enforced) — never admin client
- [Phase 24-staff-rbac-foundation]: Admin layout wires role + staffName to AdminSidebar early — Plan 03 only needs to consume props, not add wiring
- [Phase 24-staff-rbac-foundation]: Middleware manager JWT block placed after owner success path — preserves all existing owner logic including email verification, setup wizard, and customer block
- [Phase 24-staff-rbac-foundation]: AddStaffModal uses Math.random() for client-side PIN generation — crypto.randomInt is Node-only, server hashes whatever PIN it receives
- [Phase 24-staff-rbac-foundation]: Manager nav links removed from DOM in AdminSidebar (not CSS hidden) per D-09 security requirement
- [Phase 25-admin-operational-ui]: Soft-delete uses is_active=false with optimistic lock on promo_codes to prevent race conditions
- [Phase 25-admin-operational-ui]: PromoList converted to use client component to support modal state for edit/delete
- [Phase 25]: Customer detail page uses 'use client' — enables immediate UI update after disable/enable without full page navigation
- [Phase 25]: orders.order_number column absent from schema — short UUID (first 8 chars) used as order reference in font-mono
- [Phase 26-super-admin-billing-user-management]: Use Promise.allSettled for Stripe + owner fetches — partial failure acceptable, show error inline rather than crashing page
- [Phase 26-super-admin-billing-user-management]: hasPastDue checks subscription status for past_due/unpaid + invoice open+overdue — Invoice.Status has no past_due value in Stripe SDK v17
- [Phase 26-super-admin-billing-user-management]: billing_cycle_anchor used for renewal date display — Stripe SDK v17 Subscription type has no current_period_end field
- [Phase 26-super-admin-billing-user-management]: exactMatch: true on Dashboard nav link prevents /super-admin children from also highlighting Dashboard as active
- [Phase 26-super-admin-billing-user-management]: signupGradient ID in SignupTrendChart avoids conflict with salesGradient in SalesTrendChart
- [Phase 26-super-admin-billing-user-management]: Use admin.auth.resetPasswordForEmail (not admin.auth.admin variant) for password reset — per RESEARCH.md Pitfall 4
- [Phase 26-super-admin-billing-user-management]: DisableAccountModal uses mode prop for disable/enable — single component handles both flows
- [Phase 26-super-admin-billing-user-management]: ban_duration '876600h' for effective permanent ban; 'none' to unban via Supabase Auth admin API
- [Phase 27-super-admin-analytics]: maxDuration=60 on stripe-snapshot-sync cron route (Hobby plan serverless limit)
- [Phase 27-super-admin-analytics]: Shared syncStripeSnapshot function called by both cron and server action — single source of truth for sync logic
- [Phase 27-super-admin-analytics]: Rate limit implemented via analytics_sync_metadata DB row (not in-memory) — works across serverless instances
- [Phase 27-super-admin-analytics]: AnalyticsSyncControls accepts onSyncStart optional prop to trigger page dimming before sync response arrives
- [Phase 27-super-admin-analytics]: Add-on revenue grouping done in JS (not SQL GROUP BY) — Supabase JS client query limitation
- [Phase 27-super-admin-analytics]: AnalyticsSyncControls accepts onSyncStart optional prop to trigger page dimming before sync response arrives
- [Phase 27-super-admin-analytics]: Add-on revenue grouping done in JS (not SQL GROUP BY) — Supabase JS client query limitation

### Pending Todos

None.

### Blockers/Concerns

- Phase 27 (Analytics): Verify Vercel Cron availability on free tier vs Supabase pg_cron before Phase 27 planning
- Phase 26: Manager admin route access (read-only /admin) not yet confirmed — flag for product decision in Phase 24

## Session Continuity

Last session: 2026-04-06T02:13:20.884Z
Stopped at: Completed 27-super-admin-analytics plan 02 (Task 3 checkpoint approved — phase complete)
Resume file: None
