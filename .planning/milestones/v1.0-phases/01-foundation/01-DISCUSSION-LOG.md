# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 01-foundation
**Areas discussed:** Supabase setup, Auth flow details, Seed data

---

## Supabase Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Free tier, Sydney region | Closest to NZ, free tier fine for v1 | |
| Pro tier ($25/mo), Sydney | Better for production, no 7-day pause | |
| Free tier, US region | Default region, higher latency | |

**User's choice:** Local development via Docker (`supabase start`), defer hosted setup to deployment time
**Notes:** User suggested developing against local DB and upgrading later. This is the standard Supabase dev workflow.

---

## Auth Flow Details

| Option | Description | Selected |
|--------|-------------|----------|
| 4-digit PIN + immediate access | Standard PIN, no email verification | ✓ |
| 6-digit PIN + immediate access | More secure PIN, no verification | |
| 4-digit PIN + email verification | Standard PIN with verification gate | |
| You decide | Claude picks defaults | |

**User's choice:** 4-digit PIN + immediate access (recommended)
**Notes:** For a self-built tool with known users, email verification is unnecessary friction.

---

## Seed Data

| Option | Description | Selected |
|--------|-------------|----------|
| Seed with sample products | 20-30 realistic products, test immediately | |
| Start empty | Add products manually through admin | |
| Both: seed for dev, empty for prod | Seed runs in dev only, production starts clean | ✓ |

**User's choice:** Both — seed for development, empty for production
**Notes:** Best of both worlds. Immediate testability in dev, clean slate in production.

---

## PWA Scope

Not discussed (user did not select). Claude's discretion: manifest + icons + standalone fullscreen, no service worker in Phase 1.

## Claude's Discretion

- PWA icon sizes and splash screens
- Zod schema structure
- CI/CD pipeline structure
- Supabase migration naming

## Deferred Ideas

None
