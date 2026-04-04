---
phase: 19-developer-documentation
plan: 03
subsystem: api
tags: [server-actions, zod, supabase, stripe, auth, documentation]

# Dependency graph
requires:
  - phase: 19-developer-documentation
    provides: research with complete 48-action inventory and action patterns

provides:
  - "Complete 48-action Server Action inventory in docs/server-actions.md"
  - "Four-column tables: Name, Auth, Input Schema, Description per action"
  - "Common action pattern code block for developer orientation"
  - "Maintenance section with count verification command"

affects: [developer-onboarding, code-review, api-consumers, contribution-guide]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action doc format: four-column Markdown table per domain"
    - "Input Schema column: inline Zod summary with key fields and types"

key-files:
  created:
    - docs/server-actions.md
  modified: []

key-decisions:
  - "Auth column uses short labels (public, owner, staff/owner, customer, super-admin) for scannability"
  - "Input Schema column summarizes actual Zod schema fields inline — not just schema name — so caller doesn't need to open source"
  - "Xero actions note requireFeature DB-check requirement explicitly (not just owner auth)"

patterns-established:
  - "Server Action tables: Name | Auth | Input Schema | Description — 4 columns per D-08"
  - "Auth helper table in intro explains resolveAuth vs resolveStaffAuth vs supabase.auth.getUser"

requirements-completed: [DOC-04]

# Metrics
duration: 20min
completed: 2026-04-04
---

# Phase 19 Plan 03: Server Action Inventory Summary

**48 Server Actions documented across 10 domains with name, auth requirement, Zod input schema summary, and one-line description in docs/server-actions.md**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-04T03:00:00Z
- **Completed:** 2026-04-04T03:20:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `docs/server-actions.md` with all 48 Server Actions across 10 domain groups
- Each action documented with four columns: Name, Auth, Input Schema, Description
- Input schema column reflects actual Zod schema fields (read from source), not just schema names
- Auth helper table explains the three auth resolution patterns used across the codebase
- Common action pattern section shows the standard `'use server'` + Zod + DB structure
- Maintenance section includes `find src/actions` count command to detect drift

## Task Commits

Each task was committed atomically:

1. **Task 1: Write docs/server-actions.md — Full 48-action inventory** - `9e0d09b` (feat)

**Plan metadata:** *(to be recorded in final commit)*

## Files Created/Modified

- `docs/server-actions.md` — Complete 48-action Server Action reference; 10 domain sections; 190 lines

## Decisions Made

- Auth column uses concise labels (`public`, `owner`, `staff/owner`, `customer`, `super-admin`) — scans faster than longer descriptions
- Input Schema column summarizes actual Zod fields inline rather than referencing schema names — a developer can see the contract without opening any source file
- Xero actions explicitly note `requireFeature('xero', { requireDbCheck: true })` gate in the Auth column note — this is a non-obvious second auth layer beyond owner JWT
- `updateProfile` documented as `customer` auth (not `owner`) — it operates on the `customers` table using Supabase Auth getUser, distinct from the owner profile

## Deviations from Plan

None — plan executed exactly as written. All 48 actions sourced directly from their respective action files. Zod schemas verified against actual source (schemas/order.ts, schemas/staff.ts, schemas/refund.ts, inline schemas).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `docs/server-actions.md` complete and committed — satisfies DOC-04
- Phase 19 all 3 plans complete: docs/README.md (01), docs/env-vars.md (02), docs/server-actions.md (03)
- Phase 19 documentation suite ready for developer use

## Self-Check: PASSED

- FOUND: docs/server-actions.md
- FOUND: commit 9e0d09b

## Known Stubs

None — documentation is complete. All 48 actions have fully populated entries sourced from actual source code.

---
*Phase: 19-developer-documentation*
*Completed: 2026-04-04*
