---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [nextjs, tailwind, vitest, typescript, supabase, stripe, eslint]

# Dependency graph
requires: []
provides:
  - Next.js 16 App Router scaffold with TypeScript
  - Tailwind v4 CSS-native design system (navy/amber NZPOS tokens)
  - All Phase 1 npm dependencies installed (Supabase, Stripe, Zod, jose, bcryptjs, date-fns, server-only)
  - Vitest test runner configured with jsdom and tsconfig paths
  - Environment variable documentation (.env.local.example)
affects: [02-schema, 03-auth, 04-gst, 05-cicd]

# Tech tracking
tech-stack:
  added:
    - next@16.2.1
    - react@19.2.4
    - tailwindcss@^4 with @tailwindcss/postcss
    - "@supabase/supabase-js@^2.101.1"
    - "@supabase/ssr@^0.10.0"
    - zod@^4.3.6
    - jose@^6.2.2
    - bcryptjs@^3.0.3
    - stripe@^21.0.1
    - "@stripe/stripe-js@^9.0.1"
    - date-fns@^4.1.0
    - server-only@^0.0.1
    - vitest@^4.1.2
    - "@playwright/test@^1.58.2"
    - tsx@^4.21.0
  patterns:
    - "Tailwind v4 CSS-native @theme block in globals.css (no tailwind.config.js)"
    - "Design tokens as CSS custom properties: --color-navy, --color-amber, --font-display, etc."
    - "Bunny Fonts CDN for Satoshi + DM Sans (no next/font/google)"
    - "Viewport metadata via Next.js Viewport export (not meta tag)"

key-files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - vitest.config.mts
    - .env.local.example
    - .gitignore
  modified: []

key-decisions:
  - "Tailwind v4 CSS-native config: @theme block in globals.css, no tailwind.config.js"
  - "Bunny Fonts CDN for Satoshi+DM Sans instead of next/font (simpler, no subsetting needed for display fonts)"
  - "iPad viewport: userScalable=false, maximumScale=1 to prevent pinch-zoom on POS interface"

patterns-established:
  - "Pattern 1: Design tokens in @theme block — all color/font/radius values as CSS vars"
  - "Pattern 2: Test scripts — npm test (run), npm run test:watch (watch), npm run test:e2e (playwright)"
  - "Pattern 3: All env vars documented in .env.local.example before use"

requirements-completed: [FOUND-01, FOUND-07]

# Metrics
duration: 11min
completed: 2026-04-01
---

# Phase 1 Plan 01: Project Scaffold Summary

**Next.js 16 App Router scaffold with Tailwind v4 CSS-native NZPOS design system (navy/amber/DM Sans/Satoshi), all Phase 1 dependencies installed, and Vitest configured**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-31T18:58:46Z
- **Completed:** 2026-03-31T19:09:46Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Next.js 16.2.1 App Router project with TypeScript, all Phase 1 dependencies installed via npm
- Tailwind v4 CSS-native design system with all NZPOS tokens (deep navy, amber, warm neutrals, DM Sans, Satoshi, Geist Mono)
- Vitest 4.x configured with jsdom environment and React Testing Library, runnable with `npm test`

## Task Commits

1. **Task 1: Scaffold Next.js 16 project and install all Phase 1 dependencies** - `f7f2521` (feat)
2. **Task 2: Configure Tailwind v4 design system tokens, root layout, and Vitest** - `e747c7d` (feat)

## Files Created/Modified
- `package.json` - Next.js 16 project, all Phase 1 deps, test scripts (test/test:watch/test:e2e)
- `postcss.config.mjs` - Tailwind v4 PostCSS config (@tailwindcss/postcss, no tailwind.config.js)
- `tsconfig.json` - TypeScript config with @/* path alias
- `next.config.ts` - Next.js 16 config
- `src/app/globals.css` - Tailwind v4 @theme block with NZPOS design tokens
- `src/app/layout.tsx` - Root layout with Bunny Fonts CDN, NZPOS metadata, iPad viewport config
- `src/app/page.tsx` - Placeholder page confirming design system tokens render
- `vitest.config.mts` - Vitest with jsdom, @vitejs/plugin-react, vite-tsconfig-paths
- `.env.local.example` - All required env vars documented (Supabase, STAFF_JWT_SECRET, Stripe)
- `.gitignore` - Standard Next.js/Vercel/Supabase exclusions

## Decisions Made
- Tailwind v4 CSS-native config: `@theme` block in globals.css, no `tailwind.config.js` — aligns with v4 pattern and plan requirement D-06
- Bunny Fonts CDN (not next/font/google) for Satoshi + DM Sans — Satoshi is not available in Google Fonts, Bunny is the correct CDN per DESIGN.md
- iPad viewport: `userScalable: false, maximumScale: 1` — prevents accidental pinch-zoom on POS touch interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] create-next-app rejected uppercase project name "NZPOS"**
- **Found during:** Task 1
- **Issue:** npm naming restrictions prevent capital letters; `npx create-next-app@latest .` failed with "name can no longer contain capital letters"
- **Fix:** Scaffolded into temp directory `nzpos-temp`, copied scaffold files to project root, removed temp dir, reinstalled dependencies
- **Verification:** `npm run build` exits 0
- **Committed in:** f7f2521

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor workaround for npm naming restriction. All planned output delivered identically.

## Issues Encountered
- Copying node_modules between directories broke binary symlinks — resolved by running `npm install` fresh from package.json after file copy

## User Setup Required
None - no external service configuration required for this plan. Supabase and Stripe credentials are documented in .env.local.example for use in Plan 02+.

## Next Phase Readiness
- Plan 02 (Supabase schema) can proceed: all Supabase client dependencies installed, .env.local.example documents required env vars
- Plan 03 (Auth) can proceed: jose, bcryptjs, @supabase/ssr all installed
- Plan 04 (GST module) can proceed: Vitest configured and runnable
- Plan 05 (CI/CD) can proceed: Playwright installed, project builds cleanly

---
*Phase: 01-foundation*
*Completed: 2026-04-01*

## Self-Check: PASSED

- FOUND: package.json
- FOUND: src/app/globals.css
- FOUND: postcss.config.mjs
- FOUND: vitest.config.mts
- FOUND: .env.local.example
- FOUND: src/app/layout.tsx
- FOUND: commit f7f2521 (Task 1)
- FOUND: commit e747c7d (Task 2)
