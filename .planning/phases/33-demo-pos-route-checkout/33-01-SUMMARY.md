---
phase: 33-demo-pos-route-checkout
plan: 01
subsystem: demo-route
tags: [demo, middleware, routing, pos]
dependency_graph:
  requires: [phase-32-demo-store-seed]
  provides: [demo-pos-route, demo-layout, middleware-passthrough]
  affects: [src/middleware.ts, src/app/(demo)/]
tech_stack:
  added: []
  patterns: [server-component-data-fetch, admin-client-query, route-group-layout]
key_files:
  created:
    - src/app/(demo)/layout.tsx
    - src/app/(demo)/demo/pos/page.tsx
  modified:
    - src/middleware.ts
decisions:
  - Middleware early return placed at line 1.5 (after webhook check, before host resolution) so demo routes bypass all tenant and auth logic
  - Admin client used for demo data fetch to bypass RLS without requiring auth session
  - demoMode and demoStore props passed to POSClientShell even though TypeScript will error until plan 33-02 adds them to the type definition
metrics:
  duration: ~5 min
  completed: "2026-04-06T09:23:44Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 33 Plan 01: Demo Route Infrastructure Summary

**One-liner:** Middleware passthrough for /demo/** and (demo) route group with admin-client data fetch for the demo store.

## What Was Built

Three files establish the public, unauthenticated entry point for the demo POS:

1. **`src/middleware.ts`** — Added early return at position 1.5 (after webhook check, before host resolution). `/demo/**` paths get security headers applied and pass through immediately — no Supabase session creation, no tenant resolution, no auth checks.

2. **`src/app/(demo)/layout.tsx`** — Minimal layout matching the `(pos)` route group pattern: viewport meta for tablet use, `h-dvh overflow-hidden bg-bg touch-manipulation` wrapper. No auth providers or tenant context wired in.

3. **`src/app/(demo)/demo/pos/page.tsx`** — Server component that uses `createSupabaseAdminClient` to fetch products, categories, and store data for `DEMO_STORE_ID` in parallel via `Promise.all`. Renders `POSClientShell` with `demoMode={true}`, `staffName="Demo"`, `hasInventory={false}`, and a `demoStore` prop with store address/phone/gst_number for receipt display.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Middleware passthrough | bc38585 | feat(33-01): add middleware passthrough for /demo/** paths |
| Task 2: Demo route group | 6316aa5 | feat(33-01): create (demo) route group with layout and POS page |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `demoMode` and `demoStore` props on `POSClientShell` do not yet exist in the TypeScript type definition. The demo POS page passes them but TypeScript will report an error until plan 33-02 adds these props to `POSClientShellProps`. This is an intentional cross-plan dependency documented in the plan.

## Success Criteria Met

- [x] Middleware early-returns for /demo/** paths before any auth or tenant resolution
- [x] Demo layout provides POS viewport setup without auth providers
- [x] Demo page server component fetches products/categories/store for DEMO_STORE_ID
- [x] Demo page passes all required props to POSClientShell including demoMode=true
