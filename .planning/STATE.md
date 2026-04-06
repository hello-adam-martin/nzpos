---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Marketing & Landing Page
status: executing
stopped_at: Completed 28-02-PLAN.md
last_updated: "2026-04-06T03:05:30.340Z"
last_activity: 2026-04-06
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 14
  completed_plans: 11
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 28 — marketing-landing-page

## Current Position

Phase: 28 (marketing-landing-page) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-04-06

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v5.0)
- Average duration: ~15 min (based on v4.0 history)
- Total execution time: 0 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

(Carried from v4.0)

- requireFeature() JWT/DB dual-path pattern established for all add-on gating
- Stripe analytics materialised via platform_analytics_snapshots — never fetch live Stripe API on page load
- resolveAuth() returns snake_case { store_id, staff_id }

(v5.0 scope)

- Phase 28 is a single-phase milestone — all 9 requirements are tightly coupled UI work on one page
- Components live in src/app/(marketing)/components/: LandingNav, LandingHero, LandingFeatures, LandingPricing, LandingCTA, LandingFooter
- Add-on pricing: Xero $9/mo, Email Notifications $5/mo, Inventory Management $9/mo
- Design system applies: deep navy (#1E293B) + amber (#E67E22), Satoshi + DM Sans

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-06T03:05:30.338Z
Stopped at: Completed 28-02-PLAN.md
Resume file: None
