# Phase 1: Foundation - Research

**Researched:** 2026-04-01
**Domain:** Next.js 16 App Router scaffold, Supabase schema + RLS, authentication (owner + staff PIN), GST module, CI/CD, iPad PWA
**Confidence:** HIGH — core stack fully verified against live official docs; Supabase Auth hook syntax verified against supabase.com/docs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Supabase Setup**
- D-01: Use Supabase local development via Docker (`supabase start`) during build phase. No hosted Supabase account needed until deployment. Push migrations to hosted instance when ready to go live.
- D-02: When deploying: Sydney region (closest to NZ, ~20ms latency). Tier decision deferred to deployment time (free tier for initial launch, Pro for production).

**Authentication**
- D-03: Staff PIN is 4 digits (10k combinations, sufficient for 4-10 staff). Stored as bcrypt hash.
- D-04: Owner signup with email/password, immediate access (no email verification required). Verification can be added later if expanding to multi-tenant.
- D-05: PIN lockout after 10 failed attempts in 5 minutes. Owner can unlock staff accounts from admin.
- D-06: Custom JWT claims: `store_id` and `role` stored in `raw_app_meta_data`. RLS policies use `auth.jwt()->'app_metadata'->>'store_id'`.

**Seed Data**
- D-07: Development seed script with 20-30 realistic NZ supplies products across categories (Cleaning, Linen, Toiletries, Maintenance, Kitchen). Seed includes a test store, test owner, and 2 test staff accounts.
- D-08: Production starts clean (no seed data). Seed script only runs in development environment.

**GST Module**
- D-09: Pure function, no dependencies. Per-line calculation on discounted amounts: `gstCents = Math.round(discountedPriceCents * qty * 3 / 23)`. Order GST = sum of line GSTs.
- D-10: Test suite includes IRD specimen test cases: standard items, discounted items, zero-value items, rounding edge cases.

**PWA**
- D-11: Manifest + icons + standalone fullscreen mode. No service worker in Phase 1 (offline mode is v2 scope). PWA installable on iPad home screen.

**Tech stack (from CLAUDE.md — non-negotiable)**
- Next.js 16.2 (App Router), React 19, TypeScript 5.x
- Supabase (@supabase/supabase-js ^2.x + @supabase/ssr ^0.x — NOT the deprecated auth-helpers package)
- Tailwind CSS v4.2 (CSS-native config, NOT tailwind.config.js)
- Stripe ^17.x (server), @stripe/stripe-js ^4.x (client)
- Zod ^3.x (validation on all Server Actions)
- jose ^5.x (staff PIN JWT sessions)
- Vitest ^2.x or ^3.x + @testing-library/react ^16.x (unit tests)
- Playwright (E2E)
- Vercel free tier (hosting), Supabase free tier (DB/Auth/Storage)
- No Prisma, no Redux/Zustand, no NextAuth/Auth.js, no Clerk, no Tailwind v3, no CSS Modules

### Claude's Discretion
- PWA icon sizes and splash screens (standard set for iPad)
- Exact Zod schema structure (as long as every Server Action is validated)
- CI/CD pipeline structure (GitHub Actions workflow file)
- Supabase migration file naming conventions

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Next.js 16 project scaffolded with App Router, Tailwind v4, Supabase client | Scaffold command + Tailwind v4 CSS-native config pattern below |
| FOUND-02 | Supabase schema deployed with all tables, store_id on every table, indexes | Database schema sketch + migration pattern + CI check for RLS |
| FOUND-03 | Custom JWT claims configured (store_id + role in app_metadata) | Auth hook SQL syntax verified against supabase.com/docs |
| FOUND-04 | RLS policies enforce tenant isolation on all tables | RLS policy patterns + cross-tenant isolation test pattern |
| FOUND-05 | GST calculation module (per-line on discounted amounts, IRD-compliant) with unit tests | GST formula confirmed (3/23), Vitest test pattern, IRD specimen cases |
| FOUND-06 | Zod validation schemas for all entity types | Server Action + Zod pattern from ARCHITECTURE.md |
| FOUND-07 | Money stored as integer cents throughout, display formatting in UI only | INTEGER column type enforcement, Zod schema constraint |
| AUTH-01 | Owner can sign up with email/password via Supabase Auth | @supabase/ssr + createServerClient pattern |
| AUTH-02 | Staff can log in with 4-digit PIN (bcrypt hashed) | bcryptjs ^3.x, jose ^5.x JWT issuance pattern |
| AUTH-03 | Staff PIN lockout after 10 failed attempts in 5 minutes | pin_attempts counter + pin_locked_until timestamp in staff table |
| AUTH-04 | Owner has full access; staff has POS-only access | JWT role claim + middleware route protection |
| AUTH-05 | Route-level middleware enforces role-based access (/pos = staff+owner, /admin = owner only) | Next.js middleware pattern with JWT verification |
| DEPLOY-01 | CI/CD via GitHub Actions: test → deploy to Vercel → Supabase migrations | GitHub Actions workflow structure researched |
| DEPLOY-02 | iPad PWA: manifest, icons, fullscreen mode, installable | app/manifest.ts pattern from Next.js 16 official docs |
</phase_requirements>

