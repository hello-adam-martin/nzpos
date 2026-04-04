---
phase: 20-deployment-user-documentation
plan: "01"
subsystem: documentation
tags: [deployment, supabase, stripe, vercel, dns, runbook]
dependency_graph:
  requires: []
  provides: [docs/deploy.md, docs/README.md updated]
  affects: [production deployment, founder go-live workflow]
tech_stack:
  added: []
  patterns: [linear runbook format, markdown checkboxes for smoke test]
key_files:
  created:
    - docs/deploy.md
  modified:
    - docs/README.md
decisions:
  - "docs/deploy.md follows single linear top-to-bottom flow matching docs/setup.md style"
  - "NS delegation (not CNAME) explicitly documented with Critical callout for wildcard SSL"
  - "Two Stripe webhook endpoints documented as separate entries with separate signing secrets"
  - "Smoke test has exactly 6 checkboxes covering only critical paths per D-06"
  - "Super admin seed uses raw_app_meta_data with explicit callout for why (not user_metadata)"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 2
requirements_satisfied: [DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04]
---

# Phase 20 Plan 01: Production Deployment Runbook Summary

Production deployment runbook (docs/deploy.md) covering Supabase production setup, Stripe live keys with two separate webhook endpoints, Vercel wildcard DNS with NS delegation, and a 6-item smoke test checklist — enabling the founder to deploy NZPOS to production following a single linear document.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write docs/deploy.md production deployment runbook | 75a3cea | docs/deploy.md (created, 333 lines) |
| 2 | Update docs/README.md with deploy.md entry | c8e992f | docs/README.md (2 rows added) |

## What Was Built

### docs/deploy.md

A complete, linear production deployment runbook with four sections:

1. **Supabase Production Setup** — Create project, retrieve credentials, apply all 23 migrations (table with filename + description), verify storage buckets, configure auth settings, create super admin user with `raw_app_meta_data` SQL.

2. **Stripe Live Key Configuration** — Switch to live mode, retrieve live API keys, create three add-on products with price IDs (`STRIPE_PRICE_XERO`, `STRIPE_PRICE_EMAIL_NOTIFICATIONS`, `STRIPE_PRICE_CUSTOM_DOMAIN`), register two separate webhook endpoints with distinct signing secrets (`STRIPE_WEBHOOK_SECRET` and `STRIPE_BILLING_WEBHOOK_SECRET`).

3. **Vercel Production Deploy with Wildcard DNS** — Import project, add custom domain, NS delegation to Vercel (with Critical callout that CNAME will not work for wildcard SSL), configure all 24 environment variables with production-specific values highlighted, Resend email setup, middleware routing verification, cron job verification.

4. **Post-Deploy Smoke Test** — Six markdown checkboxes covering: merchant signup, product creation, POS sale with stock decrement, online order + Stripe payment, Xero sync trigger, email notification delivery.

### docs/README.md

Added two rows to the Documentation Index table:
- `[Production Deployment](deploy.md)` — Supabase, Stripe, Vercel setup and post-deploy smoke test
- `[Merchant Guide](merchant-guide.md)` — Onboarding walkthrough and GST compliance explanation (proactive entry for Plan 02)

## Decisions Made

- **Linear flow:** deploy.md follows a strict top-to-bottom ordering — Supabase first (required for all others), then Stripe (requires domain for webhook URLs), then Vercel (brings domain live), then smoke test.
- **NS delegation callout:** Documented as Critical with explicit explanation that CNAME will not provision wildcard SSL — addresses the known blocker from STATE.md.
- **Two webhook endpoints:** Each documented with their own endpoint URL, event list, and signing secret variable. Critical callout warns that swapping the secrets causes 400 on every request.
- **`raw_app_meta_data` callout:** Important note explaining why the flag must be in `raw_app_meta_data` not `user_metadata` — directly addresses the Phase 17 priority from STATE.md.
- **Smoke test sub-steps:** Each checkbox includes success criteria ("confirm you land on...") so the founder knows what to look for, not just what to click.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates documentation, not application code. All content is complete.

## Self-Check: PASSED
