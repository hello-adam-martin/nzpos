# Environment Variables

All environment variables used by NZPOS. Copy `.env.example` to `.env.local` and fill in values.

```bash
cp .env.example .env.local
```

---

## Supabase

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key for client-side queries | Supabase dashboard → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side admin operations | Supabase dashboard → Settings → API | Yes |

For local development, run `npx supabase start` — the output prints all three values.

Default local values:
- `NEXT_PUBLIC_SUPABASE_URL` → `http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → printed by `supabase start`
- `SUPABASE_SERVICE_ROLE_KEY` → printed by `supabase start`

---

## Store Identity

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `STORE_ID` | Legacy single-store UUID (server-side) | After first store provisioned via seed script | Yes (legacy) |
| `NEXT_PUBLIC_STORE_ID` | Public store UUID for client components | Same value as `STORE_ID` | Yes (legacy) |

> These are legacy variables from v1 single-tenant architecture. The seed script creates a deterministic store ID (`00000000-0000-4000-a000-000000000001`) for local development. Multi-tenant routing now resolves store context from the subdomain via middleware.

---

## Application URLs

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `NEXT_PUBLIC_BASE_URL` | App base URL for absolute links in emails and redirects | `http://localhost:3000` (local) or production domain | Yes |
| `NEXT_PUBLIC_SITE_URL` | Marketing site URL for public links | Same as base URL for single-domain deploy | Yes |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain for client-side subdomain routing | `lvh.me:3000` (local) or `nzpos.co.nz` (prod) | Yes |

---

## Multi-Tenant Routing

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `ROOT_DOMAIN` | Root domain for server-side middleware subdomain detection | Same value as `NEXT_PUBLIC_ROOT_DOMAIN` — without the `NEXT_PUBLIC_` prefix | Yes |

> Both `ROOT_DOMAIN` and `NEXT_PUBLIC_ROOT_DOMAIN` must be set to the same value. `ROOT_DOMAIN` is used in middleware (server-only); `NEXT_PUBLIC_ROOT_DOMAIN` is used in client components.
>
> Local: `lvh.me:3000` — `lvh.me` is a public wildcard DNS that resolves all subdomains to `127.0.0.1`. Do **not** use `localhost` — middleware needs a subdomain to resolve the tenant.

---

## Staff Authentication

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `STAFF_JWT_SECRET` | HS256 secret for signing and verifying staff PIN session JWTs | Generate with: `openssl rand -base64 32` | Yes |

> Staff PIN sessions are independent from Supabase Auth (owner sessions). They use short-lived JWTs signed with this secret, stored in HttpOnly cookies. 8-hour sessions. Must be at least 32 bytes of entropy.

---

## Stripe Payments

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API key for creating checkout sessions, refunds | Stripe dashboard → Developers → API keys | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe key for Stripe.js | Stripe dashboard → Developers → API keys | Yes |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for verifying order webhook payloads | `stripe listen` output or Stripe dashboard → Webhooks | Yes |

> For local development, use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
> The CLI prints the webhook signing secret (`whsec_...`) on startup.

---

## Stripe Billing

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `STRIPE_BILLING_WEBHOOK_SECRET` | Signing secret for subscription lifecycle webhooks | Separate webhook endpoint in Stripe dashboard | Yes |
| `STRIPE_PRICE_XERO` | Stripe Price ID for the Xero accounting add-on | Stripe dashboard → Products | Yes |
| `STRIPE_PRICE_CUSTOM_DOMAIN` | Stripe Price ID for the custom domain add-on | Stripe dashboard → Products | Yes |

> Billing webhooks use a **separate** webhook endpoint (`/api/webhooks/stripe/billing`) with its own signing secret. Both secrets must be set — they are different values.
>
> For local billing webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe/billing`

---

## Email

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `RESEND_API_KEY` | Resend API key for sending transactional emails | resend.com → API Keys | Yes |
| `RESEND_FROM_ADDRESS` | Sender address for all outbound emails | Must be a verified domain in your Resend account | Yes |

> Transactional emails include: order confirmation, pickup-ready notification, daily summary, new order alert. In local development, Resend will actually send emails — use a test API key or a personal email as `RESEND_FROM_ADDRESS`.

---

## Xero Integration

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `XERO_CLIENT_ID` | OAuth 2.0 client ID for Xero API | Xero developer portal → My Apps | Yes (for Xero add-on) |
| `XERO_CLIENT_SECRET` | OAuth 2.0 client secret for Xero API | Xero developer portal → My Apps | Yes (for Xero add-on) |
| `XERO_REDIRECT_URI` | OAuth callback URL — must match Xero app config exactly | `http://localhost:3000/api/xero/callback` (local) | Yes (for Xero add-on) |

> Only required if testing the Xero integration. Set up a Xero developer app at [developer.xero.com](https://developer.xero.com). The redirect URI in Xero must match this value exactly (including protocol and port).

---

## System

| Variable | Purpose | Source | Required |
|----------|---------|--------|----------|
| `CRON_SECRET` | Bearer token for authenticating scheduled cron job routes | Generate with: `openssl rand -base64 32` | Yes |
| `FOUNDER_EMAIL` | Email address for system alert notifications | Owner's email address | Yes |

> `CRON_SECRET` is sent as `Authorization: Bearer <secret>` by Vercel Cron Jobs (or equivalent scheduler). Any request to `/api/cron/*` without this token is rejected with 401.

---

## Summary

**Total: 24 variables** across 9 functional groups.

This list reflects the state as of Phase 19. To find any new environment variable references added since then:

```bash
grep -roh 'process\.env\.[A-Z_]*' src/ | sort -u
```
