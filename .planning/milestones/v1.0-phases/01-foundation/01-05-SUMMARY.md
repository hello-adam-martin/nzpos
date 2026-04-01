---
phase: 01-foundation
plan: 05
subsystem: infra
tags: [pwa, manifest, github-actions, ci-cd, vercel, supabase, icons]

# Dependency graph
requires:
  - phase: 01-foundation plan 04
    provides: Next.js app with auth, layout, and build pipeline set up
provides:
  - PWA manifest enabling iPad home screen installation in standalone mode
  - Placeholder 192x192, 512x512, 180x180 PNG icons (navy #1E293B)
  - Apple PWA meta tags in root layout (apple-touch-icon, appleWebApp)
  - GitHub Actions CI/CD pipeline (test -> migrate -> deploy)
affects: [deployment, ci, pwa, ios]

# Tech tracking
tech-stack:
  added: [sharp (icon generation script), supabase/setup-cli@v1 (CI), amondnet/vercel-action@v25 (CI)]
  patterns: [PWA manifest as Next.js route handler, CI job chaining with needs:]

key-files:
  created:
    - src/app/manifest.ts
    - public/icons/icon-192.png
    - public/icons/icon-512.png
    - public/icons/icon-180.png
    - scripts/generate-icons.ts
    - .github/workflows/ci.yml
  modified:
    - src/app/layout.tsx

key-decisions:
  - "No service worker in Phase 1 — PWA installability on iOS via manifest + HTTPS only (D-11)"
  - "Icon generation via sharp script, placeholder navy squares — branded icons deferred to design phase"
  - "CI uses 3 jobs: test (all branches), migrate+deploy (main only) with strict job ordering"
  - "Apple PWA meta via Next.js Metadata appleWebApp field + explicit apple-touch-icon link tag"
  - "Top-level await in generate-icons.ts requires async wrapper for tsx compatibility"

patterns-established:
  - "PWA manifest: Next.js MetadataRoute.Manifest type, export default function manifest()"
  - "CI pipeline ordering: test -> migrate -> deploy with needs: chain"
  - "Icon generation: sharp library with create.background for solid-color placeholder PNGs"

requirements-completed: [DEPLOY-01, DEPLOY-02]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 01 Plan 05: PWA Manifest + CI/CD Summary

**PWA manifest with navy-theme standalone mode for iPad installation, plus 3-job GitHub Actions pipeline (test->migrate->deploy)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T19:56:15Z
- **Completed:** 2026-03-31T20:04:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- PWA manifest at `src/app/manifest.ts` enables iPad Safari "Add to Home Screen" with standalone fullscreen, navy theme, NZPOS app name, and `/pos` as the start URL
- Placeholder icons (192x192, 512x512, 180x180 navy PNGs) generated via sharp script; all referenced in manifest and apple-touch-icon link
- Apple PWA meta tags added to root layout via Next.js Metadata API (`appleWebApp`) and explicit `<link rel="apple-touch-icon">`
- GitHub Actions CI/CD pipeline with test job (always), migrate job (main only, after test), deploy job (main only, after migrate)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PWA manifest and generate placeholder icons** - `cb8d67b` (feat)
2. **Task 2: Create GitHub Actions CI/CD workflow** - `5c01d95` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/app/manifest.ts` - PWA manifest: standalone display, navy theme, /pos start_url, 3 icon sizes
- `public/icons/icon-192.png` - 192x192 placeholder navy PNG icon
- `public/icons/icon-512.png` - 512x512 placeholder navy PNG icon
- `public/icons/icon-180.png` - 180x180 placeholder navy PNG icon (Apple touch icon)
- `scripts/generate-icons.ts` - Sharp-based icon generation script for placeholder PNGs
- `.github/workflows/ci.yml` - GitHub Actions: test+tsc+build on every push, migrate+deploy on main
- `src/app/layout.tsx` - Added `apple-touch-icon` link and `appleWebApp` metadata

## Decisions Made
- No service worker per D-11 — iOS Safari only needs manifest + HTTPS for installation prompt
- Placeholder icons are solid navy squares; real branded icons deferred to design phase
- CI uses sequential job ordering: test must pass before migrate runs, migrate before deploy
- Required secrets documented in CI file but not hardcoded: SUPABASE_DB_URL, VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed top-level await in generate-icons.ts for tsx compatibility**
- **Found during:** Task 1 (icon generation)
- **Issue:** tsx runs with CJS output format by default; top-level await in the script caused "Top-level await is currently not supported with the 'cjs' output format" error
- **Fix:** Wrapped async code in an `async function generateIcons()` and called it immediately
- **Files modified:** scripts/generate-icons.ts
- **Verification:** Script ran successfully, all 3 icons generated
- **Committed in:** cb8d67b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — tsx compatibility fix for async wrapper. No scope creep.

## Issues Encountered
- tsx ESM/CJS mode requires async wrapper instead of top-level await — fixed inline as a Rule 3 blocking issue

## User Setup Required
Before CI/CD pipeline can fully run, configure these GitHub repository secrets:
- `SUPABASE_DB_URL` — from Supabase Dashboard > Settings > Database > Connection string (URI format)
- `VERCEL_TOKEN` — from Vercel Account Settings > Tokens
- `VERCEL_ORG_ID` — from Vercel project settings or `.vercel/project.json`
- `VERCEL_PROJECT_ID` — from Vercel project settings or `.vercel/project.json`

The `test` job will run without secrets. The `migrate` and `deploy` jobs only run on main branch pushes and require secrets.

## Known Stubs
- `public/icons/icon-*.png` — Placeholder navy squares. Real branded icons with NZPOS logo should replace these before public launch. No visual/functional impact on PWA installability.

## Next Phase Readiness
- PWA installability ready: manifest + icons + Apple meta tags are complete
- CI/CD pipeline is ready to run as soon as secrets are configured in GitHub repository settings
- Phase 01 foundation is now complete (5/5 plans done)

---
*Phase: 01-foundation*
*Completed: 2026-04-01*

## Self-Check: PASSED

- FOUND: src/app/manifest.ts
- FOUND: public/icons/icon-192.png
- FOUND: public/icons/icon-512.png
- FOUND: public/icons/icon-180.png
- FOUND: .github/workflows/ci.yml
- FOUND: commit cb8d67b (Task 1 - PWA manifest + icons)
- FOUND: commit 5c01d95 (Task 2 - GitHub Actions CI/CD)
