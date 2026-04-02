# Phase 7: Production Launch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 07-production-launch
**Areas discussed:** Product data import, Domain & DNS, Stripe go-live strategy, Environment & secrets

---

## Product Data Import

### Q1: How to load 200+ products into production?

| Option | Description | Selected |
|--------|-------------|----------|
| CSV import via admin dashboard | Use the existing CSV import feature built in v1.0. Prepare a spreadsheet with all SKUs, barcodes, categories, prices, stock levels — upload through the admin UI. | ✓ |
| Seed script for production | Write a one-time script (like supabase/seed.ts but for production data). Runs against the production Supabase with service_role key. | |
| Manual entry through admin | Enter products one by one through the admin product creation form. | |

**User's choice:** CSV import via admin dashboard
**Notes:** None

### Q2: Do you already have product data?

| Option | Description | Selected |
|--------|-------------|----------|
| Spreadsheet ready | Have or can prepare a CSV/Excel with product data. | |
| Data in another POS/system | Products currently tracked in another tool. | |
| Starting from scratch | No existing product data — will need to catalog everything. | ✓ |

**User's choice:** Starting from scratch
**Notes:** None

### Q3: Product images plan?

| Option | Description | Selected |
|--------|-------------|----------|
| Photograph products | Take photos of products with phone/camera, upload via admin. | ✓ |
| No images at launch | Launch with placeholder/no images. | |
| Supplier images | Download product images from supplier websites. | |

**User's choice:** Photograph products
**Notes:** None

### Q4: CSV import + images handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Images via admin editor | CSV imports data only. Add photos one by one through product edit screen. | ✓ |
| Image URLs in CSV | Include image URLs in CSV for bulk download and storage. | |

**User's choice:** Images via admin editor
**Notes:** None

---

## Domain & DNS

### Q1: What domain will the store launch on?

| Option | Description | Selected |
|--------|-------------|----------|
| Custom domain | Have or will buy a .co.nz domain. | |
| Vercel default URL | Launch on yourproject.vercel.app initially. | |
| Not decided yet | Haven't thought about this. | ✓ |

**User's choice:** Not decided yet
**Notes:** Claude recommended starting with Vercel URL, adding custom domain later.

### Q2: Launch on Vercel URL first?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Vercel URL first | Deploy to yourproject.vercel.app. Custom domain is a separate task later. | ✓ |
| No, need custom domain at launch | Won't go live to customers without a real domain. | |

**User's choice:** Yes, Vercel URL first
**Notes:** None

---

## Stripe Go-Live Strategy

### Q1: How to handle Stripe transition to live?

| Option | Description | Selected |
|--------|-------------|----------|
| Test mode first in prod | Deploy with test keys on production. Validate full checkout flow. Switch to live keys once verified. | ✓ |
| Live keys from day one | Deploy with live keys immediately. | |
| You decide | Claude picks. | |

**User's choice:** Test mode first in prod
**Notes:** None

### Q2: Stripe account status?

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe account exists | Already have an account with test keys. Just need live activation. | ✓ |
| Need to create account | No account yet. | |
| Not sure | Used test keys but unsure about account status. | |

**User's choice:** Stripe account exists
**Notes:** None

---

## Environment & Secrets

### Q1: Supabase production instance?

| Option | Description | Selected |
|--------|-------------|----------|
| Create new Supabase project | Fresh project for production. Apply all 9 migrations. Clean start. | ✓ |
| Already have a prod project | Production project exists, needs migrations. | |
| You decide | Claude picks. | |

**User's choice:** Create new Supabase project
**Notes:** None

### Q2: Environment variable management?

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel env vars UI | Set all production secrets through Vercel dashboard. Dev stays in .env.local. | ✓ |
| You decide | Claude picks best approach. | |

**User's choice:** Vercel env vars UI
**Notes:** None

### Q3: Vercel account status?

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel account ready | Have an account, project may or may not be linked. | ✓ |
| Need to set up Vercel | No account yet. | |
| Not sure | Haven't looked into this. | |

**User's choice:** Vercel account ready
**Notes:** None

---

## Claude's Discretion

- Migration application order and verification strategy
- Webhook endpoint configuration for Stripe in production
- Supabase Storage bucket permissions and RLS for production
- Vercel project settings (build commands, framework detection, region)
- Production-specific next.config.ts changes
- Cron job verification

## Deferred Ideas

- Custom .co.nz domain — add after deployment verified
- Stripe live keys — switch after test mode verification passes
- Xero production OAuth — tracked as XERO-01, XERO-02 (future requirements)
