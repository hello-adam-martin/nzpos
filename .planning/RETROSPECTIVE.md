# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-02
**Phases:** 6 | **Plans:** 33 | **Tests:** 502

### What Was Built
- Full retail POS system: iPad checkout with product grid, cart, discounts, EFTPOS confirmation, atomic stock decrement
- Online storefront with Stripe Checkout, promo codes, idempotent webhooks, click-and-collect
- Admin dashboard with order management, refunds, cash-up reconciliation, sales/GST/stock reports
- Xero accounting integration with OAuth, daily automated sync, Vault-backed token storage
- Multi-tenant Postgres with RLS via custom JWT claims, dual auth (owner email + staff PIN)
- PWA-installable on iPad with CI/CD pipeline

### What Worked
- **Wave-based parallel execution** — running multiple plan agents in worktree isolation kept phases moving fast
- **TDD for critical paths** — GST module, Xero date boundaries, and sync engine all had tests before implementation, caught real bugs
- **Refresh-on-transaction over Realtime** — simpler, worked perfectly for single-terminal use case
- **Integer cents everywhere** — zero floating-point money bugs across the entire codebase
- **Design system upfront** — navy/amber tokens meant consistent UI without iteration cycles

### What Was Inefficient
- **SUMMARY.md one-liner extraction** — some summaries had malformed frontmatter, causing garbage in milestone roll-up
- **Tailwind v4 spacing tokens** — custom `--spacing-*` CSS variables conflicted with Tailwind v4's built-in spacing scale, broke cash-up and login pages
- **ROADMAP.md / REQUIREMENTS.md drift** — phases 1-4 were never marked complete in ROADMAP.md checkbox list; requirements traceability table had stale "Pending" status for shipped features
- **Phase 3 plan count mismatch** — ROADMAP showed "0/TBD" plans but Phase 3 had 6 completed plans on disk

### Patterns Established
- `as any` for Supabase queries on tables not yet in generated types (new migration tables)
- Server Actions with Zod `.safeParse()` at the boundary, typed return `{ error: string } | { data: T }`
- Cart state as pure functions (`calcCartTotals`) tested independently from UI
- Vault RPC pattern for sensitive tokens (SECURITY DEFINER, service_role only)
- `formatNZD()` as single source of truth for NZD currency display

### Key Lessons
1. **Tailwind v4 spacing tokens are a trap** — `max-w-sm`, `px-md`, etc. resolve to the spacing scale in v4 (not breakpoint or semantic values). Always use numeric equivalents (`max-w-96`, `px-4`).
2. **Keep planning artifacts in sync** — ROADMAP.md checkboxes, REQUIREMENTS.md traceability, and STATE.md progress all drifted from reality. Automate or enforce updates at phase transitions.
3. **Supabase generated types lag behind migrations** — new tables from a migration won't appear in `database.ts` until `supabase gen types` runs against the live DB. Use `as any` escape hatch until then.
4. **Preview tool caches Server Components aggressively** — after editing server-rendered pages, stop and restart the dev server entirely rather than relying on HMR.

### Cost Observations
- Model mix: ~70% opus (execution), ~20% sonnet (research/subagents), ~10% haiku (exploration)
- Sessions: ~8 across the milestone
- Notable: parallel worktree agents for phase execution were the biggest throughput multiplier

---

## Milestone: v2.0 — SaaS Platform

**Shipped:** 2026-04-03
**Phases:** 10 | **Plans:** 33 | **Tests:** 365+

### What Was Built
- Multi-tenant SaaS infrastructure: wildcard subdomain routing, tenant cache, RLS isolation for 14 tables, cross-tenant security test suite
- Self-serve merchant signup: email verification, atomic store provisioning, rate limiting, reserved slug blocking
- Store setup wizard with 3-step onboarding, logo upload, dashboard checklist, admin settings/branding
- Marketing landing page: hero, features grid, pricing cards, mobile hamburger nav (pure CSS), fully static
- Stripe billing: per-add-on subscriptions (Xero, email, custom domain), feature gating via JWT + DB fallback, billing webhook, admin billing page with portal link
- Super admin panel: tenant list with search/filter/pagination, tenant detail, suspend/unsuspend with audit trail, manual add-on overrides
- v1.1 features: barcode scanning, screen receipts, email notifications (4 templates), customer accounts, partial refunds