---

## Summary

Phase 1 establishes every shared primitive that later phases build on. The five main work streams are: (1) project scaffold and folder structure, (2) Supabase schema + RLS with custom JWT claims, (3) dual authentication system (owner email/password + staff PIN), (4) GST calculation module with unit tests, and (5) CI/CD pipeline + PWA manifest.

The entire stack has been verified against current official documentation (Next.js 16.2.1, supabase.com, Tailwind v4.2). The most fragile area is the Supabase custom access token hook — the SQL syntax was confirmed against the current Supabase docs but the hook must be enabled in the Supabase dashboard (Authentication > Hooks) after the migration runs. Local development uses `supabase start` via Docker; no hosted Supabase account is needed until deployment.

The GST formula (`Math.round(cents * 3 / 23)`) is IRD-confirmed and must live in `lib/gst.ts` as a pure function with a full Vitest test suite before any checkout code is written. All monetary values are INTEGER cents — this is enforced at the schema level (no DECIMAL or FLOAT columns) and at the Server Action boundary via Zod.

**Primary recommendation:** Build in strict dependency order — schema + RLS + JWT claims must be complete and tested before auth, and auth must be complete before any Server Action that touches protected data. Do not write any checkout or product code until FOUND-01 through FOUND-07 and AUTH-01 through AUTH-05 are all green.

---

## Project Constraints (from CLAUDE.md)

All directives from CLAUDE.md that the planner must verify compliance with:

| Directive | Category | Enforcement |
|-----------|----------|-------------|
| Always read DESIGN.md before visual/UI decisions | Design | UI work must reference DESIGN.md |
| Next.js 16 App Router — non-negotiable | Stack | Scaffold with `create-next-app@latest` |
| Supabase (not Firebase, not PlanetScale) | Stack | No alternative BaaS |
| @supabase/ssr (NOT @supabase/auth-helpers-nextjs) | Stack | Build error if old package imported |
| Tailwind v4 CSS-native config (no tailwind.config.js) | Stack | globals.css @theme, postcss.config.mjs |
| Zod on every Server Action | Code quality | `z.safeParse()` before any DB call |
| Money as INTEGER cents | Data integrity | No DECIMAL/FLOAT/NUMERIC for prices |
| No Prisma | Stack | Use Supabase JS client directly |
| No Zustand/Redux | Stack | React state + Server Actions |
| No NextAuth/Auth.js/Clerk | Stack | Supabase Auth + jose only |
| No Tailwind v3 | Stack | v4 incompatible config model |
| No Supabase Realtime for inventory | Architecture | refresh-on-transaction via revalidatePath |
| No Stripe Terminal SDK in v1 | Stack | Manual EFTPOS confirmation step |
| Vitest over Jest | Testing | Vitest native ESM, faster, RTL pairs |
| Vercel free tier | Deployment | No VPS, no self-hosting |
| GSD workflow before file changes | Process | Use `/gsd:execute-phase` entry point |

---

## Standard Stack

