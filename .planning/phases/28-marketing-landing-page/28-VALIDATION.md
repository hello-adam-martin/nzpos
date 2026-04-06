---
phase: 28
slug: marketing-landing-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x/3.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + visual review on mobile/tablet/desktop
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | MKT-06 | manual | visual review | N/A | ⬜ pending |
| 28-01-02 | 01 | 1 | MKT-07 | manual | visual review | N/A | ⬜ pending |
| 28-02-01 | 02 | 1 | MKT-01 | manual | visual review + grep | N/A | ⬜ pending |
| 28-02-02 | 02 | 1 | MKT-02 | manual | visual review | N/A | ⬜ pending |
| 28-02-03 | 02 | 1 | MKT-08 | manual | grep for hardcoded hex | N/A | ⬜ pending |
| 28-03-01 | 03 | 1 | MKT-03 | manual | visual review + grep | N/A | ⬜ pending |
| 28-03-02 | 03 | 1 | MKT-04 | manual | grep for "Inventory" in free tier | N/A | ⬜ pending |
| 28-03-03 | 03 | 1 | MKT-05 | manual | visual review | N/A | ⬜ pending |
| 28-04-01 | 04 | 2 | MKT-09 | manual | browser resize check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test infrastructure needed — this is a UI-content phase where primary verification is visual review against DESIGN.md.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero copy reflects mature SaaS | MKT-06 | Subjective copy quality | Read hero section, verify no MVP-era phrases like "ring up sales" |
| CTA copy updated | MKT-07 | Subjective copy quality | Read CTA section, verify compelling messaging |
| Design tokens used | MKT-08 | Pattern verification | `grep -rn '#[0-9a-fA-F]\{6\}' src/app/(marketing)/components/` should return minimal/no results |
| No horizontal scroll | MKT-09 | Requires browser viewport testing | Open page at 375px, 768px, 1280px widths — no horizontal scroll |
| Free tier excludes inventory | MKT-04 | Content correctness | Verify "Inventory" does NOT appear in free tier feature list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
