---
phase: 19
slug: developer-documentation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Verify written doc file exists and contains expected sections (grep check)
- **After every plan wave:** Full manual review of all docs files for internal consistency
- **Before `/gsd:verify-work`:** All four doc files complete, action count verified
- **Max feedback latency:** 5 seconds (file existence checks only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | DOC-01 | manual + grep | `test -f docs/setup.md && grep -c "## " docs/setup.md` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | DOC-01 | manual | `test -f supabase/seed.ts` | ✅ exists | ⬜ pending |
| 19-02-01 | 02 | 1 | DOC-02 | manual + grep | `test -f docs/env-vars.md && grep -c "SUPABASE" docs/env-vars.md` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 1 | DOC-03 | manual + grep | `test -f docs/architecture.md && grep -c "mermaid" docs/architecture.md` | ❌ W0 | ⬜ pending |
| 19-04-01 | 04 | 1 | DOC-04 | manual + count | `test -f docs/server-actions.md && grep -c "^\|" docs/server-actions.md` | ❌ W0 | ⬜ pending |
| 19-04-02 | 04 | 1 | DOC-04 | automated | `find src/actions -name "*.ts" ! -path "*__tests__*" ! -name "*.test.ts" -type f \| wc -l` (must equal action count in doc) | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docs/README.md` — table of contents (created as part of first plan)
- [ ] `docs/setup.md` — DOC-01 setup guide
- [ ] `docs/env-vars.md` — DOC-02 env var reference
- [ ] `docs/architecture.md` — DOC-03 architecture overview
- [ ] `docs/server-actions.md` — DOC-04 action inventory

*Documentation files are themselves the deliverables — no test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Setup guide completeness | DOC-01 | Must verify no undocumented steps exist — requires human reading | Follow docs/setup.md from scratch on clean clone, verify all steps work |
| Env var completeness | DOC-02 | Must verify every var has all four columns populated | Read docs/env-vars.md, cross-reference with .env.example |
| Architecture accuracy | DOC-03 | Mermaid diagrams must accurately represent code flows | Read docs/architecture.md, verify against src/middleware.ts and src/lib/ |
| Action inventory completeness | DOC-04 | Schema summaries must accurately reflect Zod schemas | Read docs/server-actions.md, spot-check 5 actions against source |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
