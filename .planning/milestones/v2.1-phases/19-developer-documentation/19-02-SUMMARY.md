---
phase: 19-developer-documentation
plan: 02
subsystem: documentation
tags: [architecture, auth, multi-tenant, feature-gating, billing, mermaid]
dependency_graph:
  requires: []
  provides: [DOC-03]
  affects: [developer onboarding, architecture understanding]
tech_stack:
  added: []
  patterns: [Mermaid diagrams, architecture documentation]
key_files:
  created:
    - docs/architecture.md
  modified: []
decisions:
  - Auth system priority in resolveAuth() is owner (Supabase) → staff JWT → null; super admin checked separately in middleware
  - CSP documented as report-only in v1, to be switched to enforcing after production monitoring
  - Tenant cache is per-serverless-instance; cold starts hit DB — documented as accepted trade-off
  - DB fallback in requireFeature uses admin client not regular client — documented for security clarity
metrics:
  duration: 6
  completed: 2026-04-04
  tasks_completed: 1
  files_created: 1
---

# Phase 19 Plan 02: Architecture Documentation Summary

Architecture overview document written covering all four auth systems, multi-tenant request lifecycle with Mermaid flowchart, five-layer tenant isolation model, feature gating dual-path, and Stripe billing subscription lifecycle.

## What Was Built

`docs/architecture.md` — 351 lines, 5 Mermaid diagrams, covering:

1. **Owner Auth (Supabase Auth)** — Mermaid sequence diagram showing middleware auth gate, email verification check, and role check.
2. **Staff PIN Auth (Custom JWT)** — Mermaid sequence diagram showing rate limit check, bcrypt verify, jose JWT signing, and HttpOnly cookie storage.
3. **Customer Auth (Supabase Auth)** — Role-based middleware blocking for /admin and /pos routes.
4. **Super Admin** — Root domain overlay with `is_super_admin` flag, cross-tenant with no `store_id` requirement.
5. **Multi-Tenant Request Lifecycle** — Full Mermaid flowchart (8 decision branches) plus 8-step prose walkthrough covering webhook passthrough, root/subdomain detection, tenant cache, suspension enforcement, header injection, route-level auth, and security headers.
6. **Tenant Isolation Model** — Five-layer table: subdomain→store_id, tenant cache, custom JWT claims, RLS policies, SECURITY DEFINER RPCs.
7. **Feature Gating** — Mermaid flowchart for dual-path (JWT fast path vs DB fallback), documented never-throws contract.
8. **Billing Subscriptions** — Mermaid sequence diagram for full subscription lifecycle (checkout → webhook → store_plans update), separate webhook secret, idempotency pattern.
9. **POS Sale Data Flow** — End-to-end prose covering cart state → Server Action → RPC → atomic transaction.
10. **Online Order Data Flow** — Stripe Checkout hosted page → webhook → RPC → email notification.
11. **Security Model Summary** — Table covering 9 security concerns with their mechanisms.

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| docs/architecture.md exists with 150+ lines | 351 lines — PASS |
| Contains 5+ Mermaid diagrams | 5 diagrams — PASS |
| All four auth systems documented | Owner, Staff PIN, Customer, Super Admin — PASS |
| Multi-tenant lifecycle: tenantCache + x-store-id | Both present — PASS |
| Feature gating: requireFeature + store_plans | Both present — PASS |
| Billing: STRIPE_BILLING_WEBHOOK_SECRET | Present — PASS |
| Key source files referenced | middleware.ts, resolveAuth.ts, tenantCache.ts, requireFeature.ts — PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a documentation file. All architectural claims are sourced directly from source files read during execution.

## Self-Check

- [x] docs/architecture.md exists and has 351 lines
- [x] Commit 81304f4 recorded
- [x] All 5 Mermaid diagrams render correctly (standard fenced code blocks with `mermaid` language tag)
- [x] All key file references point to real source files verified during execution

## Self-Check: PASSED