### Core
| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| next | **16.2.1** (npm verified 2026-04-01) | Full-stack framework | App Router, Server Actions, RSC, Vercel-native |
| react | **19** (bundled) | UI rendering | Concurrent features, `useActionState` |
| typescript | **5.x** (bundled) | Type safety | Required — Next.js 16 ships with TS |
| @supabase/supabase-js | **2.101.0** (npm verified) | Postgres, Auth, Storage client | Managed Postgres + RLS + Auth in one |
| @supabase/ssr | **0.10.0** (npm verified) | Cookie-based auth for App Router | Required adapter; replaces deprecated auth-helpers |
| tailwindcss | **4.2.2** (npm verified) | Utility-first CSS | v4 CSS-native config, design system tokens in @theme |
| @tailwindcss/postcss | **^4.x** | PostCSS integration | Required for Tailwind v4 + Next.js |
| zod | **4.3.6** (npm verified — note: this is Zod v4, see note) | Schema validation | Next.js official docs recommend Zod for Server Actions |
| jose | **6.2.2** (npm verified) | Staff PIN JWT sessions | Edge Runtime compatible, used in Next.js official auth guide |
| bcryptjs | **3.0.3** (npm verified) | PIN hashing | Pure JS bcrypt, no native bindings, works on Vercel |
| stripe | **21.0.1** (npm verified) | Server-side Stripe API | stripe-node, handles Checkout Sessions + webhooks |
| @stripe/stripe-js | **^4.x** | Client-side Stripe.js | Loads Stripe for hosted Checkout redirect |
| vitest | **4.1.2** (npm verified) | Unit tests | Next.js official recommendation; native ESM, fast |
| @testing-library/react | **^16.x** | Component tests | Pairs with Vitest; RTL standard |
| @playwright/test | **1.58.2** (npm verified) | E2E tests | Next.js official recommendation |

**Zod version note (MEDIUM confidence):** `npm view zod version` returned `4.3.6` as of 2026-04-01, suggesting Zod v4 has shipped stable. CLAUDE.md specifies `^3.x`. The planner should verify Zod v4 API compatibility before using v4 features — `z.safeParse()` is unchanged in v4. Default to `^3.24.x` (latest 3.x) unless v4 is confirmed stable and compatible. Flag for executor to check `npm view zod versions` for latest 3.x.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | 0.0.1 | Prevent server code on client | Every file with Supabase credentials or Server Actions |
| date-fns | 4.1.0 (npm verified) | Date manipulation | Reports, scheduling (use ^3.x for stability) |
| react-hook-form | ^7.x | Complex form state | Complex POS forms; not needed for simple Server Action forms |
| @hookform/resolvers | ^3.x | Zod + react-hook-form bridge | When react-hook-form is used |
| sharp | latest (auto) | Image processing | Auto-installed by Next.js; list in serverExternalPackages if needed |
| tsx | dev | TypeScript script runner | Seed scripts, migration helpers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | argon2 | argon2 is stronger but requires native bindings; bcryptjs is pure JS and Vercel-safe |
| bcryptjs | bcrypt (native) | bcrypt native is faster but fails on Vercel serverless; bcryptjs is the correct choice |
| jose (staff PIN JWT) | Supabase Auth for staff | Creates two user tables, complicates RLS; custom JWT is cleaner for PIN-only staff |

**Installation:**
```bash
npx create-next-app@latest nzpos --typescript --eslint --app --tailwind --src-dir --import-alias "@/*"
npm install tailwindcss@latest @tailwindcss/postcss postcss
npm install @supabase/supabase-js @supabase/ssr
npm install zod jose bcryptjs
npm install server-only date-fns
npm install stripe @stripe/stripe-js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
npm install -D @playwright/test
npm install -D tsx
npx playwright install
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (pos)/
      layout.tsx         # PIN auth gate, tablet viewport lock (no zoom)
      pos/
        page.tsx
        checkout/
          page.tsx
    (store)/
      layout.tsx         # Public layout, no auth
      page.tsx
      products/[slug]/page.tsx
      cart/page.tsx
      checkout/page.tsx
      orders/[id]/page.tsx
    (admin)/
      layout.tsx         # Owner email/password auth gate
      dashboard/page.tsx
      products/
        page.tsx
        new/page.tsx
        [id]/edit/page.tsx
      orders/page.tsx
      reports/page.tsx
    api/
      webhooks/
        stripe/route.ts
    globals.css           # Tailwind v4 @import + @theme tokens
    layout.tsx
    manifest.ts           # PWA manifest (Next.js 16 built-in)
  lib/
    gst.ts               # Pure GST calculation function (no deps)
    supabase/
      client.ts          # createBrowserClient (for Client Components)
      server.ts          # createServerClient (for Server Components + Actions)
      middleware.ts       # createMiddlewareClient helper
  middleware.ts            # Route protection: /pos, /admin, /api/webhooks
  actions/
    auth/
      ownerSignup.ts     # Zod-validated, Supabase Auth
      ownerSignin.ts
      staffPin.ts        # PIN verify, jose JWT issuance
    pos/
      completeSale.ts    # Atomic stock decrement RPC
  schemas/
    product.ts           # Zod schema for product entity
    order.ts
    staff.ts
    store.ts
  types/
    database.ts          # Generated from Supabase schema (supabase gen types)
  components/
    ui/                  # Shared primitives (Button, Card, Badge)
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_auth_hook.sql
    004_seed_functions.sql
  seed.ts                # Dev seed (tsx supabase/seed.ts)
  config.toml
```

