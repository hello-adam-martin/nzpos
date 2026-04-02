---
phase: 8
slug: checkout-speed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | `vitest.config.mts` (jsdom environment) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | SCAN-01 | unit | `npm test -- src/actions/products/lookupBarcode.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | SCAN-01 | component | `npm test -- src/components/pos/BarcodeScannerSheet.test.tsx` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | SCAN-02 | unit | `npm test -- src/actions/products/lookupBarcode.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | RCPT-01 | unit | `npm test -- src/lib/receipt.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | RCPT-02 | unit | `npm test -- src/lib/receipt.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/products/lookupBarcode.test.ts` — stubs for SCAN-01, SCAN-02
- [ ] `src/lib/receipt.test.ts` — stubs for RCPT-01, RCPT-02
- [ ] `src/components/pos/BarcodeScannerSheet.test.tsx` — covers SCAN-01 rendering (mock Quagga2)

*Existing infrastructure (Vitest + jsdom) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iPad camera decodes EAN-13 barcode and adds product to cart | SCAN-01 | Requires real device camera + physical barcode | Open POS on iPad → tap scan → point at EAN-13 barcode → verify product appears in cart |
| Unknown barcode closes scanner and focuses search bar | SCAN-02 | Requires real device camera interaction | Scan unknown barcode → close scanner → verify search bar is focused |
| Camera permission denied shows correct copy | SCAN-01 | Requires real browser permission dialog | Deny camera permission → verify error message renders |
| Beep sound plays on successful scan | SCAN-01 | Requires audio hardware | Scan valid barcode → verify audible beep |
| Batch mode keeps scanner open between scans | SCAN-01 | Requires sequential real scans | Scan product A → verify scanner stays open → scan product B → verify both in cart |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