### What Worked
- **Parallel worktree agents** — Wave 2 plans (16-02 middleware + 16-03 UI) ran simultaneously in isolated worktrees, zero conflicts
- **TDD for server actions** — super admin actions, billing webhook, and signup all had tests first; caught Zod v4 UUID strictness and server-only mock issues early
- **requireFeature() dual-path pattern** — JWT fast path for reads, DB fallback for mutations; clean, low-latency feature gating
- **Atomic provisioning RPC** — SECURITY DEFINER function handles auth user + store + staff + store_plans in one transaction, no partial states
- **Design system consistency** — navy/amber tokens carried through all new surfaces without design review cycles

### What Was Inefficient
- **MKTG-01/02 not checked off** — marketing landing page was fully built in Phase 14 but requirements were never marked complete in traceability table
- **v1.1/v2.0 milestone boundary confusion** — STATE.md tracked one milestone while ROADMAP.md showed two; required manual reconciliation at completion
- **SUMMARY.md one-liner quality** — many summaries still had "One-liner:" placeholder or deviation notes instead of actual one-liners
- **Phase 7 production deploy incomplete** — DEPLOY-02/03/04 were deferred indefinitely but Phase 7 was marked complete, creating ambiguity

### Patterns Established
- `server-only` mock `vi.mock('server-only', () => ({}))` required in all Server Action tests
- `vi.hoisted()` for mock functions in `vi.mock()` factories — avoids TDZ ReferenceError
- Middleware admin client pattern for bypassing RLS in tenant resolution
- `x-store-id` middleware header takes priority over JWT store_id — subdomain is authoritative
- Feature gating as first operation in gated Server Actions — before auth, before business logic
- Zod v4 UUID validation requires RFC 4122-compliant UUIDs (version bits + variant bits)
- Client wrapper extraction pattern: `TenantDetailActions.tsx` keeps parent as Server Component

### Key Lessons
1. **Zod v4 is strict about UUIDs** — zeroed-out fake UUIDs (`00000000-...`) fail validation. All test UUIDs must have correct version (4) and variant (8/9/a/b) bits.
2. **Track milestone boundaries explicitly** — config.json and STATE.md should agree on milestone version. Ambiguity at completion requires manual reconciliation.
3. **Mark requirements complete during execution** — not retroactively. MKTG-01/02 built in Phase 14 but showed "Pending" at milestone end.
4. **Separate billing webhook secrets** — STRIPE_BILLING_WEBHOOK_SECRET must differ from STRIPE_WEBHOOK_SECRET when endpoints are separate.
5. **No server-only import in Route Handlers** — API routes are already server-side; the import causes Next.js 16 build issues.

### Cost Observations
- Model mix: ~60% opus (orchestration), ~35% sonnet (executor/verifier agents), ~5% haiku
- Notable: worktree isolation for parallel agents was again the biggest throughput win — zero merge conflicts across 10 phases

---

## Milestone: v2.1 — Hardening & Documentation

**Shipped:** 2026-04-04
**Phases:** 4 | **Plans:** 14 | **Tests:** 434

### What Was Built
- Full security audit across 9 domains: 23 findings (2 Critical, 14 High, 7 Low), all resolved — IDOR, RLS gaps, missing Zod validation, error leaks
- CSP Report-Only headers, server-only guards on all 48 Server Actions, IP-level PIN rate limiting
- Code quality: dead code removal via knip, standardized error handling, JSDoc on 17 lib/action files, composite performance indexes
- Test coverage: IRD GST specimens, resolveAuth, tenantCache, RLS v2.0 tables, Stripe billing lifecycle
- Developer docs: setup guide, env vars reference, architecture overview with 5 Mermaid diagrams, 48-action Server Action inventory
- Production deployment runbook: Supabase (23 migrations), Stripe live keys (two webhook endpoints), Vercel wildcard DNS (NS delegation), 6-item smoke test
- Merchant onboarding guide: signup through first sale walkthrough, GST compliance with worked examples, legal disclaimer

