# Technology Stack

**Project:** NZPOS — NZ Retail POS System
**Researched:** 2026-04-01 (v1.0 core stack) + 2026-04-03 (v2.0 SaaS additions) + 2026-04-04 (v2.1 hardening tooling) + 2026-04-04 (v3.0 inventory management)
**Confidence:** HIGH (core stack verified against live Next.js 16.2.1 official docs)

---

## Verdict on Chosen Stack

**Next.js App Router + Supabase + Stripe + Tailwind CSS is the correct choice.** This is the dominant production stack for this type of application in 2026. The combination has proven interoperability, strong documentation, and is AI-friendly for a solo developer. No changes recommended to the core stack. The research below validates specific package versions and flags one significant version-specific consideration: Next.js is now on v16, not v15.

---

## Core Stack

### Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | **16.2** (latest stable, released 2026-03-18) | Full-stack framework | App Router provides Server Components, Server Actions, file-system routing, and built-in image optimisation. v16 introduced Cache Components (`use cache` directive) as stable. Vercel is a verified deployment target. |
| React | **19** (bundled with Next.js 16) | UI rendering | Concurrent features, `useActionState` for form state in Server Actions, `use()` for streaming client components. |
| TypeScript | **5.x** | Type safety | Required for this codebase. Next.js 16 ships with TS support built in. |

**Version note (HIGH confidence):** Current Next.js is 16.2.1, confirmed from official docs dated 2026-03-25. The team likely has "Next.js" in mind but may be thinking v14/v15. Make sure to scaffold with `npx create-next-app@latest` to get v16.

---

### Database & Backend-as-a-Service

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | **@supabase/supabase-js ^2.x** (use latest 2.x) | Postgres DB, Auth, Storage, RLS | Managed Postgres with Row Level Security is the correct choice for multi-tenant data isolation via `store_id`. Built-in auth handles owner email/password. Free tier sufficient for initial launch. Supabase Auth integrates with Next.js App Router via `@supabase/ssr`. |
| @supabase/ssr | **^0.x** (latest) | Supabase + Next.js App Router cookie handling | Required adapter for App Router. Replaces the deprecated `@supabase/auth-helpers-nextjs`. Do NOT use the old auth-helpers package. |
| PostgreSQL | Managed by Supabase | Relational DB | Supabase provides Postgres 15+. Direct access via Supabase client or pg for raw queries if needed. |

**Supabase free tier relevant limits (MEDIUM confidence — pricing page blocked, from training data):** 500MB database, 1GB storage, 50,000 MAU auth, 5GB bandwidth. Sufficient for v1 with a single store. Upgrade path to Pro ($25/mo) is straightforward.

**Custom JWT claims (HIGH confidence):** The decision to use custom JWT claims for RLS is well-founded. Supabase supports this via Database Functions that inject `app_metadata` or by calling `auth.jwt()` in RLS policies. The correct pattern is to set `store_id` and `role` as JWT claims in `raw_app_meta_data` via a Supabase Auth hook (auth.users trigger), then reference `(auth.jwt()->'app_metadata'->>'store_id')::uuid` in RLS policies. This avoids per-row user table joins that cause 2–11x query overhead.

---

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (node) | **^17.x** | Server-side Stripe API, webhooks | stripe-node ^17 is current as of 2025. Use for creating PaymentIntents, Checkout Sessions, handling webhooks in Route Handlers. |
| @stripe/stripe-js | **^4.x** | Client-side Stripe Elements | Loads Stripe.js for online storefront card UI. Use Stripe Checkout (hosted) rather than custom Elements for v1 — less scope, PCI-compliant out of the box. |

**Stripe API version (MEDIUM confidence):** Pin to `2024-06-20` or later in your Stripe dashboard and stripe-node instantiation. The online storefront uses Stripe Checkout Sessions. EFTPOS is manual entry — no Stripe involvement for POS cash flow in v1.

**What NOT to use:** Do not use Stripe Terminal SDK in v1. Project explicitly defers hardware EFTPOS integration to v1.1. Do not use Stripe Elements custom card UI for the online storefront — Stripe Checkout hosted page is simpler, handles 3DS, and is adequate for a small NZ retail storefront.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | **4.2** (latest stable, released April 2025) | Utility-first CSS | v4 is a major rewrite — CSS-native config via `@import "tailwindcss"`, no `tailwind.config.js` needed by default. The design system (deep navy + amber) maps cleanly to Tailwind utility classes. |
| @tailwindcss/postcss | **^4.x** | PostCSS integration for Next.js | Required for Tailwind v4 with Next.js. Replaces the old `tailwind.config.js` + `postcss.config.js` pattern. |

