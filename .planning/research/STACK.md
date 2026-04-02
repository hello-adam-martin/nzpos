# Technology Stack

**Project:** NZPOS — NZ Retail POS System
**Researched:** 2026-04-01 (v1.0 core stack) + 2026-04-03 (v2.0 SaaS additions)
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

**Tailwind v4 breaking change:** The configuration model changed significantly. v4 uses CSS-first config (`@theme` in globals.css) instead of `tailwind.config.js`. If scaffolding from a v3 tutorial, do not follow the old config pattern. Install: `npm install tailwindcss @tailwindcss/postcss postcss`.

**What NOT to use:** Do not use Tailwind v3. Do not use CSS Modules or styled-components — Tailwind utility classes are the established pattern for this stack.

---

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | **^3.x** | Schema validation on Server Actions and API inputs | The Next.js official auth documentation explicitly recommends Zod for Server Action validation (confirmed in official docs 2026-03-25). Zod 3.x is the current stable series. Every Server Action must validate inputs with `z.safeParse()` before touching the database. |

**Zod v4 status (MEDIUM confidence):** Zod v4 is in active development as of mid-2025 but had not shipped stable. Default to `^3.x` which is stable and battle-tested. Upgrade when v4 ships stable.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth (via @supabase/ssr) | included with Supabase | Owner email/password auth | Supabase Auth is listed explicitly in the Next.js official auth library recommendations (confirmed 2026-03-25). Handles JWT issuance, refresh tokens, and cookie management via `@supabase/ssr`. |
| jose | **^5.x** | JWT verification for custom staff PIN sessions | Next.js official docs use `jose` for stateless session encryption (JWT signing with HS256). Staff PIN login is a custom session separate from Supabase Auth — use jose to sign/verify short-lived PIN sessions stored in HttpOnly cookies. Compatible with Edge Runtime. |

**Two auth flows:** (1) Owner auth via Supabase Auth email/password — use `@supabase/ssr` with `createServerClient` in Server Components and middleware. (2) Staff PIN auth — custom stateless JWT via `jose`, cookie-based, role stored in token payload for RLS claims.

**What NOT to use:** Do not use NextAuth.js (now Auth.js). It adds complexity for a system already using Supabase Auth. Do not use Clerk — paid product, unnecessary dependency. Do not store sessions in the database for staff PINs — stateless JWTs are simpler and self-healing.

---

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | **latest (^2.x or ^3.x)** | Unit tests for utilities, GST calculations, state machines | Official Next.js docs (2026-03-25) recommend Vitest + React Testing Library for unit testing. Critical for GST rounding logic — per-line calculations must be deterministic. Does not support async Server Components directly; use for pure functions. |
| @testing-library/react | **^16.x** | Component testing for Client Components | Pairs with Vitest for rendering Client Component tests (POS cart, PIN pad, etc). |
| Playwright | **latest** | E2E tests for checkout flows, auth flows | Official Next.js docs (2026-03-25) recommend Playwright for E2E. Critical paths to test: online Stripe checkout, POS sale completion with EFTPOS confirmation, stock decrement after transaction. |

**Testing priority for this project:** GST calculation functions must have comprehensive Vitest unit tests before any UI ships. The per-line rounding rules are IRD-compliance requirements, not best-effort.

---

### Deployment & Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Free tier → Pro for wildcard domains | Next.js hosting | Verified adapter — full Next.js feature support including Server Actions, middleware, image optimisation. Wildcard subdomain support requires pointing nameservers to Vercel. Pro plan needed for commercial SaaS at scale but free tier works for early v2.0. |
| Supabase | Free tier → Pro | Managed Postgres + Auth + Storage | Co-located data and auth. Free tier starts v2.0; upgrade to Pro ($25/mo) when merchant count grows or as Stripe billing revenue allows. |
| Supabase Storage | included | Product images | Use Supabase Storage buckets for product images. Serves directly via CDN URL. Integrate with `next/image` `remotePatterns` config pointing to `*.supabase.co`. |

