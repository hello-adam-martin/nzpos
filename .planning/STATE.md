---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Admin Platform
status: ready_to_plan
stopped_at: Roadmap created — Phase 24 ready to plan
last_updated: "2026-04-05"
last_activity: 2026-04-05
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 24 — Staff RBAC Foundation

## Current Position

Phase: 24 of 27 (Staff RBAC Foundation)
Plan: —
Status: Ready to plan
Last activity: 2026-04-05 — v4.0 roadmap created, 4 phases, 32 requirements mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v4.0)
- Average duration: — min
- Total execution time: — hours

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

Last session: 2026-04-05
Stopped at: v4.0 roadmap created — ready to plan Phase 24
Resume file: None
