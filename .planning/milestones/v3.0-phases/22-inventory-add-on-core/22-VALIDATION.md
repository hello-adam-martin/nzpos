---
phase: 22
slug: inventory-add-on-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x/3.x |
| **Config file** | `vitest.config.mts` (project root) |
| **Quick run command** | `npx vitest run src/actions/inventory` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/inventory`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | STOCK-01 | unit | `npx vitest run src/actions/inventory/__tests__/adjustStock.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | STOCK-02 | unit | `npx vitest run src/actions/inventory/__tests__/adjustStock.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | STOCK-03 | unit | `npx vitest run src/actions/inventory/__tests__/getAdjustmentHistory.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | STOCK-05 | unit | Covered by STOCK-01 test file | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | TAKE-01 | unit | `npx vitest run src/actions/inventory/__tests__/createStocktakeSession.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 1 | TAKE-02 | unit | `npx vitest run src/actions/inventory/__tests__/updateStocktakeLine.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 1 | TAKE-03 | unit | `npx vitest run src/schemas/__tests__/inventory.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-02-04 | 02 | 1 | TAKE-04 | unit | `npx vitest run src/actions/inventory/__tests__/commitStocktake.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | STOCK-04 | manual | — | — | ⬜ pending |
| 22-03-02 | 03 | 2 | TAKE-05 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/inventory/__tests__/adjustStock.test.ts` — stubs for STOCK-01, STOCK-02
- [ ] `src/actions/inventory/__tests__/getAdjustmentHistory.test.ts` — stubs for STOCK-03
- [ ] `src/actions/inventory/__tests__/createStocktakeSession.test.ts` — stubs for TAKE-01
- [ ] `src/actions/inventory/__tests__/updateStocktakeLine.test.ts` — stubs for TAKE-02
- [ ] `src/actions/inventory/__tests__/commitStocktake.test.ts` — stubs for TAKE-04
- [ ] `src/schemas/__tests__/inventory.test.ts` — stubs for reason code enum, variance calculation (TAKE-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Low-stock alert renders conditionally based on `hasInventory` | STOCK-04 | UI rendering gate depends on JWT claim in browser context | 1. Log in as store with inventory add-on. 2. Navigate to admin dashboard. 3. Verify low-stock alert list is visible. 4. Log in as store without add-on. 5. Verify low-stock alert is hidden. |
| Barcode scanner focuses matching row in stocktake count entry | TAKE-05 | Hardware-dependent barcode scanner input requires camera access | 1. Create a stocktake session. 2. Open the Count tab. 3. Trigger barcode scanner. 4. Scan a product barcode. 5. Verify the matching row is focused and ready for count input. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
