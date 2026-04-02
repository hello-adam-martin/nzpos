---
phase: 12-multi-tenant-infrastructure
plan: "02"
subsystem: infra
tags: [middleware, tenant-resolution, subdomain, jwt, edge-runtime, caching]

dependency_graph:
  requires:
    - phase: 12-01
      provides: stores.slug, stores.is_active, middlewareAdmin.ts (Edge-safe admin client)
  provides:
    - src/lib/tenantCache.ts (5-min TTL in-memory slug-to-store_id cache)
    - src/middleware.ts (subdomain tenant resolution with header injection)
    - src/lib/resolveAuth.ts (reads x-store-id header from middleware, JWT fallback)
    - src/app/not-found/page.tsx (store not found page for unknown subdomains)
    - .env.example (ROOT_DOMAIN env var documented)
  affects:
    - Plan 03 (RLS policies — resolveAuth now passes subdomain store_id)
    - Plan 04+ (all Server Actions use resolveAuth, now tenant-aware)
    - All storefront/admin/POS routes now receive x-store-id header

tech-stack:
  added: []
  patterns:
    - subdomain-tenant-resolution
    - middleware-header-injection
    - in-memory-ttl-cache-edge
    - resolveAuth-header-priority-jwt-fallback

key-files:
  created:
    - src/lib/tenantCache.ts
    - src/app/not-found/page.tsx
    - .env.example
  modified:
    - src/middleware.ts
    - src/lib/resolveAuth.ts
    - next.config.ts

key-decisions:
  - "storeId TypeScript type narrowing: explicit string variable after cache/DB branch avoids null type error"
  - "x-store-id from middleware takes priority over JWT store_id in resolveAuth — subdomain context is authoritative"
  - "allowedDevOrigins: ['*.lvh.me'] added to next.config.ts for dev server CORS compatibility"

patterns-established:
  - "Header injection pattern: response.headers.set('x-store-id', storeId) on all response paths"
  - "NextResponse.next({ request: { headers: requestHeaders } }) for passing tenant context to non-Supabase paths"
  - "getCachedStoreId / setCachedStoreId before DB lookup pattern in middleware"

requirements-completed: [TENANT-01]

duration: 3min
completed: "2026-04-03"
---

# Phase 12 Plan 02: Tenant Middleware Summary

**Subdomain-based tenant resolution middleware using slug lookup with 5-min TTL cache, injecting x-store-id/x-store-slug headers for all downstream Server Actions via resolveAuth.ts.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T19:47:50Z
- **Completed:** 2026-04-02T19:50:27Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified + next.config.ts)

## Accomplishments

- Rewrote middleware to extract subdomain slug, look up store_id via admin client, cache result 5 minutes
- Unknown/inactive subdomains rewrite to `/not-found` without redirect (preserves URL, no 308 loop)
- x-store-id and x-store-slug headers injected on all response paths (admin, POS, storefront)
- resolveAuth.ts updated to read x-store-id header first, with JWT app_metadata.store_id fallback
- All existing auth logic preserved: webhook bypass, admin owner check, POS staff/owner check, customer blocking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tenant cache, store-not-found page, and update resolveAuth.ts** - `7e0ca5c` (feat)
2. **Task 2: Rewrite middleware for subdomain tenant resolution** - `059b08d` (feat)

## Files Created/Modified

- `src/lib/tenantCache.ts` — In-memory TTL=5min Map cache, `getCachedStoreId` / `setCachedStoreId` exports
- `src/app/not-found/page.tsx` — "Store not found" server component for unknown subdomains
- `src/lib/resolveAuth.ts` — Added `headers()` import; both `resolveAuth()` and `resolveStaffAuth()` read x-store-id header with JWT fallback
- `src/middleware.ts` — Full rewrite: slug extraction, admin DB lookup, header injection, all auth routing preserved
- `next.config.ts` — Added `allowedDevOrigins: ['*.lvh.me']` for dev subdomain requests
- `.env.example` — Created with `ROOT_DOMAIN=lvh.me:3000` documented

## Decisions Made

- `storeId` TypeScript narrowing: used explicit `let storeId: string` with branching (cached vs DB) to satisfy strict null checks — plan's inline `let storeId = getCachedStoreId()` pattern returned `string | null` which caused a type error at `setCachedStoreId(slug, storeId)`.
- `x-store-id` header takes priority over JWT `app_metadata.store_id` in resolveAuth — the subdomain is the source of truth for tenant context; JWT is backward compatibility fallback during migration.
- `allowedDevOrigins` added to next.config.ts to prevent Next.js 16 dev server from blocking cross-origin subdomain requests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript null type error in storeId assignment**
- **Found during:** Task 2 (middleware rewrite), during `npx next build`
- **Issue:** Plan's `let storeId = getCachedStoreId(slug)` typed as `string | null`. After DB lookup branch, `setCachedStoreId(slug, storeId)` failed: "Argument of type 'string | null' is not assignable to parameter of type 'string'"
- **Fix:** Changed to `const cached = getCachedStoreId(slug); let storeId: string` with explicit branch: `if (cached) { storeId = cached } else { ... storeId = data.id; setCachedStoreId(slug, storeId) }`
- **Files modified:** src/middleware.ts
- **Verification:** `npx next build` passes with `✓ Compiled successfully`
- **Committed in:** `059b08d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type narrowing bug in plan code)
**Impact on plan:** Required fix for build to pass. No scope creep, no behavior change.

## Issues Encountered

None beyond the TypeScript type error documented above.

## Known Stubs

None — no UI components with placeholder data. The `/not-found` page has static text only, which is correct for a 404 page.

## Next Phase Readiness

- Tenant middleware is live. Any subdomain request to `slug.lvh.me:3000` resolves to the correct store_id.
- resolveAuth.ts is tenant-aware across all Server Actions.
- Plan 03 (RLS policies) can now proceed — middleware injects store_id, resolveAuth passes it to DB queries.
- Manual verification: start dev server, visit `demo.lvh.me:3000` (storefront loads), `nonexistent.lvh.me:3000` (store not found), `lvh.me:3000` (root passes through).

## Self-Check: PASSED

- [x] `src/lib/tenantCache.ts` exists with `getCachedStoreId`, `setCachedStoreId`, `TTL_MS = 5 * 60 * 1000`
- [x] `src/app/not-found/page.tsx` exists containing "Store not found"
- [x] `src/lib/resolveAuth.ts` contains `headers` import, `x-store-id` in both auth functions, `app_metadata.store_id` fallback, `server-only`
- [x] `src/middleware.ts` contains `createMiddlewareAdminClient`, `getCachedStoreId`, `x-store-id`, `ROOT_DOMAIN`, `host.split('.')[0]`, `.eq('slug', slug)`, `.eq('is_active', true)`, `/not-found` rewrite, `NextResponse.next({ request: { headers: requestHeaders } })`, `/api/webhooks` bypass, `/admin` auth, `/pos` auth — no `new NextRequest(`, no `server-only`
- [x] `.env.example` contains `ROOT_DOMAIN=lvh.me:3000`
- [x] `npx next build` passes: `✓ Compiled successfully`
- [x] Commit `7e0ca5c` exists (Task 1)
- [x] Commit `059b08d` exists (Task 2)

---
*Phase: 12-multi-tenant-infrastructure*
*Completed: 2026-04-03*
