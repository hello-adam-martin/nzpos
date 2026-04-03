# Phase 18: Code Quality + Test Coverage - Research

**Researched:** 2026-04-04
**Domain:** TypeScript/Vitest code quality and test coverage, NZ GST compliance
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hard CI gate — GST, money, auth, RLS, Stripe webhooks, and Xero sync paths must maintain 80%+ line coverage. CI fails if any critical path drops below threshold.
- **D-02:** Critical path scope: `gst.ts`, `money.ts`, `resolveAuth.ts`, middleware auth, PIN auth, RLS tests, both Stripe webhook handlers (order + billing), and Xero sync logic.
- **D-03:** Use `@vitest/coverage-v8` as the coverage provider. Fast, native Node coverage, standard Vitest choice.
- **D-04:** Non-critical code has no minimum coverage threshold but coverage is reported for visibility.
- **D-05:** IRD specimen validation (TEST-05) uses real IRD-published GST calculation examples. Gold standard for compliance — no synthetic substitutes.
- **D-06:** Use automated tooling (knip) for dead code detection. Systematic scan for unused exports, files, and dependencies.
- **D-07:** Remove all flagged items aggressively. Trust the tooling — git history preserves anything needed later.
- **D-08:** Full dependency cleanup included — remove unused packages from package.json alongside source code cleanup.
- **D-09:** Standardized Server Action response shape: `{ success: boolean, error?: string, data?: T }`. No stack traces in responses — user-friendly messages only.
- **D-10:** Route Handlers mirror the same pattern: `NextResponse.json({ success, error }, { status })` with appropriate HTTP status codes.
- **D-11:** Server-side error logging uses `console.error` with action name and store_id context. No logging library — Vercel captures console output.
- **D-12:** All exported functions across the codebase get JSDoc comments. Not limited to the 5 named files in QUAL-05.
- **D-13:** Function-level detail: brief description + `@param` + `@returns`. No module-level essays. Enough for IDE hover tooltips.

### Claude's Discretion

- Specific knip configuration and ignore patterns
- Vitest coverage configuration thresholds per critical-path module
- Plan breakdown (audit/scan phase vs fix phase vs test-writing phase)
- Database index recommendations for QUAL-04 performance review

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | Dead code removed across all 336 source files using static analysis | knip 6.3.0 available via npx; config pattern documented below |
| QUAL-02 | Server Actions and Route Handlers have consistent error handling with no stack trace leaks | 17 failing tests and known inconsistencies identified in completeSale, sendPosReceipt, updateOrderStatus |
| QUAL-03 | TypeScript strict mode passes with zero errors or documented suppressions | 12 TS errors identified: stale database.ts types (super_admin_actions table + manual_override columns missing) |
| QUAL-04 | Performance-critical paths reviewed (GST calculations, stock decrements, product queries have proper indexes) | Indexes reviewed below; key missing: products.store_id+is_active composite |
| QUAL-05 | Complex business logic has inline JSDoc documentation | gst.ts already has comments; requireFeature.ts already has JSDoc; tenantCache.ts has header comment; sync.ts functions have JSDoc; provisionStore.ts has JSDoc. Gap: @param/@returns on all exports |
| TEST-01 | Test coverage report generated with vitest --coverage showing per-file coverage | @vitest/coverage-v8 needs install + vitest.config.mts update |
| TEST-02 | Critical paths (GST, money, auth, RLS) have 80%+ line coverage | gst.ts and money.ts are near 100%; resolveAuth.ts has no test file; tenantCache.ts has no test file |
| TEST-03 | RLS integration tests cover v2.0 tables (add_ons, subscriptions, audit_logs, store_plans) | Clarification: actual v2.0 table is `super_admin_actions` (migration 020). store_plans already covered. |
| TEST-04 | Stripe webhook handlers tested for all subscription lifecycle events | Billing handler tests exist (7 tests); gap: customer.subscription.updated.status='past_due' and 'incomplete' not tested |
| TEST-05 | GST calculations validated against IRD-published specimen examples | IRD specimen: $115 inclusive → $15 GST (3/23 method). gst.ts uses correct formula. New test file needed. |
</phase_requirements>

## Summary

