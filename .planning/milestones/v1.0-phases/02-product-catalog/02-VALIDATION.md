---
phase: 2
slug: product-catalog
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PROD-05 | unit | `npx vitest run src/actions/categories` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PROD-05 | unit | `npx vitest run src/components/admin/categories` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | PROD-01 | unit | `npx vitest run src/actions/products` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | PROD-02 | unit | `npx vitest run src/actions/products/upload` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | PROD-03 | unit | `npx vitest run src/actions/products` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | PROD-01 | integration | `npx vitest run src/components/admin/products` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | PROD-04 | unit | `npx vitest run src/lib/csv` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 2 | PROD-06 | unit | `npx vitest run src/actions/products/import` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for product CRUD Server Actions (create, update, deactivate)
- [ ] Test stubs for category CRUD Server Actions (create, rename, reorder)
- [ ] Test stubs for CSV parsing and column mapping logic
- [ ] Test stubs for image upload and resize logic
- [ ] Shared fixtures for mock Supabase client responses

*Existing vitest infrastructure from Phase 1 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Image displays in product list | PROD-02 | Visual rendering check | Upload image, verify thumbnail renders in admin product list at correct dimensions |
| Category drag-and-drop reorder | PROD-05 | @dnd-kit interaction | Drag a category to new position, verify sort_order updates and persists on refresh |
| CSV column mapper UI | PROD-04 | Complex UI interaction | Upload CSV, map columns visually, verify preview shows correct field mappings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