**Tailwind v4 caution (from Key Decisions):** Spacing tokens caused bugs with the CSS-native config approach. Use `@theme` block in `globals.css` and test spacing utilities before relying on them.

---

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | **^3.x** | Schema validation on Server Actions and API inputs | The Next.js official auth documentation explicitly recommends Zod for Server Action validation (confirmed in official docs 2026-03-25). Zod 3.x is the current stable series. Every Server Action must validate inputs with `z.safeParse()` before touching the database. |

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth (via @supabase/ssr) | included with Supabase | Owner email/password auth | Supabase Auth is listed explicitly in the Next.js official auth library recommendations (confirmed 2026-03-25). Handles JWT issuance, refresh tokens, and cookie management via `@supabase/ssr`. |
| jose | **^5.x** | JWT verification for custom staff PIN sessions | Next.js official docs use `jose` for stateless session encryption (JWT signing with HS256). Staff PIN login is a custom session separate from Supabase Auth — use jose to sign/verify short-lived PIN sessions stored in HttpOnly cookies. Compatible with Edge Runtime. |

---

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | **latest (^2.x or ^3.x)** | Unit tests for utilities, GST calculations, state machines | Official Next.js docs (2026-03-25) recommend Vitest + React Testing Library for unit testing. Critical for GST rounding logic — per-line calculations must be deterministic. Does not support async Server Components directly; use for pure functions. |
| @testing-library/react | **^16.x** | Component testing for Client Components | Pairs with Vitest for rendering Client Component tests (POS cart, PIN pad, etc). |
| Playwright | **latest** | E2E tests for checkout flows, auth flows | Official Next.js docs (2026-03-25) recommend Playwright for E2E. Critical paths to test: online Stripe checkout, POS sale completion with EFTPOS confirmation, stock decrement after transaction. |

---

### Deployment & Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Free tier | Next.js hosting | Verified adapter — full Next.js feature support including Server Actions, middleware, image optimisation. Zero config for a Next.js project. Free tier sufficient for v1 (100GB bandwidth, serverless functions). |
| Supabase | Free tier | Managed Postgres + Auth + Storage | Co-located data and auth. Free tier sufficient for single-store v1. |
| Supabase Storage | included | Product images | Use Supabase Storage buckets for product images. Serves directly via CDN URL. Integrate with `next/image` `remotePatterns` config pointing to `*.supabase.co`. |

---

## v3.0 Inventory Management — Stack Additions

**No new npm packages are required.** The existing stack handles all v3.0 features. What changes are database schema (migrations), Server Actions, and `config/addons.ts` wiring.

---

### Database Schema Changes

The following schema additions are needed. All are pure SQL migrations — no new Supabase features or extensions required.

#### 1. `products` table: add `product_type` column

```sql
-- Migration: 024_inventory_management.sql (new migration)
ALTER TABLE public.products
  ADD COLUMN product_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service'));
```

**Why `product_type` not `is_service` boolean:** The type system will likely expand (e.g. `digital`, `bundle`). An enum-style TEXT CHECK is more forward-compatible than a boolean. `DEFAULT 'physical'` ensures backwards compatibility with all existing products.

**Impact on existing logic:** The `complete_pos_sale` RPC currently does an unconditional stock check and decrement for all items. It must be updated to skip both checks for `product_type = 'service'` items. The RPC must query `product_type` alongside `stock_quantity` in its lock step.

#### 2. `store_plans` table: add `has_inventory` column

```sql
-- In same migration 024
ALTER TABLE public.store_plans
  ADD COLUMN has_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_inventory_manual_override BOOLEAN NOT NULL DEFAULT false;
```

**Pattern:** Matches the existing `has_xero` / `has_xero_manual_override` pair established in migrations 014 and 020. The `_manual_override` column lets super admins comp the add-on without a Stripe subscription — already the established pattern.

#### 3. `stock_adjustments` table: new table

