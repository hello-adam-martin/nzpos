---
phase: 36
slug: advanced-reporting-cogs-add-on
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-00-01 | 00 | 0 | COGS-01, COGS-02 | unit | `npx vitest run` | Wave 0 creates | ⬜ pending |
| 36-01-01 | 01 | 1 | COGS-01 | unit | `npx vitest run src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | ✅ (extended by 36-00) | ⬜ pending |
| 36-01-02 | 01 | 1 | COGS-02 | unit | `npx vitest run src/actions/products/__tests__/costPrice.test.ts` | ✅ (created by 36-00) | ⬜ pending |
| 36-01-03 | 01 | 1 | COGS-03 | grep | `grep -q "hasAdvancedReporting" src/components/admin/products/ProductDataTable.tsx` | N/A | ⬜ pending |
| 36-02-01 | 02 | 1 | COGS-03, COGS-04, COGS-05, COGS-06 | unit | `npx vitest run src/lib/cogs.test.ts` | ✅ (created by 36-02 TDD) | ⬜ pending |
| 36-03-01 | 03 | 2 | COGS-04 | grep | `grep -q "aggregateCOGS" src/app/admin/reports/page.tsx` | N/A | ⬜ pending |
| 36-03-02 | 03 | 2 | COGS-05, COGS-06 | grep+tsc | `grep -q "calculateMarginPercent" src/components/admin/reports/ReportsPageClient.tsx && npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — extend with `has_advanced_reporting` test case (Plan 36-00)
- [x] `src/actions/products/__tests__/costPrice.test.ts` — create with cost_price_cents schema validation tests (Plan 36-00)
- [x] `src/lib/cogs.test.ts` — created by Plan 36-02 (TDD plan, tests written first)

*All Wave 0 gaps addressed by Plan 36-00 (test scaffolds) and Plan 36-02 (TDD tests-first).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe subscription activates add-on | COGS-01 | Requires Stripe webhook | Subscribe via billing page, verify has_advanced_reporting flag set |
| Collapsible category rows in report | COGS-04 | Visual interaction | Click category row, verify products expand/collapse |
| CSV downloads in browser | COGS-06 | Browser download API | Click export, verify file downloads with correct filename |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
