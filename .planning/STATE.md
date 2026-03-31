---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-foundation-01-03-PLAN.md
last_updated: "2026-03-31T19:34:35.284Z"
last_activity: 2026-03-31
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 01 — foundation

## Current Position

Phase: 01 (foundation) — EXECUTING
Plan: 4 of 5
Status: Ready to execute
Last activity: 2026-03-31

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P01 | 11 | 2 tasks | 10 files |
| Phase 01-foundation P02 | 6 | 2 tasks | 9 files |
| Phase 01-foundation P03 | 3 | 2 tasks | 9 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Custom JWT claims (store_id + role in app_metadata) — must be configured before any RLS policies are written
- Phase 1: Integer cents throughout (no floats) — schema constraint, cannot change after data exists
- Phase 1: GST must be a pure function with IRD specimen test cases before checkout code is written
- Phase 3/4: Refresh-on-transaction (revalidatePath) over Supabase Realtime for inventory sync
- [Phase 01-foundation]: Tailwind v4 CSS-native config: @theme block in globals.css, no tailwind.config.js
- [Phase 01-foundation]: Bunny Fonts CDN for Satoshi+DM Sans (Satoshi not on Google Fonts)
- [Phase 01-foundation]: iPad viewport: userScalable=false to prevent accidental pinch-zoom on POS
- [Phase 01-foundation]: All monetary columns use INTEGER cents - no DECIMAL/NUMERIC/FLOAT anywhere in schema (enforced at DB level)
- [Phase 01-foundation]: RLS uses auth.jwt()->'app_metadata'->>'store_id' not user table joins - avoids 2-11x performance penalty
- [Phase 01-foundation]: Custom JWT access token hook registered in config.toml - Supabase Auth injects store_id+role into app_metadata on every token
- [Phase 01-foundation]: GST formula Math.round(cents * 3 / 23) confirmed IRD-compliant; per-line on discounted amounts per D-09
- [Phase 01-foundation]: Zod v4 (4.3.6) installed, not v3 as planned — API compatible, no migration needed
- [Phase 01-foundation]: All monetary Zod fields use z.number().int() enforcing integer cents at Server Action boundary

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Verify current Supabase Auth Hooks syntax for custom JWT claims before implementation (was in beta/GA transition at research cutoff)
- Phase 6: Verify Xero OAuth 2.0 scopes and journal entry API format at developer.xero.com before starting Xero work

## Session Continuity

Last session: 2026-03-31T19:34:35.282Z
Stopped at: Completed 01-foundation-01-03-PLAN.md
Resume file: None