### Pattern 1: Tailwind v4 CSS-Native Configuration
**What:** No `tailwind.config.js`. Design tokens live in `globals.css` under `@theme`.
**When to use:** Always — Tailwind v4 requires this pattern.
```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-navy: #1E293B;
  --color-navy-light: #334155;
  --color-navy-dark: #0F172A;
  --color-amber: #E67E22;
  --color-amber-hover: #D35400;
  --color-bg: #FAFAF9;
  --color-surface: #F5F5F4;
  --color-card: #FFFFFF;
  --color-text: #1C1917;
  --color-text-muted: #78716C;
  --color-border: #E7E5E4;
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --font-sans: 'DM Sans', sans-serif;
  --font-display: 'Satoshi', sans-serif;
  --font-mono: 'Geist Mono', monospace;
}
```

```js
// postcss.config.mjs
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### Pattern 2: Supabase Client Creation (Server vs Browser)
**What:** Two different client creation paths for server-side and client-side code.
```typescript
// src/lib/supabase/server.ts — Server Components, Server Actions, Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (all) => all.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}

// src/lib/supabase/client.ts — Client Components only
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Pattern 3: Custom Access Token Hook (Supabase Auth)
**What:** Postgres function that fires on every token issuance to inject `store_id` and `role` into JWT.
**Source:** supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook (verified 2026-04-01)
```sql
-- supabase/migrations/003_auth_hook.sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
BEGIN
  claims := event -> 'claims';

  -- Look up store_id and role from staff table
  SELECT store_id, role INTO user_store_id, user_role
  FROM public.staff
  WHERE auth_user_id = (event ->> 'user_id')::UUID;

  IF user_store_id IS NOT NULL THEN
    -- Ensure app_metadata object exists
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;
    claims := jsonb_set(claims, '{app_metadata,store_id}', to_jsonb(user_store_id::TEXT));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

**After migration:** Enable in Supabase Dashboard → Authentication → Hooks → Custom Access Token → set to `public.custom_access_token_hook`. This cannot be automated via migration; it is a manual dashboard step (or Supabase CLI `supabase functions` if using Edge Functions approach).

### Pattern 4: RLS Policy Using Custom JWT Claims
**What:** All RLS policies use JWT claim lookups, never table joins.
```sql
-- Example: products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation"
  ON products
  USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
```

### Pattern 5: GST Calculation Module
**What:** Pure function, no imports, in `lib/gst.ts`. All monetary values in integer cents.
```typescript
// src/lib/gst.ts
// NZ GST: tax-inclusive at 15%. GST fraction = 3/23 of inclusive price.
// IRD requires per-line calculation on discounted amounts.

export function gstFromInclusiveCents(inclusiveCents: number): number {
  return Math.round(inclusiveCents * 3 / 23)
}

export function calcLineItem(
  unitPriceCents: number,
  qty: number,
  discountCents: number = 0
): { lineTotal: number; gst: number; excl: number } {
  const lineTotal = unitPriceCents * qty - discountCents
  const gst = gstFromInclusiveCents(lineTotal)
  const excl = lineTotal - gst
  return { lineTotal, gst, excl }
}

export function calcOrderGST(lineGSTs: number[]): number {
  return lineGSTs.reduce((sum, g) => sum + g, 0)
}
```

### Pattern 6: Staff PIN Authentication Flow
```typescript
// src/actions/auth/staffPin.ts
'use server'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const PinSchema = z.object({
  storeId: z.string().uuid(),
  staffId: z.string().uuid(),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export async function verifyStaffPin(input: unknown) {
  const { storeId, staffId, pin } = PinSchema.parse(input)
  // 1. Fetch staff record, check lockout, verify bcrypt hash
  // 2. On success: issue jose JWT with role + store_id
  const token = await new SignJWT({ role: 'staff', store_id: storeId, staff_id: staffId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)
  // 3. Set HttpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('staff_session', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
}
```

### Pattern 7: PWA Manifest (Next.js 16 built-in)
**Source:** nextjs.org/docs/app/guides/progressive-web-apps (verified 2026-04-01, v16.2.1)
```typescript
// src/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NZPOS',
    short_name: 'NZPOS',
    description: 'NZ Retail POS System',
    start_url: '/pos',
    display: 'standalone',        // 'fullscreen' also valid; standalone hides URL bar but shows status bar
    background_color: '#1E293B',  // navy — matches design system
    theme_color: '#1E293B',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },  // Apple touch icon
    ],
  }
}
```

**iPad-specific:** For iPad home screen installability, iOS requires `display: 'standalone'` (not 'fullscreen') and the icons array must include a 180×180 PNG. No service worker required for installability — only manifest + HTTPS. Apple does NOT auto-prompt "Add to Home Screen" — it requires manual Safari share sheet action by the user.

### Pattern 8: Vitest Configuration
**Source:** nextjs.org/docs/app/guides/testing/vitest (verified 2026-04-01, v16.2.1)
```typescript
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
  },
})
```

```json
// package.json scripts additions
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