```sql
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  adjusted_by UUID REFERENCES public.staff(id),  -- NULL if system (sale/refund)
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('sale', 'refund', 'manual', 'stocktake', 'import')),
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,               -- positive = increase, negative = decrease
  quantity_after INTEGER NOT NULL,
  reason TEXT,                                    -- free-text reason for manual adjustments
  reference_order_id UUID REFERENCES public.orders(id),  -- populated for sale/refund types
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_adjustments_store ON public.stock_adjustments(store_id);
CREATE INDEX idx_stock_adjustments_product ON public.stock_adjustments(product_id, created_at DESC);
```

**Why a separate table, not an event log on `products`:** The history needs to be queryable by product, by date, by type, and filterable by adjustment type. A dedicated table with appropriate indexes is cleaner than a JSONB audit column on products. The `quantity_before` / `quantity_after` snapshot makes history self-contained and auditable without needing to replay events.

**Why `adjusted_by` is nullable:** Sales and refunds create implicit adjustments via the `complete_pos_sale` RPC. These have no staff actor in the adjustment itself (the sale has a staff_id) — linking via `reference_order_id` provides traceability.

#### 4. `stocktakes` and `stocktake_items` tables: new tables

```sql
CREATE TABLE public.stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  created_by UUID NOT NULL REFERENCES public.staff(id),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID NOT NULL REFERENCES public.stocktakes(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,         -- snapshot at time of count
  system_quantity INTEGER NOT NULL,   -- stock_quantity at time count started
  counted_quantity INTEGER,           -- NULL until counted
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stocktake_id, product_id)
);

CREATE INDEX idx_stocktakes_store ON public.stocktakes(store_id, created_at DESC);
CREATE INDEX idx_stocktake_items_stocktake ON public.stocktake_items(stocktake_id);
```

**Why a two-table model:** Separates the session (stocktake) from the per-product counts. This lets the UI load only the stocktake header, then paginate or stream line items. The `GENERATED ALWAYS AS` computed column for `variance` avoids application-level arithmetic and keeps the DB as the source of truth.

**Why `system_quantity` snapshot:** At commit time, the system quantity may have changed due to concurrent sales. Snapshotting at session-start makes variance calculation consistent and auditable.

#### 5. RLS policies for new tables

New tables need RLS policies following the established pattern: `store_id = (auth.jwt()->'app_metadata'->>'store_id')::uuid`.

```sql
-- stock_adjustments: store members read, admin client writes
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_adjustments_store_read" ON public.stock_adjustments
  FOR SELECT USING (
    store_id = (auth.jwt()->'app_metadata'->>'store_id')::UUID
  );
-- No INSERT/UPDATE/DELETE via RLS — all writes go through SECURITY DEFINER RPCs

-- stocktakes: store members read/write
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stocktakes_store_read" ON public.stocktakes
  FOR SELECT USING (store_id = (auth.jwt()->'app_metadata'->>'store_id')::UUID);

-- stocktake_items: store members read/write
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stocktake_items_store_read" ON public.stocktake_items
  FOR SELECT USING (store_id = (auth.jwt()->'app_metadata'->>'store_id')::UUID);
```

**Pattern note:** Writes to `stock_adjustments` happen only via SECURITY DEFINER RPCs (same pattern as `complete_pos_sale`). This prevents application code from writing raw adjustments that bypass the `quantity_before`/`quantity_after` bookkeeping invariant.

#### 6. Update `custom_access_token_hook` to inject `has_inventory` claim

Following the exact pattern from `019_billing_claims.sql`, add `v_has_inventory BOOLEAN` to the hook and inject it into JWT claims. This enables `requireFeature('inventory')` fast path without a DB query.

---

### `complete_pos_sale` RPC Update

The existing RPC in `005_pos_rpc.sql` must be updated (via a new migration) to:

1. **Query `product_type`** in the lock step: `SELECT stock_quantity, product_type INTO v_current_stock, v_product_type FROM products WHERE ...`
2. **Skip stock check for services:** Only raise `OUT_OF_STOCK` if `v_product_type = 'physical'`
3. **Skip stock decrement for services:** Only `UPDATE products SET stock_quantity = ...` for physical items
4. **Write a `stock_adjustments` row for each physical item sold** (type = `'sale'`, quantity_change = negative quantity)

This keeps the RPC as the single authoritative path for stock mutations — no stock change happens outside a SECURITY DEFINER function.

---

