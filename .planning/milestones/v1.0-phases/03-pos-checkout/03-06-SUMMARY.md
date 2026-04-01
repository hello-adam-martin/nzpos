---
phase: 03-pos-checkout
plan: 06
subsystem: ui
tags: [react, next.js, supabase, pin-login, pos, tailwind]

# Dependency graph
requires:
  - phase: 03-pos-checkout
    provides: verifyStaffPin server action (src/actions/auth/staffPin.ts) and staff JWT session cookie
provides:
  - Full /pos/login UI with staff selector, 4-digit PIN pad, error display, and redirect on success
affects: [pos-checkout, phase-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component fetching store/staff data via admin client, passing as props to Client Component
    - Client Component PIN pad with auto-submit on 4th digit, error clear on retry
    - force-dynamic on pages that require env vars at runtime (prevent static prerender)

key-files:
  created:
    - src/components/pos/PinLoginForm.tsx
  modified:
    - src/app/(pos)/pos/login/page.tsx

key-decisions:
  - "export const dynamic = 'force-dynamic' added to /pos/login — prevents static prerender error when Supabase env vars are absent at build time"
  - "Auto-submit triggered at pin.length === 4 — avoids need for submit button, better iPad UX"
  - "PIN cleared on error via setPin('') — staff can retry immediately without backspacing 4 times"

patterns-established:
  - "POS login: Server Component fetches data, Client Component owns interaction state"
  - "force-dynamic on any POS page using admin client at render time"

requirements-completed: [POS-01]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 03 Plan 06: POS Staff PIN Login UI Summary

**Staff PIN login UI with selector buttons, 4-digit keypad with auto-submit, and error display wired to verifyStaffPin server action**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T04:43:00Z
- **Completed:** 2026-04-01T04:45:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced stub `/pos/login` page with Server Component that fetches store and active staff from Supabase
- Created `PinLoginForm` Client Component with iPad-optimized staff selector buttons and 4-digit PIN pad
- Wired form submission to `verifyStaffPin` server action with full error handling and success redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert login page to Server Component + create PinLoginForm client component** - `3f4c793` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/app/(pos)/pos/login/page.tsx` - Server Component: fetches store + active staff, renders PinLoginForm; `export const dynamic = 'force-dynamic'`
- `src/components/pos/PinLoginForm.tsx` - Client Component: staff selector, 4-dot PIN indicator, 3x4 keypad, auto-submit at 4 digits, error display, "Change staff member" link

## Decisions Made

- Added `export const dynamic = 'force-dynamic'` to the login page — the admin client requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` which are not available during static prerender at build time. Without this, `npx next build` fails with "supabaseUrl is required".
- Auto-submit triggers when `pin.length === 4` inside the `handleDigit` function — passes the newly constructed pin string directly to `handleSubmit` to avoid stale state race condition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: result.error possibly undefined**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `setError(result.error)` failed TS because the return type union meant `result.error` could be `string | undefined`, incompatible with `SetStateAction<string | null>`
- **Fix:** Added null coalescing: `setError(result.error ?? 'An error occurred')`
- **Files modified:** src/components/pos/PinLoginForm.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 3f4c793 (Task 1 commit)

**2. [Rule 3 - Blocking] Build prerender error: supabaseUrl is required**
- **Found during:** Task 1 (next build check)
- **Issue:** Next.js attempted to statically prerender `/pos/login` at build time; admin client threw because env vars not available in build environment
- **Fix:** Added `export const dynamic = 'force-dynamic'` to page.tsx
- **Files modified:** src/app/(pos)/pos/login/page.tsx
- **Verification:** Build passes, page shows as `ƒ (Dynamic)` in build output
- **Committed in:** 3f4c793 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes essential for TypeScript compliance and successful build. No scope creep.

## Issues Encountered

- Unused `useEffect` import from initial write — removed (not needed; no side-effect logic required)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/pos/login` gap from Phase 03 verification is now closed — staff can select name, enter PIN, and reach `/pos`
- Phase 03 POS checkout is feature-complete
- Ready to proceed to Phase 04

---
*Phase: 03-pos-checkout*
*Completed: 2026-04-01*
