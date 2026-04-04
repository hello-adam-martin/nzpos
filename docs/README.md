# NZPOS Documentation

Custom retail POS + online store for NZ small businesses.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Getting Started](setup.md) | Clone to running app — prerequisites, Supabase, Stripe CLI, seeding |
| [Environment Variables](env-vars.md) | All 24 env vars with purpose, source, and required status |
| [Architecture Overview](architecture.md) | Multi-tenant request flow, data model, key design decisions |
| [Server Action Reference](server-actions.md) | All 48 server actions grouped by domain |

## Quick Start

```bash
git clone <repo-url>
cd nzpos
npm install
npx supabase start
cp .env.example .env.local
# Fill in values from supabase start output — see env-vars.md
npx tsx supabase/seed.ts
npm run dev
```

**Then visit:**
- Storefront: `http://mystore.lvh.me:3000`
- Admin dashboard: `http://mystore.lvh.me:3000/admin`
- POS: `http://mystore.lvh.me:3000/pos`
- Super admin: `http://lvh.me:3000/super-admin`

> Note: Use `lvh.me` subdomain (not `localhost`) — the app requires subdomain context for tenant routing. See [setup.md](setup.md) for details.

## Project Overview

NZPOS is a multi-tenant SaaS POS platform and online storefront built for the NZ market. Core features:

- In-store POS on iPad with EFTPOS/cash handling
- Public online storefront with Stripe checkout
- Shared inventory with GST-inclusive pricing (IRD-compliant)
- Owner admin dashboard and staff PIN login
- Xero accounting integration
- Email notifications via Resend
- Merchant self-serve signup with per-add-on billing

**Stack:** Next.js 16 App Router · Supabase (Postgres + Auth + Storage) · Stripe · Tailwind CSS v4

For full context, see `.planning/PROJECT.md`.
