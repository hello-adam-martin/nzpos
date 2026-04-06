# Phase 29: Backend & Billing Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 29-backend-billing-cleanup
**Areas discussed:** Migration strategy, Stripe cleanup scope, requireFeature bypass, Test handling

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single UPDATE | One SQL migration: UPDATE store_plans SET has_email_notifications = true. Simple, atomic, runs in seconds. | ✓ |
| Batch with logging | Migration updates in batches of 100 with count log. Safer at scale but unnecessary complexity. | |

**User's choice:** Single UPDATE
**Notes:** None — straightforward choice given current tenant count.

---

## Auth Hook — Email Claim Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode true | Auth hook always sets email_notifications=true in JWT. No DB read needed. | |
| Keep reading from DB | Auth hook still reads has_email_notifications from store_plans (always true post-migration). | |
| Remove claim entirely | Stop setting email_notifications in JWT at all. Cleanest long-term. | ✓ |

**User's choice:** Remove claim entirely
**Notes:** Cleanest approach — no wasted JWT space, no dead reads. requireFeature gate is also being removed so nothing will look for this claim.

---

## Stripe Cleanup Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full removal | Remove email_notifications from all TypeScript code AND env var references. Dead config = confusion. | ✓ |
| Code only, keep env var | Remove from code but leave STRIPE_PRICE_EMAIL_NOTIFICATIONS env var as comment. | |

**User's choice:** Full removal
**Notes:** None.

---

## requireFeature Bypass

| Option | Description | Selected |
|--------|-------------|----------|
| Remove gate call entirely | Delete the requireFeature('email_notifications') call from email.ts. Email just sends. | ✓ |
| Make requireFeature smart for free features | Add FREE_FEATURES list so requireFeature returns authorized without check. | |

**User's choice:** Remove gate call entirely
**Notes:** Since the JWT claim is also being removed, requireFeature would fail anyway. Simplest approach.

---

## Test Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in Phase 29 | Update backend tests alongside code changes. They'll break at compile time anyway. | ✓ |
| Move TEST-01 to Phase 29 | Formally reassign TEST-01 and update all tests (backend + admin UI). | |
| Backend tests only in 29, UI tests in 30 | Split: backend tests now, admin UI tests later. | |

**User's choice:** Fix in Phase 29
**Notes:** Tests referencing removed types/config will fail at compile time — can't leave broken tests between phases.

---

## Claude's Discretion

- Migration numbering and naming convention
- Order of operations within plans
- Whether to consolidate into 1 or 2 plans

## Deferred Ideas

None — discussion stayed within phase scope.
