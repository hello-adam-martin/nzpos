# Phase 17: Security Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 17-security-audit
**Areas discussed:** Audit approach, CSP header policy, Secrets & env hygiene, Findings handling

---

## Audit Approach

### Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Risk-prioritized | Start with highest-risk boundaries (RLS, auth bypass, webhooks), work down to lower-risk items | ✓ |
| Systematic sweep | Table-by-table, action-by-action, file-by-file in order | |
| OWASP-structured | Organize by OWASP Top 10 categories | |

**User's choice:** Risk-prioritized
**Notes:** None

### Output Format

| Option | Description | Selected |
|--------|-------------|----------|
| Report + fixes | Write SECURITY-AUDIT.md with findings, then fix each one | ✓ |
| Fix only | Fix issues as found, no separate report | |
| Report only | Document findings without fixing | |

**User's choice:** Report + fixes
**Notes:** None

### Scope Depth

| Option | Description | Selected |
|--------|-------------|----------|
| SEC items + opportunistic | Cover all 14 SEC requirements, flag anything else suspicious | ✓ |
| SEC items only | Strictly the 14 requirements | |
| Full sweep | Comprehensive security review beyond the 14 items | |

**User's choice:** SEC items + opportunistic
**Notes:** None

### Priority Order

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, that order | RLS > Auth > Webhooks > Actions > Secrets > CSP > Audit trail | ✓ |
| Auth bypass first | Check auth flows before RLS | |
| You decide | Claude picks optimal order | |

**User's choice:** Yes, that order (RLS > Auth > Webhooks > Server Actions > Secrets > CSP > Audit trail)
**Notes:** None

---

## CSP Header Policy

### CSP Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Report-only first | Deploy CSP-Report-Only, switch to enforce after verification | ✓ |
| Enforce immediately | Strict CSP from the start | |
| You decide | Claude picks | |

**User's choice:** Report-only first
**Notes:** None

### CSP Location

| Option | Description | Selected |
|--------|-------------|----------|
| Middleware | Add to existing Next.js middleware | ✓ |
| next.config.ts headers | Static headers in config | |
| You decide | Claude picks | |

**User's choice:** Middleware
**Notes:** None

### CSP Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Single policy | One CSP for all surfaces | ✓ |
| Per-surface policies | Different CSP for storefront, POS, admin, super admin | |
| You decide | Claude picks | |

**User's choice:** Single policy
**Notes:** None

---

## Secrets & Env Hygiene

### Env Audit Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Grep + verify | Grep process.env references, cross-check .env.example | ✓ |
| Grep + Vercel check | Same plus verify Vercel env vars match | |
| You decide | Claude picks | |

**User's choice:** Grep + verify
**Notes:** None

### Git History Scan

| Option | Description | Selected |
|--------|-------------|----------|
| Current HEAD only | Check current source files for hardcoded secrets | ✓ |
| HEAD + git log scan | Also scan git history for accidentally committed secrets | |
| You decide | Claude picks | |

**User's choice:** Current HEAD only
**Notes:** Repo has always been private

---

## Findings Handling

### Fix Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Audit then fix | First plan: audit + report. Second plan: fix by severity | ✓ |
| Fix as you go | Fix each issue as found during audit | |
| You decide | Claude picks | |

**User's choice:** Audit then fix
**Notes:** None

### Severity Classification

| Option | Description | Selected |
|--------|-------------|----------|
| 3 levels | Critical / High / Low | ✓ |
| CVSS-style 4 levels | Critical / High / Medium / Low | |
| You decide | Claude picks | |

**User's choice:** 3 levels (Critical, High, Low)
**Notes:** Critical = data leak/auth bypass, High = missing validation/weak headers, Low = hygiene/documentation

### Critical Finding Response

| Option | Description | Selected |
|--------|-------------|----------|
| Document all, fix after | Complete full audit first, then fix by severity | ✓ |
| Stop and fix criticals | Pause audit to fix Critical findings immediately | |
| You decide | Claude judges based on actual severity | |

**User's choice:** Document all, fix after
**Notes:** None

---

## Claude's Discretion

- Specific CSP directives (script-src, style-src, connect-src, etc.)
- Optimal plan breakdown within the two-phase structure (audit → fix)

## Deferred Ideas

None — discussion stayed within phase scope.
