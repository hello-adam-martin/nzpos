# Phase 18: Code Quality + Test Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 18-code-quality-test-coverage
**Areas discussed:** Coverage strategy, Dead code approach, Error handling, JSDoc scope

---

## Coverage Strategy

### Q1: How strict is the 80% coverage target?

| Option | Description | Selected |
|--------|-------------|----------|
| Hard gate | CI fails if GST, money, auth, RLS paths drop below 80%. Other code has no minimum but coverage is reported. | ✓ |
| Aspirational | Target 80% but don't block CI. Coverage report is informational only. | |
| Graduated | Start aspirational, switch to hard gate once 80% is reached. Ratchet — never allow regression. | |

**User's choice:** Hard gate
**Notes:** None

### Q2: Which modules count as critical paths?

| Option | Description | Selected |
|--------|-------------|----------|
| Named four only | GST, money, auth, RLS. Keep scope tight. | |
| Add Stripe webhooks | Include both webhook handlers in the 80% gate. | |
| Add Stripe + Xero | Also include Xero sync logic. All money-touching code gets the hard gate. | ✓ |

**User's choice:** Add Stripe + Xero
**Notes:** Broader than minimum requirements — user wants all money-touching code covered.

### Q3: Coverage provider?

| Option | Description | Selected |
|--------|-------------|----------|
| v8 | @vitest/coverage-v8 — fast, native Node coverage, zero config. | ✓ |
| Istanbul | @vitest/coverage-istanbul — more mature, better branch detail, slightly slower. | |

**User's choice:** v8
**Notes:** None

### Q4: IRD specimen validation thoroughness?

| Option | Description | Selected |
|--------|-------------|----------|
| Real IRD examples | Find actual IRD-published GST calculation examples and encode as test cases. | ✓ |
| Synthetic edge cases | Generate our own test cases covering rounding, discounts, zero-rated, boundaries. | |
| Both | IRD specimens plus additional synthetic edge cases. | |

**User's choice:** Real IRD examples
**Notes:** Gold standard for compliance.

---

## Dead Code Approach

### Q1: How should dead code be identified?

| Option | Description | Selected |
|--------|-------------|----------|
| Automated tooling | Use knip to scan for unused exports, files, and dependencies. | ✓ |
| Manual review | Read through codebase and remove obvious dead code. | |
| Tooling + manual verify | Run automated scan, then manually review each finding before removing. | |

**User's choice:** Automated tooling
**Notes:** None

### Q2: How aggressive should removal be?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all flagged | If the tool says it's unused, delete it. Trust the tooling. Git preserves history. | ✓ |
| Conservative | Only remove obviously dead code. Preserve exports that might be used externally. | |
| Remove + document | Remove everything flagged but document what was removed in commit messages. | |

**User's choice:** Remove all flagged
**Notes:** None

### Q3: Clean up unused dependencies too?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full cleanup | Use knip to find unused deps too. Remove anything not imported. | ✓ |
| Code only | Focus on source files only. Don't touch package.json. | |

**User's choice:** Yes, full cleanup
**Notes:** None

---

## Error Handling

### Q1: Standardized error response shape?

| Option | Description | Selected |
|--------|-------------|----------|
| { success, error } | Every Server Action returns { success: boolean, error?: string, data?: T }. No stack traces. | ✓ |
| Discriminated union | Return { status: 'ok', data } or { status: 'error', code, message }. More type-safe. | |
| You decide | Claude picks based on existing codebase conventions. | |

**User's choice:** { success, error }
**Notes:** None

### Q2: Structured server-side logging?

| Option | Description | Selected |
|--------|-------------|----------|
| Console.error with context | console.error with action name and store_id. No logging library. Vercel captures output. | ✓ |
| Logging library | Add pino or winston for structured JSON logging. | |
| No logging changes | Just standardize response shape. | |

**User's choice:** Console.error with context
**Notes:** None

### Q3: Route Handler error pattern?

| Option | Description | Selected |
|--------|-------------|----------|
| Same pattern | Route Handlers return NextResponse.json({ success, error }, { status }). Mirror Server Action shape. | ✓ |
| HTTP-only | Route Handlers just use HTTP status codes with minimal body. | |
| You decide | Claude picks based on existing Route Handler conventions. | |

**User's choice:** Same pattern
**Notes:** None

---

## JSDoc Scope

### Q1: How much JSDoc documentation?

| Option | Description | Selected |
|--------|-------------|----------|
| Named files only | Just the 5 files from QUAL-05: gst.ts, requireFeature.ts, tenantCache.ts, xero/sync.ts, provision_store. | |
| Named files + helpers | The 5 named files plus key utility modules (money.ts, resolveAuth.ts, middleware.ts). | |
| All exported functions | Every exported function across the codebase gets a JSDoc comment. | ✓ |

**User's choice:** All exported functions
**Notes:** Broader than minimum requirements — user wants comprehensive JSDoc coverage.

### Q2: Level of detail?

| Option | Description | Selected |
|--------|-------------|----------|
| Function-level | Brief description + @param + @returns. No module-level essays. IDE hover tooltips. | ✓ |
| Module + function | Module-level doc comment at top of file plus function-level docs. | |
| Function + examples | Function-level docs plus @example blocks for complex functions. | |

**User's choice:** Function-level
**Notes:** None

---

## Claude's Discretion

- knip configuration and ignore patterns
- Vitest coverage threshold configuration per critical-path module
- Plan breakdown structure
- Database index recommendations for QUAL-04

## Deferred Ideas

None — discussion stayed within phase scope