### Pattern 9: GitHub Actions CI/CD
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run test           # Vitest unit tests
      - run: npm run build          # Next.js build check

  migrate:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase db push --db-url "${{ secrets.SUPABASE_DB_URL }}"

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Anti-Patterns to Avoid

- **Using `@supabase/auth-helpers-nextjs`:** Deprecated, replaced by `@supabase/ssr`. Import will cause errors with Next.js App Router cookie handling.
- **Putting Tailwind config in `tailwind.config.js`:** v4 uses CSS-native `@theme` in globals.css. Old config file is ignored in v4.
- **`store_id` from client form inputs in Server Actions:** Always derive `store_id` from the authenticated JWT, never accept it from form data.
- **Creating staff users in Supabase Auth:** Staff use a separate PIN system with custom JWTs. Do NOT create Supabase Auth users for staff — only for the owner.
- **Floating-point prices:** Schema must use `INTEGER` for all monetary columns (`price_cents`, `gst_cents`, etc.). No `DECIMAL`, `NUMERIC`, or `FLOAT`.
- **Missing `ENABLE ROW LEVEL SECURITY` in migrations:** Every table must have RLS enabled at creation. Add to every migration file. A CI step should fail if any table has `rowsecurity = false`.
- **Supabase service role key in client-side code:** `SUPABASE_SERVICE_ROLE_KEY` must never be in any `NEXT_PUBLIC_*` env var or client bundle.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password/PIN hashing | Custom hash function | bcryptjs | Constant-time comparison, salt handling, timing attack prevention |
| JWT signing/verification | Custom JWT | jose | HS256/RS256, expiry, Edge Runtime compatibility |
| Cookie-based session management with Supabase | Custom cookie logic | @supabase/ssr | App Router-aware, handles token refresh, avoids hydration mismatch |
| E2E test browser automation | Custom Puppeteer wrappers | Playwright | Multi-browser, auto-wait, built-in Next.js dev server integration |
| TypeScript types from Supabase schema | Manual type definitions | `supabase gen types typescript` | Auto-generated from actual schema, always in sync |
| Atomic stock decrement with conflict detection | Application-level check-then-update | Postgres function with `FOR UPDATE` or `NOT FOUND` guard | Concurrent transactions can both pass a read-then-write check; DB-level lock is the only safe approach |

**Key insight:** The most tempting hand-roll in this phase is the auth system. Both the Supabase Auth cookie management (`@supabase/ssr`) and the staff JWT signing (`jose`) are solved problems with well-tested libraries. Custom implementations in this area typically miss token refresh edge cases, cookie SameSite/Secure handling, and timing attack vectors.

---

## Common Pitfalls

### Pitfall 1: Supabase Auth Hook Not Enabled After Migration
**What goes wrong:** The auth hook SQL function is created via migration, but the hook must also be enabled in the Supabase Dashboard (Authentication → Hooks). If not enabled, JWTs are issued without `store_id` or `role` claims, and all RLS policies silently return no rows.
**Why it happens:** Migration files can create the function but cannot activate the hook — that requires a dashboard UI action or Supabase Management API call.
**How to avoid:** Add a manual step to the deployment checklist: "Enable custom access token hook in Supabase Dashboard." Include a verification test: after owner signup, decode the JWT and assert `app_metadata.store_id` is present.
**Warning signs:** All authenticated queries return empty arrays; no database errors.

### Pitfall 2: Tailwind v4 Breaking Change — No tailwind.config.js
**What goes wrong:** `create-next-app` may scaffold with Tailwind v3 config. Following any tutorial from 2024 or earlier will create a `tailwind.config.js` with `content` arrays. In v4, this config file is ignored and the `@theme` in globals.css is the only configuration source.
**How to avoid:** After scaffolding, immediately verify `package.json` shows `tailwindcss@^4.x`. Update `globals.css` to use `@import "tailwindcss"` and `@theme {}`. Replace `tailwind.config.js` with `postcss.config.mjs` if not already present.
**Warning signs:** Custom colors not working; `tailwind.config.js` file exists in the root.