**What NOT to use for deployment:** Do not self-host Next.js on a VPS for v1 — Vercel free tier eliminates ops overhead entirely for a solo developer. Do not use AWS S3 for images when Supabase Storage is already in the stack. Do not use Cloudflare or Netlify as deployment target — they are not verified Next.js adapters (as of 2026-03-25), feature support varies.

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
| Realtime | Supabase Realtime (for inventory) | The Eng review explicitly chose refresh-on-transaction over WebSocket for inventory sync. Realtime adds WebSocket failure modes for no benefit in a single-operator POS. |
| Database | Raw pg / Drizzle / Kysely | Supabase JS client handles all query needs. Adding a second query layer creates type conflicts with Supabase's generated types. Exception: Drizzle is reasonable if Supabase client limitations become blocking — flag this for later. |
| Payments | Stripe Terminal SDK (v1) | Hardware EFTPOS integration explicitly deferred to v1.1. Terminal SDK is complex, requires device provisioning. |
| Payments | Stripe Custom Elements (storefront) | Stripe Checkout hosted page is adequate, simpler, and PCI-compliant with zero frontend card handling code. |
| Testing | Jest | Vitest is the recommended alternative — faster, native ESM, better TypeScript support, compatible with Vite tooling ecosystem. Jest requires significant config to work with Next.js App Router. |
| Deployment | Self-hosted VPS (v1) | Unnecessary ops burden for solo developer. Vercel free tier covers v1 needs completely. |
| Image storage | Cloudinary, Imgix | Third-party image CDNs add cost and another vendor dependency. Supabase Storage + `next/image` handles this natively. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 App Router | Remix | Remix is strong but smaller ecosystem, less AI training data, team has already committed to Next.js. |
| Framework | Next.js 16 App Router | SvelteKit | Different language paradigm, not the committed stack. |
| BaaS | Supabase | Firebase | Firebase is NoSQL — poor fit for relational retail data (products, orders, inventory). Supabase Postgres is the right model. |
| BaaS | Supabase | PlanetScale | PlanetScale dropped free tier in 2024. Supabase has free tier + auth + storage in one. |
| Payments | Stripe | PayHere, Windcave | NZ-specific processors. Stripe NZ is fully operational, supports NZD, and has far better documentation and developer tooling. Windcave is the eventual EFTPOS integration target (v1.1) but Stripe handles the online storefront. |
| Styling | Tailwind CSS v4 | shadcn/ui | shadcn/ui is a component library built on Radix UI + Tailwind. It is a strong addition but an extra dependency. Evaluate after design system components are built in Phase 1 — adopt shadcn patterns if component scope grows. |
| Validation | Zod | Yup, Valibot | Zod is the de facto standard in Next.js + TypeScript ecosystem. Next.js official docs use Zod in all examples. Yup is older. Valibot is newer and faster but has smaller ecosystem. |
| Testing | Playwright | Cypress | Playwright is the Next.js official recommendation. Playwright is faster, supports multiple browsers, and has better async handling. |

---

## v2.0 SaaS Additions

This section covers the NEW libraries and patterns required for the v2.0 SaaS milestone. The core stack above is unchanged.

---

### Multi-Tenant Subdomain Routing

**What's needed:** Wildcard subdomain routing so each merchant gets `merchant-slug.nzpos.app`. No new library required — this is pure Next.js middleware + Vercel DNS configuration.

