---
phase: 23
slug: feature-gating-pos-storefront-integration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-04
updated: 2026-04-04
---

# Phase 23 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
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
| 23-00-01 | 00 | 0 | POS-01, POS-02, POS-03 | scaffold | `npx vitest run src/components/pos/__tests__/ src/components/store/__tests__/` | Wave 0 creates | pending |
| 23-01-01 | 01 | 1 | GATE-03, GATE-05 | unit | `npx vitest run` | Yes (billing + super-admin test files exist) | pending |
| 23-01-02 | 01 | 1 | GATE-02 | unit | `npx vitest run` | Yes | pending |
| 23-02-01 | 02 | 1 | GATE-01, GATE-04 | unit | `npx vitest run` | Yes | pending |
| 23-02-02 | 02 | 1 | POS-01, POS-02, POS-03 | checkpoint | grep verification + `npx vitest run` | Yes (after Wave 0) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

23-00-PLAN.md creates two test scaffold files:
- [x] `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` -- already exists from Phase 15
- [x] `src/actions/super-admin/__tests__/activateAddon.test.ts` -- already exists from Phase 16
- [x] `src/actions/super-admin/__tests__/deactivateAddon.test.ts` -- already exists from Phase 16
- [ ] `src/components/pos/__tests__/ProductCard.test.tsx` -- created by 23-00 (covers POS-01, POS-02)
- [ ] `src/components/store/__tests__/AddToCartButton.test.tsx` -- created by 23-00 (covers POS-03)

**Note:** The billing and super-admin test files already exist from earlier phases and do not need Wave 0 scaffolding. Only the POS ProductCard and storefront AddToCartButton component tests need creation.

After 23-00-PLAN.md executes successfully, set `wave_0_complete: true` in this frontmatter.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe checkout redirect flow | GATE-01 | Requires real Stripe session | Create checkout session, verify redirect to Stripe hosted page, complete test payment, verify redirect back to billing page with success param |
| POS visual stock badges | POS-01 | Visual rendering verification | Load POS with inventory-subscribed store, verify green/amber/red badges on physical products |
| Storefront sold-out display | POS-03 | Visual rendering + interaction | Load storefront, verify sold-out badge on zero-stock products, verify add-to-cart disabled |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (revised 2026-04-04 to add Wave 0 plan and checkpoint verification)
