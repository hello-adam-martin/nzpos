---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Hardening & Documentation
status: planning
stopped_at: Phase 17 context gathered
last_updated: "2026-04-03T19:13:11.920Z"
last_activity: 2026-04-04 — v2.1 roadmap created, Phase 17 ready to plan
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 17 — Security Audit

## Current Position

Phase: 17 of 20 (Security Audit)
Plan: — of TBD
Status: Ready to plan
Last activity: 2026-04-04 — v2.1 roadmap created, Phase 17 ready to plan

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.1)
- Average duration: — min
- Total execution time: — hours

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [v2.0]: Per-add-on billing model (not plan tiers) — avoids upgrade cliffs, NZ market expects no-card signup
- [v2.0]: Custom domains deferred to v2.1 — too complex, lowest immediate demand
- [Phase 15]: requireFeature never throws — returns structured { authorized, feature, upgradeUrl } for redirect-friendly caller pattern
- [Phase 15]: Billing webhook uses STRIPE_BILLING_WEBHOOK_SECRET (not STRIPE_WEBHOOK_SECRET) — separate endpoint, separate signing secret
- [Phase 16]: Cached-path suspension check adds one indexed DB lookup per request — accepted for correctness across serverless instances
- [Phase 16]: super admin check runs before staff/customer in auth hook (cross-tenant, no store_id required)

### Pending Todos

None.

### Blockers/Concerns

- Wildcard SSL requires Vercel nameserver delegation (NS delegation, not CNAME) — must be resolved before production deploy (Phase 20)
- Supabase free tier limits (500MB DB, 50K MAU) — validate before onboarding >20 merchants; plan Pro upgrade timing
- Phase 17 priority: verify JWT claims source from raw_app_meta_data not user_metadata — potential complete RLS bypass if incorrect
- Phase 17 priority: storage.objects policies may not exist in migrations (configured via dashboard) — must run SELECT * FROM storage.policies explicitly

## Session Continuity

Last session: 2026-04-03T19:13:11.918Z
Stopped at: Phase 17 context gathered
Resume file: .planning/phases/17-security-audit/17-CONTEXT.md
