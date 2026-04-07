---
gsd_state_version: 1.0
milestone: v8.1
milestone_name: Marketing Refresh & Compare Page
status: planning
stopped_at: Phase 38 context gathered
last_updated: "2026-04-07T03:12:19.341Z"
last_activity: 2026-04-07 — Roadmap created for v8.1
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Milestone v8.1 — Marketing Refresh & Compare Page

## Current Position

Phase: Phase 38 — Add-On Detail Pages + Landing Page Refresh (not started)
Plan: —
Status: Roadmap ready, awaiting phase planning
Last activity: 2026-04-07 — Roadmap created for v8.1

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v8.1)
- Average duration: —
- Total execution time: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Carried forward from v8.0 in PROJECT.md Key Decisions table.

**v8.1 decisions:**

- Phase 38 before Phase 39: add-on detail pages must exist before comparison page can link to them as evidence. Broken `/add-ons/gift-cards` links on a comparison page undermine credibility.
- All competitor data centralised in `src/data/competitors.ts` with source URLs and last-verified dates as comments — FTA compliance and maintenance requirement.
- Use text-only competitor names (no stylised logos or branded assets) — trademark risk mitigation per research SUMMARY.md.
- Nav and footer changes within Phase 39 go last — they affect every marketing page and carry the highest blast radius.
- No new dependencies for this milestone — purely content, routing, and component work in existing stack.

### Pending Todos

- Phase 39 pre-work: compile competitor claim source documentation before writing copy (FTA compliance gate — one row per comparison table claim: claim text, source URL, date accessed).
- Phase 39 pre-work: define keyword targeting split between landing page (top-of-funnel) and comparison page (mid-funnel evaluation queries).

### Blockers/Concerns

None blocking Phase 38.

Phase 39 has a legal prerequisite: competitor pricing claims must be sourced from official competitor documentation before copy is written. Research has provided URLs (see .planning/research/SUMMARY.md Sources section). Source verification checklist must be completed at plan-phase time.

## Session Continuity

Last session: 2026-04-07T03:12:19.333Z
Stopped at: Phase 38 context gathered
Resume file: .planning/phases/38-add-on-detail-pages-landing-page-refresh/38-CONTEXT.md
