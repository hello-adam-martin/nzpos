---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Marketing & Landing Page
status: planning
stopped_at: Phase 28 context gathered
last_updated: "2026-04-06T02:37:04.187Z"
last_activity: 2026-04-06 — Roadmap created for v5.0, Phase 28 defined
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 11
  completed_plans: 10
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Milestone v5.0 — Phase 28: Marketing Landing Page

## Current Position

Phase: 28 of 28 (Marketing Landing Page)
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-06 — Roadmap created for v5.0, Phase 28 defined

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

Last session: 2026-04-06T02:37:04.184Z
Stopped at: Phase 28 context gathered
Resume file: .planning/phases/28-marketing-landing-page/28-CONTEXT.md