### What Worked
- **Security audit as separate read-then-fix flow** — Phase 17 split into audit report (17-01) then fix waves by severity. Produced a referenceable findings doc and systematic remediation.
- **Documentation-only phases execute fast** — Phases 19 and 20 (pure docs) completed in one wave each with parallel agents. No code conflicts, no test regressions.
- **Regression gate between phases** — running prior phase tests before verification caught zero regressions across all 4 phases, validating that hardening changes were isolated.
- **gsd-tools roadmap automation** — plan progress, phase completion, and requirement marking all handled by CLI. No more manual ROADMAP.md drift.

### What Was Inefficient
- **SUMMARY.md one-liner quality still inconsistent** — some summaries returned "One-liner:" placeholder or "Migration 021" instead of meaningful descriptions. Third milestone with this issue.
- **Nyquist validation for docs phases** — VALIDATION.md was created for Phase 20 (docs-only) but all verification was grep-based file existence checks. The validation framework adds overhead without value for non-code phases.
- **Phase 17 plan count** — started with 4 plans, needed a 5th gap-closure plan for remaining server-only guards and IDOR policy drop. The initial audit underestimated scope.

### Patterns Established
- Security audit → findings report → fix-by-severity → gap closure is the established remediation pattern
- `check_rate_limit` SECURITY DEFINER RPC for serverless-compatible rate limiting (no in-memory state)
- `docs/` folder with README.md index as the canonical documentation location
- Deploy guide as single linear doc (no cross-references to lose)
- NS delegation (not CNAME) for Vercel wildcard SSL — documented as Critical callout

### Key Lessons
1. **Documentation phases don't need Nyquist validation** — grep-based checks are sufficient. Consider auto-detecting doc-only phases and skipping VALIDATION.md.
2. **Security audits always surface more than expected** — plan for gap-closure from the start. Budget 20% extra plans for hardening milestones.
3. **Keep SUMMARY.md one-liners as the first field** — many extractors depend on it. Summaries without meaningful one-liners break milestone roll-up reports.
4. **Two Stripe webhook endpoints need two secrets** — this was a v2.0 lesson that v2.1 docs made explicit. Documented in deploy.md with a Critical warning.

### Cost Observations
- Model mix: ~50% opus (orchestration + planning), ~50% sonnet (research/execution/verification)
- Sessions: ~3 across the milestone
- Notable: documentation phases had the fastest execution — no build/test cycles, just write + verify content

---

## Milestone: v3.0 — Inventory Management

**Shipped:** 2026-04-05
**Phases:** 3 | **Plans:** 11

### What Was Built
- Service product type with `physical`/`service` column, stock-skip in checkout RPCs, refund guards, CSV import support
- Free-tier simplification: all stock UI gated behind `has_inventory`, zero noise for non-subscribers
- Inventory add-on core: append-only stock_adjustments audit table, adjust_stock and complete_stocktake SECURITY DEFINER RPCs, manual adjustments with reason codes
- Stocktake workflow: session lifecycle (create/commit/discard), count entry with 800ms auto-save, barcode scan, variance review with semantic colors
- Feature gating: Stripe billing checkout, `requireFeature('inventory', { requireDbCheck: true })` on all mutations, JWT fast-path for UI, super admin override
- POS/Storefront integration: stock badges, out-of-stock cart blocking, sold-out states — all gated behind subscription

### What Worked
- **SECURITY DEFINER RPCs for stock mutations** — adjust_stock and complete_stocktake handle atomic operations at the DB layer, eliminating partial-state bugs
- **Append-only audit table pattern** — INSERT+SELECT RLS only, no UPDATE/DELETE. Immutable stock history at the database level.
- **Free-tier silent decrement** — add-on gates management UI, not the data pipeline. Stock stays accurate for when merchants upgrade.
- **Wave-based execution with worktrees** — Phase 22's 5 plans ran in 3 waves with parallel agents. Zero conflicts despite shared schema.
- **CHECK constraint over ENUM for product_type** — easy future extension without migration. Learned from Supabase ENUM pain in other projects.

### What Was Inefficient
- **SUMMARY.md one-liner quality STILL broken** — fourth milestone with garbage one-liners ("One-liner:", "adjustStock.ts"). The summary-extract tool depends on frontmatter format that summaries don't consistently follow.
- **GATE-01 and GATE-04 not checked off** — both were fully implemented but marked "Pending" in REQUIREMENTS.md. Same drift issue seen in v1.0 and v2.0.
- **Phase 22 worktree conflicts** — Wave 2/3 required a manual merge commit (4b5816a) to resolve conflicts between UI and server action worktrees touching shared files.

