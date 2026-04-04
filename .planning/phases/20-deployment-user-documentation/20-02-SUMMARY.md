---
phase: 20-deployment-user-documentation
plan: 02
subsystem: docs
tags: [documentation, merchant-onboarding, gst, user-guide]

requires:
  - phase: 19-developer-documentation
    provides: docs/ directory structure and formatting conventions (setup.md pattern)
  - phase: 18-test-coverage
    provides: confirmed GST calculation logic (gst.ts, calcLineItem, gstFromInclusiveCents)

provides:
  - docs/merchant-guide.md: complete merchant onboarding guide from signup through first online order
  - GST compliance section with two worked examples (standard and discounted)
  - Legal disclaimer about GST not being tax advice

affects: [merchant-onboarding, production-launch, support-docs]

tech-stack:
  added: []
  patterns:
    - "Merchant docs in docs/ directory, H1 title + --- separator + H2 sections format"
    - "GST worked examples use plain-text code blocks (not language-tagged) to avoid syntax highlighting"

key-files:
  created:
    - docs/merchant-guide.md
  modified: []

key-decisions:
  - "Merchant guide uses conversational tone ('you', 'your', 'You'll see') distinct from developer docs"
  - "GST worked examples use plain-text code blocks (no TypeScript/SQL) per merchant audience requirement"
  - "EFTPOS described as standalone terminal workflow — merchant confirms manually in NZPOS"

patterns-established:
  - "Merchant-facing docs: numbered steps with explicit expected outcomes at each stage"
  - "GST disclaimer as blockquote at end of GST section"

requirements-completed: [USER-01, USER-02]

duration: 8min
completed: 2026-04-04
---

# Phase 20 Plan 02: Merchant Onboarding Guide Summary

**Conversational 8-section merchant guide covering signup, setup wizard, first product, POS sale, and online order, with IRD-compliant GST worked examples and legal disclaimer.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-04T03:30:00Z
- **Completed:** 2026-04-04T03:38:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- docs/merchant-guide.md created: 180 lines, 8 H2 sections covering the full merchant journey
- GST section with two worked examples (standard sale $23.00 and discounted sale $18.00/$2.35)
- Legal disclaimer as blockquote: "not tax advice — consult your accountant"
- Conversational tone throughout (no CLI commands, no TypeScript or SQL)
- Setup wizard steps documented accurately from actual component source (StoreNameStep, LogoBrandStep, FirstProductStep)

## Task Commits

1. **Task 1: Write docs/merchant-guide.md onboarding guide with GST section** - `f66393f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `docs/merchant-guide.md` - Complete merchant onboarding guide: account creation, store setup wizard, product creation, POS sale workflow, online order flow, GST pricing explanation with worked examples

## Decisions Made

- Conversational tone markers ("You'll see", "your", "you") used consistently — distinct from the developer-focused setup.md
- GST worked examples in plain-text code blocks (no language tag) so no syntax highlighting misreads dollar amounts
- EFTPOS section explicitly describes the standalone terminal workflow (enter on terminal, confirm in NZPOS) to match actual v1 implementation
- Staff PIN login context added to POS sale section (must create a staff member first)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- docs/merchant-guide.md is complete and ready for production merchant onboarding
- Phase 20 is the final phase — both plans now complete (20-01 deployment runbook, 20-02 merchant guide)
- Production deploy requires resolving wildcard SSL Vercel NS delegation (documented as blocker in STATE.md)

---
*Phase: 20-deployment-user-documentation*
*Completed: 2026-04-04*