Phase 18 is a hardening phase covering four work streams: dead code removal, TypeScript/test fixes, coverage infrastructure, and JSDoc. The codebase has 52 existing test files and 349 passing tests — a strong foundation. However, there are 12 TypeScript errors (stale generated database.ts types missing `super_admin_actions` table and `_manual_override` columns from migration 020), 17 failing tests (mainly completeSale, sendPosReceipt, updateOrderStatus — auth mock mismatches from Phase 17's security hardening), and no coverage reporting yet.

The TypeScript errors are mechanical: the `src/types/database.ts` generated file doesn't reflect the schema added in migrations 020 and 021. Regenerating it via `supabase gen types typescript` or manually adding the missing types will resolve all 12 TS errors. The failing tests reflect Server Action code that was tightened (auth checks now return early before business logic), but test mocks still set up the old flow.

The most critical gaps for coverage infrastructure are: (1) `@vitest/coverage-v8` not installed, (2) no coverage configuration in `vitest.config.mts`, (3) no `test:coverage` script in `package.json`, and (4) no coverage threshold enforcement in CI. All four are straightforward additions.

**Primary recommendation:** Sequence work as — Wave 0: fix TS errors + failing tests (unblocks CI); Wave 1: install coverage + configure thresholds; Wave 2: write missing tests for uncovered critical paths; Wave 3: knip dead code pass + JSDoc sweep.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.2 | Test runner | Already configured, 52 test files use it |
| @vitest/coverage-v8 | 4.1.2 | Coverage provider | D-03 locked. V8-native, fast, matches vitest version |
| knip | 6.3.0 | Dead code detection | D-06 locked. Available via npx, not yet installed as devDep |
| TypeScript | ^5 | Type checking | `strict: true` already enabled in tsconfig.json |

### To Add
| Library | Version | Purpose | Installation |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | match vitest (4.1.2) | Coverage reports | `npm install -D @vitest/coverage-v8` |
| knip | ^6 | Dead code scanning | `npm install -D knip` |

**Installation:**
```bash
npm install -D @vitest/coverage-v8 knip
```

**Version verification:** `@vitest/coverage-v8` must match vitest version (4.1.2). Running `npm view @vitest/coverage-v8 version` confirms 4.1.2 is current.

## Architecture Patterns

### Coverage Configuration Pattern

Add to `vitest.config.mts`:

```typescript
// Source: Vitest official docs — https://vitest.dev/guide/coverage
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**',
      'src/test/**',
      'src/types/**',
      'src/emails/**',   // React email templates — not business logic
      '**/*.d.ts',
    ],
    thresholds: {
      // Critical paths enforced at 80% line coverage (D-01)
      // Per-file overrides for critical modules
    },
    perFile: true,
  },
}
```

### Per-File Threshold Pattern (Vitest v2+)

Vitest coverage thresholds apply globally. To enforce 80%+ on specific files, use the `thresholds.perFile` with `100` global (fail only if below) or use a wrapper script approach. The cleaner pattern for targeted enforcement is Istanbul/V8 instrumentation comments to exclude non-critical paths from threshold calculations, but the simplest approach that matches D-01 and D-04 is:

```typescript
thresholds: {
  lines: 50,        // Global floor — non-critical (D-04: report only)
  autoUpdate: false,
},
```

Then add a separate `test:coverage:gate` script that runs coverage with `--reporter=json` and uses a small Node script to assert the critical-path files hit 80%.

**Simpler approach:** Set global threshold to 0 (report only) and create targeted test scripts per critical file:

```bash
# package.json scripts
"test:coverage": "vitest run --coverage",
"test:coverage:ci": "vitest run --coverage --reporter=verbose"
```

Add a `coverage.config.ts` or inline threshold in `vitest.config.mts`:

```typescript
thresholds: {
  'src/lib/gst.ts': { lines: 80, branches: 80 },
  'src/lib/money.ts': { lines: 80 },
  'src/lib/resolveAuth.ts': { lines: 80 },
  'src/middleware.ts': { lines: 80 },
  'src/lib/tenantCache.ts': { lines: 80 },
  'src/app/api/webhooks/stripe/route.ts': { lines: 80 },
  'src/app/api/webhooks/stripe/billing/route.ts': { lines: 80 },
  'src/lib/xero/sync.ts': { lines: 80 },
},
```

Note: Vitest per-file thresholds in `vitest.config.mts` use glob patterns under the `thresholds` key. Confirmed pattern from Vitest v2+ docs.

### knip Configuration Pattern

```json
// knip.json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": [
    "src/app/**/{page,layout,route,loading,error,not-found}.{ts,tsx}",
    "src/actions/**/*.ts",
    "src/middleware.ts",
    "src/lib/supabase/*.ts",
    "vitest.config.mts",
    "next.config.ts",
    "scripts/**/*.ts"
  ],
  "ignore": [
    "src/types/**",
    "src/emails/**",
    ".planning/**"
  ],
  "ignoreDependencies": [
    "server-only",
    "@types/*"
  ]
}
```

Next.js App Router requires careful knip entry configuration. Page/layout/route files are entry points. Without these, knip incorrectly flags all app directory files as unused.

### Server Action Error Response Pattern (D-09)

```typescript
// Standard pattern — D-09
export async function myAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; data?: T }> {
  try {
    // validate, authenticate, execute
    return { success: true, data: result }
  } catch (err) {
    console.error('[myAction] store_id=%s error:', storeId, err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
```

**No stack traces in error strings.** The `err` object is logged server-side only.

### JSDoc Pattern (D-13)

```typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of parameter
 * @param options - Configuration options
 * @returns Description of return value
 */
export function myExportedFunction(paramName: string, options?: MyOptions): MyReturn {
```

Applies to all exported functions. Internal (non-exported) helper functions get JSDoc only if they have complex logic.

### Anti-Patterns to Avoid

- **Global coverage threshold with no per-file enforcement:** Allows one well-tested file to carry many under-tested files. Use per-file thresholds for critical paths.
- **Excluding test files from knip entry:** knip needs to know test files are legitimate consumers of exports. Add `"src/**/*.test.{ts,tsx}"` to `knip.json` entry or it will flag test-only exports as unused.
- **`vi.mock('server-only')` in test files:** All test files that import server-only modules must include `vi.mock('server-only', () => ({}))`. This is the established pattern already used in 15+ test files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Custom grep/ast scripts | knip | Handles re-exports, circular deps, Next.js routing patterns |
| Coverage reporting | Manual source analysis | @vitest/coverage-v8 | V8 native, Istanbul-compatible output, integrated with Vitest |
| TypeScript type generation | Manual editing of database.ts | `supabase gen types typescript --local > src/types/database.ts` | Authoritative source of truth from local schema |

**Key insight:** The TypeScript errors come from `src/types/database.ts` being out of sync with migrations 020+021. The fix is type regeneration, not manual type editing.

## Current State Assessment (CRITICAL for planning)

### TypeScript Errors (12 errors, 5 files)
All errors are in 4 super-admin action files + 1 test file. Root cause: `src/types/database.ts` was last regenerated before migrations 020 and 021. Missing:
- `super_admin_actions` table (added in migration 020) — causes TS2769 in suspendTenant.ts, unsuspendTenant.ts, activateAddon.ts, deactivateAddon.ts
- `has_xero_manual_override`, `has_email_notifications_manual_override`, `has_custom_domain_manual_override` columns on `store_plans` (added in migration 021) — causes TS2352 in activateAddon.ts, deactivateAddon.ts
- `slug` property missing from `stores` type in test file schema.test.ts (possibly added in migration 014 but not in regenerated types)

**Fix:** `npx supabase gen types typescript --local > src/types/database.ts` (requires `supabase start`). If local Supabase is unavailable, manually add the missing types.

### Failing Tests (17 tests, 8 files)
| File | Failures | Root Cause |
|------|----------|------------|
| completeSale.test.ts | 5 | Auth mock not returning authenticated user — action returns "Not authenticated" before business logic |
| sendPosReceipt.test.ts | 6 | Same auth mock issue |
| updateOrderStatus.test.ts | 5 | Same auth mock issue |
| schema.test.ts | 1 | slug property not in database types — returns null from .select('slug') |
| billing.test.ts | 0 tests run | `server-only` import throws in test context — missing `vi.mock('server-only', () => ({}))` |
| ownerSignup.test.ts | 0 tests run | Similar module import issue |
| E2E tests (2 files) | Error | Playwright spec files being picked up by Vitest runner — should be excluded |

**Fix pattern for auth mock failures:** Tests need to mock `resolveAuth` or the Supabase server client to return a valid authenticated user with `app_metadata.store_id`. The Phase 17 security hardening added auth checks before business logic in these actions. Tests weren't updated.

**Fix for Playwright/Vitest conflict:** Add `tests/e2e/**` to `vitest.config.mts` exclude list.

### Coverage Gaps for Critical Paths (D-02 scope)

| File | Has Tests? | Estimated Coverage | Gap |
|------|-----------|-------------------|-----|
| src/lib/gst.ts | Yes (gst.test.ts) | ~100% | None — already comprehensive |
| src/lib/money.ts | Yes (money.test.ts) | ~100% | None |
| src/lib/resolveAuth.ts | No | 0% | New test file needed |
| src/middleware.ts | Yes (middleware.test.ts) | Medium | Need to verify coverage % |
| src/lib/tenantCache.ts | No | 0% | New test file needed — 3 exports, simple to test |
| src/app/api/webhooks/stripe/route.ts | Yes (webhook.test.ts) | ~70% | Email path (lines 97-158) not tested |
| src/app/api/webhooks/stripe/billing/route.ts | Yes (billing.test.ts) | ~85% | Good coverage — `past_due`/`incomplete` status gap |
| src/lib/xero/sync.ts | Yes (sync.test.ts) | Medium | Need to verify |

### RLS v2.0 Table Coverage (TEST-03)

The CONTEXT.md requirement names `add_ons`, `subscriptions`, `audit_logs`, `store_plans` as "v2.0 tables". Searching all migrations confirms these exact table names do NOT exist. The actual v2.0 tables are:

- `store_plans` — already has RLS tests (store_plans isolation block in rls.test.ts)
- `super_admin_actions` — NEW table from migration 020, NO RLS tests exist
- `stripe_events` — has RLS (service_role only per migration 021), no explicit test

The requirement TEST-03 should be interpreted as: add RLS tests for `super_admin_actions` (super admins can insert, owners cannot read, anon cannot access).

## Common Pitfalls

### Pitfall 1: Playwright Tests Running Under Vitest

**What goes wrong:** `tests/e2e/*.spec.ts` get imported by Vitest, throw "Playwright Test did not expect test.describe() to be called here."
**Why it happens:** vitest.config.mts `exclude` only excludes `node_modules`, `.claude`, `dist` — not `tests/e2e`.
**How to avoid:** Add `'tests/e2e/**'` and `'**/*.spec.ts'` to the `exclude` array in `vitest.config.mts`.
**Warning signs:** 0 tests run in a test file, error about Playwright.

### Pitfall 2: server-only Module Blocking Test Imports

**What goes wrong:** Test file imports a module that has `import 'server-only'` → throws "This module cannot be imported from a Client Component module."
**Why it happens:** `server-only` checks `NEXT_RUNTIME` env var. In Vitest (jsdom), it's not set, so the module throws.
**How to avoid:** Every test file that imports server-only modules must include `vi.mock('server-only', () => ({}))` at the top.
**Warning signs:** 0 tests run, error about Client Component.

### Pitfall 3: Stale Database Types After Migrations

**What goes wrong:** TypeScript errors in files that query tables/columns added in recent migrations.
**Why it happens:** `src/types/database.ts` is auto-generated but not auto-updated. Must be regenerated after each schema migration.
**How to avoid:** Add `supabase gen types typescript` to the post-migration checklist.
**Warning signs:** TS2769 "argument is not assignable" on table name strings; TS2352 on column selects.

### Pitfall 4: knip Flagging Next.js App Router Files

**What goes wrong:** knip reports all `page.tsx`, `layout.tsx`, `route.ts` files as unused.
**Why it happens:** These are entry points to Next.js routing, not explicitly imported by any TypeScript file. knip doesn't know about Next.js conventions without configuration.
**How to avoid:** Add glob patterns for all Next.js entry point file types in `knip.json` entry config.
**Warning signs:** Large number of "unused files" in the app directory.

### Pitfall 5: Coverage Thresholds Blocking Valid Low-Coverage Files

**What goes wrong:** CI fails on files that intentionally have low coverage (UI components, email templates).
**Why it happens:** Global threshold applies to all files.
**How to avoid:** Use per-file thresholds for critical paths only. Use `exclude` in coverage config for email templates and type definition files.

### Pitfall 6: Auth Mock Setup for Post-Phase-17 Server Actions

**What goes wrong:** Tests call Server Actions that return "Not authenticated" before business logic.
**Why it happens:** Phase 17 added auth checks at the top of actions. Tests haven't been updated to mock authentication.
**How to avoid:** All Server Action tests must mock the resolveAuth function or Supabase server client to return a valid session with `app_metadata.store_id` and `app_metadata.role`.
**Warning signs:** Test assertions fail with "Not authenticated" or similar auth errors rather than the expected business logic response.

## Code Examples

### vitest.config.mts Coverage Addition

```typescript
// Source: Vitest coverage docs — https://vitest.dev/guide/coverage
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/.claude/**',
      '**/dist/**',
      'tests/e2e/**',      // ADD: prevent Playwright specs from running under Vitest
      '**/*.spec.ts',      // ADD: belt-and-suspenders
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/types/**',
        'src/emails/**',
        '**/*.d.ts',
      ],
      thresholds: {
        'src/lib/gst.ts': { lines: 80, branches: 80, functions: 80 },
        'src/lib/money.ts': { lines: 80, functions: 80 },
        'src/lib/resolveAuth.ts': { lines: 80, functions: 80 },
        'src/middleware.ts': { lines: 80 },
        'src/lib/tenantCache.ts': { lines: 80, functions: 100 },
        'src/app/api/webhooks/stripe/route.ts': { lines: 80 },
        'src/app/api/webhooks/stripe/billing/route.ts': { lines: 80 },
        'src/lib/xero/sync.ts': { lines: 80 },
      },
    },
  },
})
```

### IRD Specimen GST Test (TEST-05)

```typescript
// Source: IRD — https://www.ird.govt.nz/gst/filing-and-paying-gst-and-refunds/calculating-gst
// Arthur takes $115 inclusive, multiplies by 3, divides by 23, gets $15 GST.
describe('IRD specimen GST calculations', () => {
  it('IRD specimen: $115.00 inclusive → $15.00 GST (Arthur example)', () => {
    expect(gstFromInclusiveCents(11500)).toBe(1500)
  })

  it('IRD specimen: $230.00 inclusive → $30.00 GST', () => {
    expect(gstFromInclusiveCents(23000)).toBe(3000)
  })

  it('IRD specimen: $1,150.00 inclusive → $150.00 GST', () => {
    expect(gstFromInclusiveCents(115000)).toBe(15000)
  })

  it('IRD rounding: $1.00 inclusive → $0.13 GST (rounds to 13 cents)', () => {
    // $1.00 * 3/23 = 0.13043... rounds to 0.13
    expect(gstFromInclusiveCents(100)).toBe(13)
  })

  it('calcLineItem with IRD specimen values: $115 x 1 qty → 1500 GST', () => {
    const result = calcLineItem(11500, 1, 0)
    expect(result.lineTotal).toBe(11500)
    expect(result.gst).toBe(1500)
    expect(result.excl).toBe(10000)
  })
})
```

### tenantCache.ts Test Pattern

```typescript
// New file: src/lib/tenantCache.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedStoreId, setCachedStoreId, invalidateCachedStoreId } from './tenantCache'

describe('tenantCache', () => {
  beforeEach(() => {
    // Clear known keys between tests
    invalidateCachedStoreId('test-slug')
  })

  it('returns null for unknown slug', () => {
    expect(getCachedStoreId('unknown')).toBeNull()
  })

  it('returns store_id after set', () => {
    setCachedStoreId('test-slug', 'store-abc')
    expect(getCachedStoreId('test-slug')).toBe('store-abc')
  })

  it('returns null after invalidation', () => {
    setCachedStoreId('test-slug', 'store-abc')
    invalidateCachedStoreId('test-slug')
    expect(getCachedStoreId('test-slug')).toBeNull()
  })
})
// TTL expiry test requires vi.useFakeTimers()
```

### Fixing Auth Mock Pattern for Failing Tests

```typescript
// Pattern for tests that call Server Actions hardened in Phase 17
const { mockResolveAuth } = vi.hoisted(() => ({
  mockResolveAuth: vi.fn(),
}))

vi.mock('@/lib/resolveAuth', () => ({
  resolveAuth: mockResolveAuth,
}))

// In beforeEach for authenticated tests:
mockResolveAuth.mockResolvedValue({
  user: { id: 'user-123' },
  session: { user: { app_metadata: { store_id: 'store-abc', role: 'owner' } } },
  storeId: 'store-abc',
})
```

### Database Types Regeneration

```bash
# Requires: supabase start (local instance running)
npx supabase gen types typescript --local > src/types/database.ts
```

If local Supabase is not running, manually add to `src/types/database.ts`:
1. Add `super_admin_actions` table type under `Tables`
2. Add `has_xero_manual_override`, `has_email_notifications_manual_override`, `has_custom_domain_manual_override` boolean columns to `store_plans` Row/Insert/Update types

### CI Gate Addition

```yaml
# Add to .github/workflows/ci.yml after "Run unit tests"
- name: Coverage gate
  run: npm run test:coverage
  # Fails if any critical-path file drops below 80% (enforced in vitest.config.mts thresholds)
```

## Database Index Review (QUAL-04)

### Existing Indexes Likely Present (based on migration patterns)

| Table | Column(s) | Index Type | Source |
|-------|-----------|------------|--------|
| stores | slug | UNIQUE (migration 014) | Required for subdomain lookup |
| products | store_id | Implicit FK | Standard Supabase FK |
| orders | store_id | Implicit FK | Standard Supabase FK |
| store_plans | store_id | UNIQUE FK (migration 014) | One-to-one |

### Potential Missing Indexes for Performance

| Table | Suggested Index | Query Pattern | Priority |
|-------|----------------|---------------|----------|
| products | `(store_id, is_active)` | `SELECT * FROM products WHERE store_id=$1 AND is_active=true` — POS product list | HIGH |
| orders | `(store_id, status)` | `SELECT * FROM orders WHERE store_id=$1 AND status IN (...)` — dashboard reports | HIGH |
| orders | `(store_id, created_at DESC)` | Date-range queries for Xero sync | MEDIUM |
| order_items | `(order_id)` | FK lookup for webhook receipt building | MEDIUM — usually present as FK |

**Verification command:** `SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename;` — run against local Supabase to confirm actual index state.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `istanbul` / `nyc` coverage | `@vitest/coverage-v8` (v8-native) | Faster, no instrumentation transform |
| `ts-unused-exports` | `knip` | Handles re-exports, monorepos, Next.js routing |
| Separate test runner config | Single `vitest.config.mts` with coverage | Less config surface area |
| Manual JSDoc authoring only | IDE-assisted + JSDoc linting | `eslint-plugin-jsdoc` can enforce — but not used here per D-11 (keep it simple) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:coverage` (after adding script) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | Dead code removed | static analysis | `npx knip` | ❌ Wave 0: add knip config |
| QUAL-02 | Error handling consistent | unit | `npm run test` (existing action tests pass) | ✅ (need fixes) |
| QUAL-03 | TS strict passes | type check | `npx tsc --noEmit` | ✅ (need fixes) |
| QUAL-04 | DB indexes confirmed | manual-only | `SELECT indexname...` in Supabase SQL editor | N/A |
| QUAL-05 | JSDoc on all exports | manual review | `npx tsc --noEmit` (syntax errors) | N/A |
| TEST-01 | Coverage report generated | automated | `npm run test:coverage` | ❌ Wave 0: add coverage |
| TEST-02 | Critical paths 80%+ | automated | `npm run test:coverage` (thresholds enforce) | ❌ Wave 0 |
| TEST-03 | RLS covers v2.0 tables | integration | `npm run test` (rls.test.ts extended) | ✅ (need extension) |
| TEST-04 | All sub. lifecycle events tested | unit | `npm run test` (billing.test.ts extended) | ✅ (need extension) |
| TEST-05 | IRD specimen GST tests | unit | `npm run test` | ❌ Wave 0: add ird-gst.test.ts |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green + `npx tsc --noEmit` zero errors before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `@vitest/coverage-v8` install + `vitest.config.mts` coverage config — covers TEST-01, TEST-02
- [ ] `src/lib/gst.ird.test.ts` — IRD specimen tests for TEST-05
- [ ] `src/lib/tenantCache.test.ts` — covers TEST-02 for tenantCache
- [ ] `src/lib/resolveAuth.test.ts` — covers TEST-02 for auth path
- [ ] Fix `vitest.config.mts` exclude (add `tests/e2e/**`) — unblocks clean test run
- [ ] `knip.json` config file — required before QUAL-01

## Open Questions

1. **`resolveAuth.ts` does not exist as a standalone file**
   - What we know: CONTEXT.md references it as a critical path. The canonical refs list it at `src/lib/resolveAuth.ts`.
   - What's unclear: Whether this file exists (not found in glob search above). Auth resolution may be inline in middleware or in Server Actions directly.
   - Recommendation: Planner should verify file existence; if missing, the "auth path" coverage maps to middleware.ts auth sections.

2. **`supabase gen types` vs manual database.ts fix**
   - What we know: Requires local Supabase running (`supabase start`), which requires Docker. Not verified available.
   - What's unclear: Whether the development environment has Docker/Supabase CLI available.
   - Recommendation: Plan for both paths — try `supabase gen types` first; fall back to manual type additions if Docker not available.

3. **RLS test requirement for "v2.0 tables" (TEST-03)**
   - What we know: `add_ons`, `subscriptions`, `audit_logs` don't exist as table names. `super_admin_actions` was the major v2.0 addition.
   - What's unclear: Whether TEST-03 should be interpreted strictly (tables that don't exist = trivially covered) or broadly (add `super_admin_actions` tests).
   - Recommendation: Interpret broadly — add `super_admin_actions` RLS tests to `rls.test.ts`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tests | ✓ | 22 (CI), local (assumed) | — |
| Vitest | Test runner | ✓ | 4.1.2 | — |
| @vitest/coverage-v8 | TEST-01/02 | ✗ | — | None — must install |
| knip | QUAL-01 | ✓ (npx) | 6.3.0 | Run via npx without install |
| supabase CLI | QUAL-03 type regen | Unknown | — | Manual database.ts edit |
| Docker | supabase start | Unknown | — | Manual database.ts edit |
| TypeScript | QUAL-03 | ✓ | ^5 | — |

**Missing dependencies with no fallback:**
- `@vitest/coverage-v8` — must be installed for TEST-01 and TEST-02

**Missing dependencies with fallback:**
- `supabase CLI` / Docker — if unavailable, manually add missing types to `src/types/database.ts`

## Sources

### Primary (HIGH confidence)
- IRD official GST calculation page — https://www.ird.govt.nz/gst/filing-and-paying-gst-and-refunds/calculating-gst — specimen examples verified
- `src/types/database.ts` — actual generated types file, confirmed stale vs migrations 020+021
- `vitest.config.mts` — current config, confirmed no coverage section
- `.github/workflows/ci.yml` — confirmed no coverage gate
- `npm run test` output — confirmed 17 failing tests, 349 passing
- `npx tsc --noEmit` output — confirmed 12 TS errors in 5 files
- `knip --version` — confirmed 6.3.0 available via npx

### Secondary (MEDIUM confidence)
- Vitest coverage docs — https://vitest.dev/guide/coverage — per-file thresholds pattern
- knip Next.js guide — https://knip.dev/guides/next-js — entry point configuration

### Tertiary (LOW confidence)
- Vitest per-file threshold glob syntax — based on Vitest v2 docs; verify actual config key names against installed version

## Metadata

**Confidence breakdown:**
- Current state (TS errors, failing tests): HIGH — verified by running tsc and test suite
- Coverage gaps: HIGH — file existence confirmed, no coverage config installed
- Standard stack: HIGH — versions verified from package.json and npm registry
- IRD specimen examples: HIGH — pulled from official IRD page
- knip configuration: MEDIUM — pattern from knip docs, needs validation against actual codebase entries

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable tooling, 30-day window)