### Patterns Established
- `requireFeature('inventory', { requireDbCheck: true })` as first line in every inventory mutation action
- Query-only actions skip feature gate (sessions only exist if feature was active at creation)
- `resolveAuth()` returns snake_case `{ store_id, staff_id }` — all inventory actions follow this convention
- InventoryUpgradeWall component sources content from ADDONS config, uses JWT fast-path (not DB check)
- Inline commit confirmation strip (role=alert) instead of modal for destructive stocktake actions

### Key Lessons
1. **SUMMARY.md one-liner extraction is fundamentally broken** — needs tooling fix or format enforcement. Four milestones of garbage data in MILESTONES.md accomplishments.
2. **Requirements should be checked off during plan execution, not retroactively** — GATE-01/GATE-04 drift proves this hasn't improved despite being flagged in v1.0, v2.0, and v2.1 retros.
3. **Worktree conflicts are manageable but not zero** — when multiple plans touch the same DB types file or shared schema, conflicts happen. Ordering plans to minimize shared-file contention helps.
4. **Append-only audit tables with RLS are powerful** — the stock_adjustments pattern (no UPDATE/DELETE policies) is a reusable pattern for any tamper-proof history requirement.

### Cost Observations
- Model mix: ~60% opus (orchestration + execution), ~40% sonnet (research/subagents/verification)
- Sessions: ~3 across the milestone
- Notable: smallest milestone yet (3 phases, 11 plans) but high code density — 10,628 LOC in 90 files

---

## Milestone: v4.0 — Admin Platform

**Shipped:** 2026-04-06
**Phases:** 4 | **Plans:** 11

### What Was Built
- Staff RBAC: owner/manager/staff roles, role-gated server actions, PIN reset, deactivation, resolveStaffAuthVerified()
- Admin operational UI: customer management (search, detail, disable), promo edit/delete, store settings (business details, receipt), enhanced dashboard (trend charts, comparison cards, recent orders)
- Super admin platform dashboard: tenant stats, signup trends, add-on adoption rates
- Super admin tenant detail: Stripe billing visibility (subscriptions, invoices, payment failures), owner info, password reset, account disable/enable
- Super admin analytics: materialised Stripe snapshots, MRR/churn/per-add-on revenue, daily sync with rate-limited on-demand refresh

### What Worked
- **Parallel execution across independent phases** — Phases 25 and 26 both depended on 24 but not each other, enabling back-to-back execution
- **Recharts for data viz** — simple API, consistent styling with design system, no configuration overhead for trend/area/bar charts
- **Materialised Stripe snapshots** — analytics page loads in <2s from local DB, never hits Stripe API on page load

### What Was Inefficient
- **order_number column missing** — Phase 25 plan referenced an order_number column that didn't exist in the orders schema, causing a summary self-check failure

### Key Lessons
1. **Verify schema assumptions in plans** — plan references to columns/tables should be validated against actual migration state before execution
2. **Rate limiting via DB is robust** — Supabase RPC-based rate limiting works well for serverless (no in-memory state needed)

---

## Milestone: v5.0 — Marketing & Landing Page

**Shipped:** 2026-04-06
**Phases:** 1 | **Plans:** 3

### What Was Built
- Complete landing page rewrite: confident SaaS hero copy, 15-feature showcase across 4 categories, NZ trust badge strip
- Pricing section: free tier with 6 features, 3 add-on cards with correct pricing
- Mobile-responsive nav with CSS-only hamburger menu

### What Worked
- **Single-phase milestone** — focused scope, fast execution, no cross-phase dependencies
- **Static generation** — `force-static` export on all marketing pages means zero serverless function overhead

### Key Lessons
1. **Marketing pages should be updated whenever pricing changes** — v6.0 had to update the pricing section that v5.0 just built

---

## Milestone: v6.0 — Free Email Notifications

**Shipped:** 2026-04-06
**Phases:** 3 | **Plans:** 6

