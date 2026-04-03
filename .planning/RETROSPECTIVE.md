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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 6 | First milestone. Established GSD workflow with wave-based execution. |
| v2.0 | ~6 | 10 | Parallel worktree agents matured. TDD pattern solidified for all Server Actions. |

### Cumulative Quality

| Milestone | Tests | Source Files | LOC |
|-----------|-------|-------------|-----|
| v1.0 | 502 | 191 | 17,423 |
| v2.0 | 365+ | 336 | 36,329 |

### Top Lessons (Verified Across Milestones)

1. Integer cents for money eliminates an entire class of bugs. Never reconsider.
2. Tailwind v4 semantic spacing tokens (`sm`, `md`, `lg`) do not mean what they meant in v3. Always check.
3. Parallel worktree agents are the single biggest throughput multiplier — zero conflicts across 2 milestones, 16 phases.
4. Keep planning artifacts (ROADMAP checkboxes, REQUIREMENTS traceability, STATE milestone version) in sync during execution, not retroactively.