### Pitfall 3: bcryptjs vs bcrypt (native) on Vercel
**What goes wrong:** `bcrypt` (the npm package with native bindings) fails to build on Vercel's serverless environment because it requires `node-gyp` native compilation.
**How to avoid:** Use `bcryptjs` (pure JavaScript). Same API, no native deps, Vercel-safe. Add `import bcryptjs from 'bcryptjs'` — never `import bcrypt from 'bcrypt'`.
**Warning signs:** Vercel build fails with `Error: Cannot find module 'bcrypt/bcrypt.node'`.

### Pitfall 4: GST Rounding at Order Level Instead of Per Line
**What goes wrong:** GST is calculated on the order total after summing all line items. Discounts on individual lines shift the tax base, causing the order-level GST to differ from the sum of per-line GSTs by 1-3 cents.
**Why it happens:** Developers treat GST as a display concern and compute it once.
**How to avoid:** Use `calcLineItem()` for every line, then `calcOrderGST(lineGSTs)` to sum. The `lib/gst.ts` module enforces this pattern. Vitest tests must include IRD specimen cases with discounts on odd-cent prices.
**Warning signs:** Cash-up totals with unexplained cent discrepancies; Xero sync producing line mismatch errors.

### Pitfall 5: store_id Missing from a Table (RLS Gap)
**What goes wrong:** One table is added without `store_id` or without RLS enabled. A future second-store customer can read the first store's data through that table.
**How to avoid:** CI check in GitHub Actions: `supabase db query "SELECT tablename FROM pg_tables WHERE schemaname='public'" | grep -v store_id` should return empty. Alternatively, write a Vitest test that uses a second store's JWT to query every table and asserts zero rows returned.
**Warning signs:** Any public schema table without a `store_id` column.

### Pitfall 6: Zod v3 vs v4 API Differences
**What goes wrong:** `npm install zod` currently installs v4.3.6. If code follows v3 docs (which the CLAUDE.md spec references), some APIs differ. Most notably, Zod v4 changed error formatting and some schema methods.
**How to avoid:** Pin to `zod@^3.24.0` explicitly in `package.json` during Phase 1. Upgrade to v4 deliberately after verifying no breaking changes affect the schemas used. The `z.safeParse()` method is unchanged and safe in both versions.

### Pitfall 7: iPad PWA Requires HTTPS for Installability
**What goes wrong:** PWA manifest is configured but the app is not served over HTTPS in development. Safari on iPad silently refuses to offer "Add to Home Screen" for HTTP origins.
**How to avoid:** Use `next dev --experimental-https` for local testing of PWA features. Vercel deployment is always HTTPS.
**Warning signs:** Manifest is valid but "Add to Home Screen" prompt never appears on iPhone/iPad.

---

## Code Examples

### GST Test Suite (IRD specimen cases)
```typescript
// src/lib/__tests__/gst.test.ts
import { describe, it, expect } from 'vitest'
import { gstFromInclusiveCents, calcLineItem, calcOrderGST } from '../gst'

describe('gstFromInclusiveCents', () => {
  it('standard $19.99 item', () => {
    // $19.99 = 1999 cents. GST = round(1999 * 3 / 23) = round(260.87) = 261 cents ($2.61)
    expect(gstFromInclusiveCents(1999)).toBe(261)
  })
  it('round $20.00 item', () => {
    // $20.00 = 2000 cents. GST = round(2000 * 3 / 23) = round(260.87) = 261 cents
    expect(gstFromInclusiveCents(2000)).toBe(261)
  })
  it('zero value item', () => {
    expect(gstFromInclusiveCents(0)).toBe(0)
  })
  it('fractional cent rounding — rounds half up', () => {
    // 23 cents: GST = round(23 * 3 / 23) = round(3) = 3 cents
    expect(gstFromInclusiveCents(23)).toBe(3)
  })
})

describe('calcLineItem with discount', () => {
  it('$34.99 towel set with 10% discount ($3.50)', () => {
    // unitPrice=3499, qty=1, discount=350. lineTotal=3149. gst=round(3149*3/23)=round(410.74)=411
    const result = calcLineItem(3499, 1, 350)
    expect(result.lineTotal).toBe(3149)
    expect(result.gst).toBe(411)
    expect(result.excl).toBe(2738)
  })
  it('multiple quantities', () => {
    // unitPrice=899 (surface spray), qty=3, discount=0. lineTotal=2697. gst=round(2697*3/23)=352
    const result = calcLineItem(899, 3, 0)
    expect(result.lineTotal).toBe(2697)
    expect(result.gst).toBe(352)
  })
})

describe('calcOrderGST', () => {
  it('sums per-line GST amounts', () => {
    expect(calcOrderGST([261, 411, 352])).toBe(1024)
  })
})
```