**Implementation pattern (HIGH confidence — verified against official Next.js multi-tenant guide and Vercel docs):**

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]

  // app.nzpos.app → main app (skip)
  // merchant-slug.nzpos.app → rewrite to /[slug] route group
  if (subdomain !== 'app' && subdomain !== 'www') {
    const url = request.nextUrl.clone()
    url.pathname = `/store/${subdomain}${url.pathname}`
    return NextResponse.rewrite(url)
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

Key points:
- Middleware runs on Edge Runtime — no database queries allowed. Resolve tenants in the Server Component or page, not the middleware.
- Middleware rewrites the URL path; the hostname is preserved in request headers for the Server Component to read.
- For local development, use `merchant.localhost:3000` with a `hosts` file entry, or read a `?tenant=` query param in dev mode.
- Wildcard SSL on Vercel requires pointing nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com` (not A records).

**Vercel DNS requirement (HIGH confidence — from official Vercel multi-tenant docs):** The domain must use Vercel nameservers for wildcard SSL to work. A records do NOT support wildcard certificate issuance. This is a day-1 infrastructure decision — the nzpos.app domain needs to delegate to Vercel nameservers before any tenants can be provisioned.

---

### Custom Domains for Merchants (Paid Add-on)

**What's needed:** Merchants on a paid plan can bring their own domain (e.g. `shop.theirstore.co.nz`). This requires programmatic domain provisioning via the Vercel SDK.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @vercel/sdk | **^1.x** (latest ~1.19.x as of Apr 2026) | Programmatic Vercel domain management | Official TypeScript SDK for the Vercel REST API. Exposes `projectsAddProjectDomain`, `projectsVerifyProjectDomain`, `projectsRemoveProjectDomain`. Automatically handles SSL certificate issuance. |

**What this does:** When a merchant activates custom domain, a Server Action calls the Vercel API to add their domain to the project, then polls for verification status. DNS propagation takes 24-48h. This requires a `VERCEL_TOKEN` and `VERCEL_TEAM_ID` as environment variables.

**Important constraints (HIGH confidence — verified from Vercel SDK docs):**
- The `@vercel/sdk` package requires a Vercel API token (bearer token). Store as `VERCEL_TOKEN` in env. Never expose client-side.
- Domain verification: if the domain is already registered elsewhere on Vercel, the merchant must add a TXT record. Build a verification status polling UI.
- Wildcard domains (e.g. `*.merchant.co.nz`) are NOT supported for custom merchant domains — apex + www is the pattern.
- Free tier Vercel project has unlimited custom domains programmatically — no plan gating on domains specifically.

```typescript
import { VercelCore } from '@vercel/sdk/core.js'
import { projectsAddProjectDomain } from '@vercel/sdk/funcs/projectsAddProjectDomain.js'

const vercel = new VercelCore({ bearerToken: process.env.VERCEL_TOKEN })

await projectsAddProjectDomain(vercel, {
  idOrName: process.env.VERCEL_PROJECT_ID,
  teamId: process.env.VERCEL_TEAM_ID,
  requestBody: { name: merchantCustomDomain },
})
```

**Middleware must resolve custom domains too:** The middleware needs a second lookup branch — if the hostname doesn't match `*.nzpos.app`, look up `custom_domains` table by hostname to find the store slug, then rewrite. Since middleware can't do DB queries, store a pre-resolved mapping in an edge-compatible cache or accept the slight latency of a lightweight Supabase REST query via fetch (not the JS client — fetch works in Edge).

---

### Stripe Subscriptions and Billing

**What's needed:** Merchants can activate paid add-ons (Xero, email notifications, custom domains) via Stripe subscriptions. Each add-on is a separate Stripe Product with a monthly Price.

**No new packages required** — the existing `stripe ^17.x` handles subscriptions. What's new is the data model and webhook events.

**Database columns to add to `stores` table:**

```sql
stripe_customer_id     TEXT UNIQUE,
subscription_status    TEXT,   -- active | trialing | past_due | canceled | incomplete
subscription_id        TEXT,
subscription_period_end TIMESTAMPTZ,
active_add_ons         TEXT[]  -- ['xero', 'email_notifications', 'custom_domain']
```

**Webhook events to handle (HIGH confidence — verified from Stripe docs and 2026 implementation guide):**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Link Stripe customer to store, activate add-on |
| `invoice.paid` | Extend subscription period, keep add-on active |
| `invoice.payment_failed` | Mark `past_due`, send warning email, keep access for grace period |
| `customer.subscription.updated` | Sync status + active add-ons |
| `customer.subscription.deleted` | Revoke add-on access, update status to `canceled` |

**Stripe Customer Portal (HIGH confidence — verified from Stripe docs):** Use the hosted Stripe Billing Portal for self-serve subscription management (upgrade, cancel, update payment method). A Server Action creates a portal session and redirects the merchant. This eliminates the need to build a custom billing UI.

```typescript
// Server Action
'use server'
import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

export async function openBillingPortal(stripeCustomerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
  })
  redirect(session.url)
}
```

**Multiple add-ons pattern:** Use one Stripe Subscription per merchant with multiple items (one per active add-on), or separate subscriptions per add-on. Recommendation: one subscription, multiple items. Generates a single invoice per billing cycle. Limit of 20 items per subscription is well above the 3 planned add-ons.

**What NOT to add:** Do not add a feature flag service (PostHog, LaunchDarkly, Statsig). Feature gating based on subscription tier is simple enough to implement with a database column check. Feature flag services add cost and complexity for what is essentially `store.active_add_ons.includes('xero')`.

---

### Feature Gating

**What's needed:** Server-side checks that block access to paid features if the merchant's subscription doesn't include them. No new library — implement as utility functions.

**Pattern:**

```typescript
// lib/feature-gate.ts
import { createClient } from '@/lib/supabase/server'

