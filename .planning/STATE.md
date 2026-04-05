---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Admin Platform
status: executing
stopped_at: Completed 25-admin-operational-ui Plan 01
last_updated: "2026-04-05T03:23:22.800Z"
last_activity: 2026-04-05
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 6
  completed_plans: 4
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 25 — admin-operational-ui

## Current Position

Phase: 25 (admin-operational-ui) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-04-05

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
| Phase 24-staff-rbac-foundation P02 | 15 min | 2 tasks | 12 files |
| Phase 24-staff-rbac-foundation P03 | 20 | 2 tasks | 12 files |
| Phase 25-admin-operational-ui P01 | 25 | 2 tasks | 12 files |

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

### Pending Todos

None.

### Blockers/Concerns

- Phase 27 (Analytics): Verify Vercel Cron availability on free tier vs Supabase pg_cron before Phase 27 planning
- Phase 26: Manager admin route access (read-only /admin) not yet confirmed — flag for product decision in Phase 24

## Session Continuity

Last session: 2026-04-05T03:23:22.798Z
Stopped at: Completed 25-admin-operational-ui Plan 01
Resume file: None
