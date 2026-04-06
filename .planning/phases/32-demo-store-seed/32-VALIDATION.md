---
phase: 32
slug: demo-store-seed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x / ^3.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green + verification SQL returns expected counts
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | DEMO-01 | manual | `supabase db reset` + SQL verify | N/A | ⬜ pending |
| 32-01-02 | 01 | 1 | DEMO-02 | manual | SQL count query | N/A | ⬜ pending |
| 32-01-03 | 01 | 1 | DEMO-03 | manual | SQL null check query | N/A | ⬜ pending |
| 32-01-04 | 01 | 1 | DEMO-04 | manual | Run migration twice, verify no duplicates | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. This phase is pure SQL migration + static assets + TypeScript constants — no new test framework or stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Demo store exists with correct fields | DEMO-01 | SQL migration correctness — not unit-testable | Run `supabase db reset`, query `SELECT * FROM stores WHERE id = '00000000-0000-4000-a000-000000000099'` |
| 20 products across 4+ categories | DEMO-02 | SQL migration data completeness | Run count queries against products and categories tables |
| Products have image_url and SKU | DEMO-03 | SQL data integrity check | `SELECT COUNT(*) FROM products WHERE store_id = '...' AND (image_url IS NULL OR sku IS NULL)` — expect 0 |
| Idempotent seed | DEMO-04 | Migration replay test | Run `supabase db reset` twice, verify counts unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