### `config/addons.ts` Changes

Add `'inventory'` to the `SubscriptionFeature` union and update all three maps:

```typescript
// Before
export type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain'

// After
export type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain' | 'inventory'
```

Update `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, and `ADDONS` arrays. Add `STRIPE_PRICE_INVENTORY` env var.

---

### New Server Actions Required

All follow the existing pattern: `'use server'`, `import 'server-only'`, Zod validation, admin client for mutations, `revalidatePath` after writes.

| Action | File | Gating |
|--------|------|--------|
| `adjustStock` | `src/actions/inventory/adjustStock.ts` | `requireFeature('inventory', { requireDbCheck: true })` |
| `createStocktake` | `src/actions/inventory/createStocktake.ts` | `requireFeature('inventory', { requireDbCheck: true })` |
| `updateStocktakeItem` | `src/actions/inventory/updateStocktakeItem.ts` | `requireFeature('inventory', { requireDbCheck: true })` |
| `commitStocktake` | `src/actions/inventory/commitStocktake.ts` | `requireFeature('inventory', { requireDbCheck: true })` |

**Why `requireDbCheck: true` on all inventory mutations:** Stock adjustments are irreversible — a stale JWT claim granting inventory access when the subscription has been cancelled would create incorrect stock records. DB check on every mutation is the correct tradeoff. This matches the pattern already established for Xero disconnect/sync actions.

**`adjustStock` Zod schema:**
```typescript
const AdjustStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity_change: z.number().int().refine(n => n !== 0, 'Change must be non-zero'),
  adjustment_type: z.enum(['manual', 'import']),
  reason: z.string().max(500).optional(),
})
```

**`commitStocktake` requirements:** Must be atomic — use a SECURITY DEFINER RPC `commit_stocktake(p_stocktake_id)` that:
1. Locks all affected product rows
2. Updates `stock_quantity` on each product to `counted_quantity`
3. Writes `stock_adjustments` rows for each variance (type = `'stocktake'`)
4. Sets `stocktake.status = 'completed'` and `completed_at = now()`

This follows the same rationale as `complete_pos_sale`: stock changes must be atomic and go through a SECURITY DEFINER function.

---

### New Zod Schemas Required

Add to `src/schemas/`:

- `src/schemas/inventory.ts` — `AdjustStockSchema`, `CreateStocktakeSchema`, `UpdateStocktakeItemSchema`, `CommitStocktakeSchema`

Update `src/schemas/product.ts` to include `product_type`:

```typescript
export const CreateProductSchema = z.object({
  // existing fields...
  product_type: z.enum(['physical', 'service']).default('physical'),
})
```

---

### Environment Variables

One new env var needed:

```bash
# Stripe Price ID for Inventory Management add-on
STRIPE_PRICE_INVENTORY=price_xxxx
```

Add to `.env.local.example` and `.env.example`. The pattern matches `STRIPE_PRICE_XERO` etc.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | latest | Prevent server code from running on client | Import in any file with Supabase credentials, session logic, or Server Actions. Causes build error if accidentally imported client-side. |
| date-fns | **^3.x** | Date manipulation | End-of-day reports, Xero sync date ranges, click-and-collect scheduling. Do not use moment.js (deprecated). |
| react-hook-form | **^7.x** | Form state management on Client Components | For complex POS forms (product creation, discount application). Use with Zod resolver (`@hookform/resolvers`). Not needed for simple Server Action forms. |
| @hookform/resolvers | **^3.x** | Zod integration for react-hook-form | Bridges Zod schemas into react-hook-form validation. |
| sharp | **latest** | Image processing | Installed automatically by Next.js for image optimisation. List in `serverExternalPackages` if needed — it is on Next.js's auto-opt-out list. |
| tsx / ts-node | dev only | Run TypeScript scripts | For database seed scripts, migration helpers. |

---

## What NOT to Use (and Why)

| Category | Avoid | Why |
|----------|-------|-----|
| ORM | Prisma | Adds a build step (prisma generate), cold start overhead on serverless, and complexity for a project already using Supabase client SDK. Use Supabase JS client with typed queries instead. The Supabase client IS the data layer. |
| State management | Redux, Zustand | Overkill for this architecture. Server Components handle most data fetching. Use React state + Server Actions for mutations. Zustand acceptable only if POS cart state becomes complex. |
| Auth library | NextAuth / Auth.js | Supabase Auth is already the auth system. Adding another auth library creates two competing session systems. |
| Auth library | Clerk | Paid SaaS with its own user DB. Conflicts with Supabase RLS model. |
| CSS | CSS Modules, styled-components, Emotion | Not the chosen stack. Tailwind utility classes are sufficient for this project scope. |
| CSS | Tailwind v3 | v4 is current. v3 uses deprecated config model incompatible with v4 PostCSS setup. |
| Realtime | Supabase Realtime (for inventory) | Refresh-on-transaction is the established pattern. Realtime adds WebSocket failure modes for no benefit in a single-operator POS. |
| Database | Raw pg / Drizzle / Kysely | Supabase JS client handles all query needs. Adding a second query layer creates type conflicts with Supabase's generated types. |
| Payments | Stripe Terminal SDK (v1) | Hardware EFTPOS integration explicitly deferred to v1.1. Terminal SDK is complex, requires device provisioning. |
| Inventory | Dedicated inventory library (e.g. inventory.js, stock-keeping) | No meaningful NZ-ecosystem library exists. The requirements are simple enough that bespoke Server Actions + SECURITY DEFINER RPCs are the correct approach. Adding a library here would obscure the stock decrement logic rather than simplify it. |
| Testing | Jest | Vitest is the recommended alternative — faster, native ESM, better TypeScript support, compatible with Vite tooling ecosystem. Jest requires significant config to work with Next.js App Router. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `product_type TEXT CHECK (...)` | `is_service BOOLEAN` | Use boolean only if the type system will never expand beyond two values. TEXT enum is safer given the domain may add `digital`, `bundle`, or `rental` types later. |
| SECURITY DEFINER RPC for stocktake commit | Application-level loop of `adjustStock` calls | Never. Application-level loops are not atomic. A crash mid-loop leaves stock partially updated. The RPC is the only correct approach. |
| `stock_adjustments` dedicated table | JSONB audit column on `products` | Use JSONB only if you never need to query by adjustment type, product, or date range. Since the stocktake report filters by all three, a proper table with indexes is the correct choice. |
| `has_inventory` + `has_inventory_manual_override` columns on `store_plans` | Separate `inventory_subscriptions` table | The existing two-column pattern (feature flag + manual override) is proven and already integrated with the JWT claims hook. A separate table would require changes to `requireFeature()`, the auth hook, and the billing webhook. |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @supabase/supabase-js ^2.x | PostgreSQL GENERATED ALWAYS AS columns | Supabase JS client returns computed columns (variance) as regular fields in select results. No special handling needed. |
| zod ^3.x | TypeScript 5.x | Compatible. `z.enum(['physical', 'service'])` works with `.default('physical')` chaining. |
| Next.js 16.2 | SECURITY DEFINER RPCs via admin client | Admin client (service role key) bypasses RLS — required for RPCs that write across tenant boundaries. Compatible pattern confirmed through 48 existing Server Actions. |

---

## Installation

No new packages for v3.0. All changes are schema migrations, Server Actions, and config updates.

```bash
# No npm install needed for v3.0

# New environment variable to add to .env.local:
# STRIPE_PRICE_INVENTORY=price_xxxx
```

---

## Sources

- Codebase analysis: `supabase/migrations/001_initial_schema.sql` through `023_performance_indexes.sql` — schema patterns confirmed HIGH confidence
- Codebase analysis: `src/lib/requireFeature.ts` — dual-path JWT/DB feature gating pattern confirmed HIGH confidence
- Codebase analysis: `src/config/addons.ts` — add-on extension pattern confirmed HIGH confidence
- Codebase analysis: `supabase/migrations/005_pos_rpc.sql` — SECURITY DEFINER RPC atomic pattern confirmed HIGH confidence
- Codebase analysis: `supabase/migrations/019_billing_claims.sql` — JWT claims injection pattern confirmed HIGH confidence
- Codebase analysis: `supabase/migrations/020_super_admin_panel.sql` — manual override column pattern confirmed HIGH confidence
- PostgreSQL documentation: `GENERATED ALWAYS AS ... STORED` — available in PostgreSQL 12+; Supabase runs Postgres 15+ (HIGH confidence)

---
*Stack research for: NZPOS inventory management (v3.0)*
*Researched: 2026-04-04*
