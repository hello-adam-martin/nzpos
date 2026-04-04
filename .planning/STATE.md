---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Admin Platform
status: executing
stopped_at: Completed 24-01-PLAN.md
last_updated: "2026-04-04T18:34:16Z"
last_activity: 2026-04-05 -- Phase 24 Plan 01 completed
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 24 — staff-rbac-foundation

## Current Position

Phase: 24 (staff-rbac-foundation) — EXECUTING
Plan: 2 of 3
Status: Executing Phase 24 (Plan 01 complete)
Last activity: 2026-04-05 -- Phase 24 Plan 01 completed

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**

- Total plans completed: 1 (v4.0)
- Average duration: 10 min
- Total execution time: 10 min

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 24-01 | 10 min | 2 | 7 |

*Updated after each plan completion*

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

### Pending Todos

None.

### Blockers/Concerns

- Phase 27 (Analytics): Verify Vercel Cron availability on free tier vs Supabase pg_cron before Phase 27 planning
- Phase 26: Manager admin route access (read-only /admin) not yet confirmed — flag for product decision in Phase 24

## Session Continuity

Last session: 2026-04-04T18:34:16Z
Stopped at: Completed 24-01-PLAN.md
Resume file: .planning/phases/24-staff-rbac-foundation/24-02-PLAN.md