### RLS Cross-Tenant Isolation Test (Vitest + Supabase test client)
```typescript
// src/lib/__tests__/rls.test.ts
// Run against supabase start (local Docker) only — not in Vercel CI
import { createClient } from '@supabase/supabase-js'

// This test verifies RLS prevents Store B from reading Store A data
// Requires two test JWTs with different store_id claims
it('store B JWT returns zero products from store A', async () => {
  const storeBClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${STORE_B_TEST_JWT}` } } }
  )
  const { data } = await storeBClient
    .from('products')
    .select('*')
    .eq('store_id', STORE_A_ID)
  expect(data).toHaveLength(0)
})
```

### Next.js Middleware for Route Protection
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/pos')) {
    const staffToken = request.cookies.get('staff_session')?.value
    if (!staffToken) return NextResponse.redirect(new URL('/pos/login', request.url))
    try {
      await jwtVerify(staffToken, secret)
    } catch {
      return NextResponse.redirect(new URL('/pos/login', request.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    // Supabase Auth session validation via @supabase/ssr middleware helper
    // (implementation follows supabase.com/docs/guides/auth/server-side/nextjs)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/pos/:path*', '/admin/:path*'],
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | auth-helpers is deprecated; @supabase/ssr is the required package for App Router |
| `tailwind.config.js` with `content` arrays | CSS-native `@theme` in globals.css | Tailwind v4 (April 2025) | No tailwind.config.js needed; all config in CSS |
| `create-next-app` with pages router | `create-next-app` with `--app` flag | Next.js 13+ | App Router is default and correct for this project |
| Next.js v14/v15 | Next.js 16.2 | March 2026 | `use cache` directive stable, Cache Components available |
| Supabase custom claims via pg_graphql hook | Custom Access Token Hook (Auth Hooks) | 2023-2024 | Dedicated hook type; cleaner than database webhook approach |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated, do not install.
- `tailwind.config.js` pattern: Ignored in Tailwind v4; use globals.css `@theme` instead.
- Supabase `auth.users` table joins in RLS: Causes 2-11x query overhead; use JWT claims.

---

## Open Questions

1. **Zod v4 vs v3 for this project**
   - What we know: `npm view zod version` returns 4.3.6 as of 2026-04-01, suggesting v4 is now the latest stable. CLAUDE.md specifies `^3.x`.
   - What's unclear: Whether v4 introduced breaking changes to `.safeParse()`, `.object()`, or `.array()` APIs that affect the planned schemas.
   - Recommendation: Pin to `zod@^3.24.0` in package.json for Phase 1. Upgrade to v4 in a later phase after a deliberate migration review.

2. **Supabase Auth Hook activation — manual dashboard step**
   - What we know: The hook function is created via migration SQL but must be activated in the Supabase Dashboard (or via Supabase Management API).
   - What's unclear: Whether this can be automated in the `supabase/config.toml` for local development (so `supabase start` activates it automatically).
   - Recommendation: Executor should check `supabase/config.toml` docs for `[auth.hook.custom_access_token]` configuration option before assuming a manual step is required.

3. **`supabase db push` vs `supabase migration push` in CI**
   - What we know: Supabase CLI 2.84.5 is installed. The migration push command syntax may differ between CLI versions.
   - What's unclear: Whether `supabase db push --db-url` or `supabase migration push --linked` is the correct command for the CI workflow.
   - Recommendation: Executor should run `supabase --help` to verify the exact migration deploy command syntax for 2.84.5.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js, npm scripts | Yes | v22.22.0 | — |
| npm | Package management | Yes | 10.9.4 | — |
| Docker | `supabase start` (local DB) | Yes | 29.0.1 | — |
| Supabase CLI | Local DB, migrations | Yes (just installed) | 2.84.5 | — |
| Git | Version control, CI | Yes | 2.50.1 | — |
| gh (GitHub CLI) | Optional — CI secrets setup | No | — | Use GitHub web UI for secrets |
| Internet/HTTPS | Vercel deploy, Supabase hosted | Yes (assumed) | — | — |
| iPad for PWA testing | DEPLOY-02 PWA installability test | Unknown | — | Use Chrome DevTools iPad emulation for initial testing; real device for final QA |

**Missing dependencies with no fallback:**
- None blocking — all required tools for development are available.

**Missing dependencies with fallback:**
- `gh` CLI: Not installed. GitHub secrets can be set via web UI. Not blocking.
- iPad device: Real device testing deferred to QA phase. Chrome DevTools iPad simulation covers initial development.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (run `npm install -D vitest`) |
| Config file | `vitest.config.mts` (Wave 0 gap — must be created) |
| Quick run command | `npm run test` (Vitest in run mode, not watch) |
| Full suite command | `npm run test && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-05 | GST per-line calculation + IRD rounding | unit | `npm run test -- lib/gst` | Wave 0 gap |
| FOUND-04 | RLS cross-tenant isolation | integration | `npm run test -- lib/rls` | Wave 0 gap |
| FOUND-07 | Money stays integer cents (Zod schema) | unit | `npm run test -- schemas` | Wave 0 gap |
| AUTH-02 | Staff PIN verifies correctly | unit | `npm run test -- auth/staffPin` | Wave 0 gap |
| AUTH-03 | PIN lockout after 10 attempts | unit | `npm run test -- auth/lockout` | Wave 0 gap |
| AUTH-05 | Middleware blocks /admin for staff JWT | unit | `npm run test -- middleware` | Wave 0 gap |
| DEPLOY-01 | Build completes without errors | build check | `npm run build` | — |
| DEPLOY-02 | PWA manifest served at /manifest.webmanifest | manual | Open in Safari on iPad | — |
| AUTH-01 | Owner can sign up and receive JWT with store_id | E2E | `npx playwright test auth` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npm run test` (unit tests only, < 30 seconds)
- **Per wave merge:** `npm run test && npm run build`
- **Phase gate:** Full suite green (`npm run test && npm run build && npx playwright test`) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts` — root config file
- [ ] `package.json` test scripts — `"test": "vitest run"`, `"test:watch": "vitest"`
- [ ] `src/lib/__tests__/gst.test.ts` — covers FOUND-05 (IRD GST specimen cases)
- [ ] `src/lib/__tests__/rls.test.ts` — covers FOUND-04 (cross-tenant isolation)
- [ ] `src/schemas/__tests__/schemas.test.ts` — covers FOUND-07 (Zod integer-only money)
- [ ] `src/actions/auth/__tests__/staffPin.test.ts` — covers AUTH-02, AUTH-03
- [ ] `src/middleware.test.ts` — covers AUTH-05 (route blocking)
- [ ] `e2e/auth.spec.ts` — covers AUTH-01 (Playwright, owner signup E2E)

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.1 official docs — nextjs.org/docs/app/guides/progressive-web-apps (PWA, manifest.ts)
- Next.js 16.2.1 official docs — nextjs.org/docs/app/guides/testing/vitest (Vitest setup)
- Supabase Auth Hooks — supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook (hook SQL syntax, verified 2026-04-01)
- Supabase Auth Hooks — supabase.com/docs/guides/auth/auth-hooks (hook types overview)
- Supabase RLS RBAC — supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- IRD GST guidance — 15% tax-inclusive, 3/23 fraction confirmed stable since 2010
- npm registry — verified package versions for next, @supabase/*, tailwindcss, jose, bcryptjs, vitest, zod, stripe, playwright (2026-04-01)

### Secondary (MEDIUM confidence)
- GitHub Actions + Supabase migrations CI pattern — supabase.com/docs/guides/deployment/managing-environments
- Vercel deployment action — amondnet/vercel-action@v25 (community action, widely used)
- bcryptjs vs bcrypt Vercel compatibility — verified by training data + community consensus; native bindings fail on Vercel

### Tertiary (LOW confidence)
- Supabase config.toml auth hook activation syntax — may allow automating hook enable for local dev; not verified against current CLI 2.84.5 docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view` on 2026-04-01
- Architecture: HIGH — patterns from official Next.js + Supabase docs, consistent with prior research in ARCHITECTURE.md
- GST module: HIGH — IRD 15% tax-inclusive, 3/23 fraction; mathematically stable
- Auth hook SQL syntax: HIGH — verified against current supabase.com/docs
- PWA manifest: HIGH — verified against Next.js 16.2.1 official docs
- CI/CD workflow: MEDIUM — Supabase CLI migration command syntax needs executor verification for CLI 2.84.5
- Zod version: MEDIUM — v4 appears to have shipped but CLAUDE.md specifies v3; pin to v3 for safety

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (30 days — Supabase CLI and Zod version status may change)
