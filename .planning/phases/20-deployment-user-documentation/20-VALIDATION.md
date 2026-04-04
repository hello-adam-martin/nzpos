---
phase: 20
slug: deployment-user-documentation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | grep + file existence checks (documentation-only phase) |
| **Config file** | none — no test framework needed |
| **Quick run command** | `test -f docs/deploy.md && test -f docs/merchant-guide.md && echo PASS` |
| **Full suite command** | `grep -c "##" docs/deploy.md && grep -c "##" docs/merchant-guide.md && grep -l "deploy.md" docs/README.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick run command (file existence)
- **After every plan wave:** Run full suite command (content structure verification)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | DEPLOY-01 | content | `grep -q "## Supabase Production Setup" docs/deploy.md` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | DEPLOY-02 | content | `grep -q "## Stripe Live Configuration" docs/deploy.md` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | DEPLOY-03 | content | `grep -q "## Vercel Production Deploy" docs/deploy.md` | ❌ W0 | ⬜ pending |
| 20-01-04 | 01 | 1 | DEPLOY-04 | content | `grep -q "## Post-Deploy Smoke Test" docs/deploy.md` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | USER-01 | content | `grep -q "## Getting Started" docs/merchant-guide.md` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 1 | USER-02 | content | `grep -q "## GST" docs/merchant-guide.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. This is a documentation-only phase — no test framework installation needed. Verification uses grep and file existence checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deploy guide is followable end-to-end | DEPLOY-01-04 | Requires actual Supabase/Stripe/Vercel accounts | Follow docs/deploy.md top-to-bottom on a fresh project |
| Merchant guide enables first sale without support | USER-01 | Requires running application and real user flow | Follow docs/merchant-guide.md as a new merchant |
| GST explanation is understandable by non-technical reader | USER-02 | Subjective clarity assessment | Read GST section and verify worked examples match gst.ts output |

*Most verification for this phase is content-based (grep for required sections and keywords) rather than runtime-based.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
