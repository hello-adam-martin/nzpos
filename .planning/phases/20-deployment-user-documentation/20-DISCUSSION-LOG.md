# Phase 20: Deployment + User Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 20-deployment-user-documentation
**Areas discussed:** Deployment runbook structure, Smoke test design, Merchant onboarding guide, GST compliance explanation

---

## Deployment Runbook Structure

### Guide Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single deploy.md | One file with sections for Supabase, Stripe, Vercel, smoke test. Linear top-to-bottom flow. | ✓ |
| Separate files per service | docs/deploy-supabase.md, docs/deploy-stripe.md, etc. Easier individual reference. | |
| Runbook + checklists | Narrative deploy.md + separate deploy-checklist.md for repeat deploys. | |

**User's choice:** Single deploy.md
**Notes:** Keeps everything in one place, matches existing docs/ pattern.

### Deployer Audience

| Option | Description | Selected |
|--------|-------------|----------|
| Founder | Technical enough for Supabase/Vercel dashboards but not DevOps. Clear steps. | ✓ |
| Any developer | Generic developer audience, more context on why each step matters. | |
| Both | Primary for founder, expandable notes for other devs. | |

**User's choice:** Founder
**Notes:** None.

### Screenshots vs Text

| Option | Description | Selected |
|--------|-------------|----------|
| Text only | Step-by-step text referencing field names. No screenshots. | ✓ |
| Text + screenshots | Key screenshots for non-obvious steps. More visual but higher maintenance. | |

**User's choice:** Text only
**Notes:** Dashboards change frequently, screenshots go stale.

### DNS Detail Level

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step DNS guide | Exact NS record steps, propagation verification, wildcard SSL. | ✓ |
| Brief reference | Link to Vercel docs with a note about NS delegation. | |
| You decide | Claude determines detail level. | |

**User's choice:** Step-by-step DNS guide
**Notes:** Flagged as known concern in STATE.md — wildcard SSL requires NS delegation.

---

## Smoke Test Design

### Test Format

| Option | Description | Selected |
|--------|-------------|----------|
| Manual checklist | Markdown checkbox list in deploy.md. Walk through after each deploy. | ✓ |
| Scripted test suite | scripts/smoke-test.ts hitting production endpoints. | |
| Both | Manual checklist + lightweight health check script. | |

**User's choice:** Manual checklist
**Notes:** Simple, no scripting overhead.

### Test Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Critical path only | 6 checks: signup, product, POS sale, online order, Xero sync, email. | ✓ |
| Comprehensive | Critical + edge cases (~15 checks). | |
| Tiered | Must-pass (6) + should-pass (8) tiers. | |

**User's choice:** Critical path only
**Notes:** Matches DEPLOY-04 requirements exactly.

---

## Merchant Onboarding Guide

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| docs/merchant-guide.md | Alongside dev docs. Could later render as in-app help. | ✓ |
| In-app help pages | Build /help routes in the app. More polished but adds code scope. | |
| Separate site or PDF | Standalone document for email distribution. | |

**User's choice:** docs/merchant-guide.md
**Notes:** None.

### Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly walkthrough | Conversational, like showing a friend. Numbered steps with expected outcomes. | ✓ |
| Professional reference | Formal documentation style with prerequisites and verification. | |
| You decide | Claude picks based on audience. | |

**User's choice:** Friendly walkthrough
**Notes:** None.

### Journey Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Signup to first online order | Full: signup → wizard → product → POS sale → online order. | ✓ |
| Signup to first sale only | Shorter, online ordering separate. | |
| Full platform tour | Everything + Xero, email, staff PINs, reporting. | |

**User's choice:** Signup to first online order
**Notes:** Matches USER-01 requirement.

### Wizard Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Inline detail | Walk through each wizard step in the guide. | ✓ |
| Brief reference | 'Complete the setup wizard' with note it's self-explanatory. | |
| You decide | Claude determines based on wizard complexity. | |

**User's choice:** Inline detail
**Notes:** Wizard is the merchant's first experience — should be documented.

---

## GST Compliance Explanation

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| Section in merchant-guide.md | Dedicated section within merchant guide. All merchant info in one place. | ✓ |
| Separate docs/gst.md | Standalone doc, linkable from multiple places. | |
| You decide | Claude determines based on content length. | |

**User's choice:** Section in merchant-guide.md
**Notes:** None.

### Technical Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Plain English with examples | "When you enter $23.00, NZPOS knows $3.00 is GST." Worked examples, no formulas. | ✓ |
| Include the math | Show per-line calculation formula for verification. | |
| Both levels | Plain English + collapsible math section. | |

**User's choice:** Plain English with examples
**Notes:** None.

### Legal Disclaimer

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, brief disclaimer | One line CYA: "not tax advice — consult your accountant." | ✓ |
| No disclaimer | Keep it clean, product doc not legal advice. | |
| You decide | Claude determines appropriate level. | |

**User's choice:** Yes, brief disclaimer
**Notes:** None.

---

## Claude's Discretion

- Supabase migration application order and seed data steps
- Stripe webhook registration steps and live/test key separation
- Vercel env var listing and middleware verification
- Worked GST example numbers and discount scenario
- Whether smoke test checklist needs sub-steps

## Deferred Ideas

None — discussion stayed within phase scope.