### What Was Built
- SQL migration making email notifications free for all stores (existing + new), auth hook rewrite
- Feature gate removal from email sending code, billing config cleanup
- Admin billing UI cleanup: 2 add-on cards only, UpgradePrompt updated
- Super admin cleanup: dashboard adoption cards, analytics display names, tenant queries
- Marketing pages: landing pricing 2-column grid, email in free tier checklist, email detail page deleted
- Add-ons hub: 2 entries, updated metadata, centered 2-column layout

### What Worked
- **Clean layer-by-layer approach** — backend (Phase 29) → admin UI (Phase 30) → marketing (Phase 31). Each layer could be verified independently.
- **Parallel plan execution within waves** — both Phase 31 plans ran simultaneously with zero conflicts (different files)
- **Small, focused milestone** — 3 phases, 6 plans, all completed in a single session
- **Pre-existing test infrastructure** — 565 tests passing meant confident refactoring without fear of silent breakage

### What Was Inefficient
- **Server component cache stale after edits** — HMR didn't pick up Tailwind class changes in server components, required full server restart (same issue as v1.0)
- **3 pre-existing test failures** — schema.test.ts and refund action tests had failures unrelated to this milestone, cluttering the regression gate output

### Key Lessons
1. **Pricing model changes touch every layer** — backend, admin UI, marketing pages, and tests all needed updates. Plan for full-stack sweeps when changing billing.
2. **Keep has_email_notifications column** — backwards-compatible default (always true) avoids migration risk while allowing clean removal later if needed
3. **Server component restart is still needed** — Tailwind v4 class changes in server components don't HMR reliably. Documented in v1.0, still true.

### Cost Observations
- Model mix: ~40% opus (orchestration), ~60% sonnet (executor/verifier agents)
- Sessions: 1 (entire milestone completed in single session)
- Notable: fastest milestone yet — 3 phases completed and verified in ~30 minutes

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 6 | First milestone. Established GSD workflow with wave-based execution. |
| v2.0 | ~6 | 10 | Parallel worktree agents matured. TDD pattern solidified for all Server Actions. |
| v2.1 | ~3 | 4 | Security-first hardening. Documentation-only phases execute fastest. gsd-tools automation eliminated drift. |
| v3.0 | ~3 | 3 | Feature add-on pattern matured. SECURITY DEFINER RPCs for all stock mutations. Smallest milestone, highest LOC density. |
| v4.0 | ~2 | 4 | Admin platform build-out. Materialised Stripe snapshots for analytics. |
| v5.0 | ~1 | 1 | Single-phase marketing milestone. Static-first marketing pages. |
| v6.0 | 1 | 3 | Full-stack pricing model change. Layer-by-layer approach (backend → UI → marketing). Fastest milestone. |

### Cumulative Quality

| Milestone | Tests | Source Files | LOC |
|-----------|-------|-------------|-----|
| v1.0 | 502 | 191 | 17,423 |
| v2.0 | 365+ | 336 | 36,329 |
| v2.1 | 434 | 989 | 89,000+ |
| v3.0 | 445+ | 1,000+ | 99,000+ |
| v4.0-v6.0 | 565+ | 1,000+ | 49,354 |

### Top Lessons (Verified Across Milestones)

1. Integer cents for money eliminates an entire class of bugs. Never reconsider.
2. Tailwind v4 semantic spacing tokens (`sm`, `md`, `lg`) do not mean what they meant in v3. Always check.
3. Parallel worktree agents are the single biggest throughput multiplier — zero conflicts across 3 milestones, 20 phases.
4. Keep planning artifacts (ROADMAP checkboxes, REQUIREMENTS traceability, STATE milestone version) in sync during execution, not retroactively. gsd-tools automation in v2.1 largely solved this.
5. Security audits always surface more than initial planning estimates — budget 20% extra for gap closure.
6. Documentation-only phases are the fastest to execute — no build/test cycles, pure content creation with grep verification.
7. SUMMARY.md one-liner extraction is broken across all 4 milestones — needs tooling fix before v4.0.
8. Append-only audit tables with INSERT+SELECT-only RLS are a reusable pattern for tamper-proof history.
9. Pricing model changes are full-stack — backend, admin UI, marketing, and tests all need updating. Plan sweeps, not spot fixes.
10. Layer-by-layer refactoring (backend → UI → marketing) allows independent verification at each stage.