export async function requireAddOn(
  storeId: string,
  addOn: 'xero' | 'email_notifications' | 'custom_domain'
): Promise<void> {
  const supabase = createClient()
  const { data } = await supabase
    .from('stores')
    .select('active_add_ons, subscription_status')
    .eq('id', storeId)
    .single()

  const hasAccess =
    data?.subscription_status === 'active' &&
    data?.active_add_ons?.includes(addOn)

  if (!hasAccess) {
    redirect('/admin/billing?upgrade=true')
  }
}
```

Call `requireAddOn()` at the top of Server Components or Server Actions for gated features.

**JWT claims for feature gating (MEDIUM confidence):** The existing Supabase Custom Access Token Hook pattern (already used for `store_id` and `role`) can be extended to include `active_add_ons` in the JWT. This avoids a database query on every gated page load. Downside: JWT staleness (up to JWT TTL, typically 1h) means a cancelled subscription retains access briefly. For add-ons (not security-critical), this is acceptable. For the first pass, use the database check pattern above — it's simpler and correct. Migrate to JWT claims if performance becomes an issue.

---

### Super Admin Panel

**What's needed:** A route group accessible only to platform administrators (the founder), not merchants. This is a role check, not a new library.

**Pattern:** Add a `platform_role` column (or enum) to `auth.users` via `app_metadata`. Check in middleware or layout for the `/superadmin` route group.

```typescript
// app/(superadmin)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isPlatformAdmin =
    user?.app_metadata?.platform_role === 'super_admin'

  if (!isPlatformAdmin) redirect('/')

  return <>{children}</>
}
```

Set `platform_role: 'super_admin'` in `app_metadata` for the founder's Supabase user via the Supabase dashboard (or a migration). No new library needed.

**What NOT to build:** Do not add a separate admin auth system. Supabase Auth already handles this — the founder logs in with email/password like any other owner, but their `app_metadata.platform_role` grants elevated access.

---

### Store Setup Wizard

**What's needed:** A multi-step onboarding flow for new merchants. No new library required — React state manages wizard step, Server Actions persist each step.

**Only add this if the native React approach becomes unwieldy:** Consider `react-hook-form ^7.x` (already in the stack) for the wizard steps that have complex validation. For the store logo upload step, the existing Supabase Storage + `next/image` pattern handles image uploads.

---

### Marketing Landing Page

**What's needed:** A public marketing site at `nzpos.app` (or the apex domain). No new library required — Next.js App Router with static rendering is the correct approach.

**Route structure:** The marketing pages live at the apex domain (`nzpos.app`), separate from the app subdomain (`app.nzpos.app`) and merchant subdomains (`merchant.nzpos.app`). Middleware routes the apex domain to the marketing route group.

**SEO (no new libraries needed):** Next.js App Router has built-in `generateMetadata`, `sitemap.ts`, `robots.ts`, and `opengraph-image.tsx` support. Use these — no need for a headless CMS or additional SEO library.

```typescript
// app/(marketing)/layout.tsx
export const metadata = {
  title: 'NZPOS — POS + Online Store for NZ Small Business',
  description: '...',
}
```

**What NOT to add:** Do not add a headless CMS (Contentful, Sanity, Prismic). The marketing page content is static and founder-controlled. A CMS adds a new vendor, cost, and complexity. Edit the marketing page directly in code.

---

## Updated Installation (v2.0 SaaS additions only)

```bash
# Vercel SDK (for custom domain provisioning)
npm install @vercel/sdk
```

That's the only new package. Everything else — subdomain routing, feature gating, Stripe subscriptions, super admin, marketing page — uses existing libraries.

---

## Key Configuration Notes

### Tailwind v4 with Next.js
```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-navy: #1E293B;
  --color-amber: #E67E22;
  /* Satoshi + DM Sans font variables here */
}
```

```js
// postcss.config.mjs
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### next.config.ts — image domains for Supabase Storage
```ts
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
```

