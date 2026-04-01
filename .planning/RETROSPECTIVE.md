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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 6 | First milestone. Established GSD workflow with wave-based execution. |

### Cumulative Quality

| Milestone | Tests | Source Files | LOC |
|-----------|-------|-------------|-----|
| v1.0 | 502 | 191 | 17,423 |

### Top Lessons (Verified Across Milestones)

1. Integer cents for money eliminates an entire class of bugs. Never reconsider.
2. Tailwind v4 semantic spacing tokens (`sm`, `md`, `lg`) do not mean what they meant in v3. Always check.