### Supabase RLS Custom JWT Claims Pattern
Set `store_id` and `role` in `raw_app_meta_data` via a Supabase auth hook. Reference in RLS as:
```sql
auth.jwt()->'app_metadata'->>'store_id' = store_id::text
```
This fires from the JWT, not a table join.

### Vercel Wildcard Domain DNS Setup
For `*.nzpos.app` subdomain routing:
1. Point nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
2. Add apex domain `nzpos.app` to Vercel project
3. Add wildcard domain `*.nzpos.app` to Vercel project
4. Vercel issues individual SSL certificates per subdomain automatically

For custom merchant domains (paid add-on):
- Use `@vercel/sdk` `projectsAddProjectDomain` to provision programmatically
- Merchant must add CNAME record pointing to `cname.vercel-dns.com`
- Poll `projectsGetProjectDomain` for verification status

---

## Sources

- Next.js 16.2.1 official documentation, version confirmed 2026-03-25: https://nextjs.org/docs
- Next.js multi-tenant guide (official, 2026-03-31): https://nextjs.org/docs/app/guides/multi-tenant
- Vercel multi-tenant domain management docs: https://vercel.com/docs/multi-tenant/domain-management
- Vercel Platforms Starter Kit: https://vercel.com/templates/next.js/platforms-starter-kit
- @vercel/sdk npm package (~1.19.x as of Apr 2026): https://www.npmjs.com/package/@vercel/sdk
- Stripe subscription lifecycle guide (2026): https://dev.to/thekarlesi/stripe-subscription-lifecycle-in-nextjs-the-complete-developer-guide-2026-4l9d
- Stripe billing portal integration: https://docs.stripe.com/customer-management/integrate-customer-portal
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Supabase Custom Access Token Hook: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Supabase custom claims and RBAC: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Tailwind CSS v4.1/v4.2 blog: https://tailwindcss.com/blog
- Next.js authentication guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/authentication
- Next.js Vitest guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/testing/vitest
- Next.js Playwright guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/testing/playwright
- Next.js deployment guide (official, 2026-03-25): https://nextjs.org/docs/app/getting-started/deploying
- Next.js `use cache` directive (official, 2026-03-25): https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js blog — v16.2 release: https://nextjs.org/blog (confirmed version 16.2, released 2026-03-18)
