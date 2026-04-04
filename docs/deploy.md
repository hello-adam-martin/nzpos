# Production Deployment

Deploy NZPOS to production by following this guide top-to-bottom. Complete each section in order — later sections assume earlier sections are complete.

**Prerequisites:** You have completed local development setup (see [setup.md](setup.md)), the codebase is pushed to GitHub, and you have accounts at Supabase, Stripe, Vercel, and Resend.

---

## Section 1: Supabase Production Setup

### 1.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click your Organisation > **New Project**.
3. Name: `nzpos-production` (or similar).
4. Region: **Southeast Asia (Singapore) ap-southeast-1** — closest to NZ with consistently low latency. Alternatively use **ap-southeast-2** (Sydney) if available in your plan.
5. Database password: generate a strong password and save it — you will not see it again.
6. Click **Create new project** and wait 2-3 minutes for provisioning.
7. Note the **Project Reference ID** from the project URL: `https://supabase.com/dashboard/project/<project-ref>`.

### 1.2 Retrieve API Credentials

From the project dashboard, go to **Settings > API**:

| Setting | Env Var |
|---------|---------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> **Keep `SUPABASE_SERVICE_ROLE_KEY` private.** It bypasses Row Level Security. Never expose it to the browser.

### 1.3 Apply Migrations

Link your local project to the production Supabase instance and push all migrations:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase migration list  # verify all 23 migrations appear as applied
```

The project has 23 migrations that must all apply in order:

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Core tables: stores, products, orders, staff, categories |
| 002 | `002_rls_policies.sql` | Row Level Security policies for all tables |
| 003 | `003_auth_hook.sql` | Custom access token hook — injects `store_id` and `role` into JWT |
| 004 | `004_storage_bucket.sql` | Storage buckets: `product-images` |
| 005 | `005_pos_rpc.sql` | `complete_pos_sale` RPC for atomic POS transaction |
| 006 | `006_online_store.sql` | Online store tables: cart, checkout sessions, promo codes |
| 007 | `007_cash_sessions_fix.sql` | Cash session column fixes |
| 008 | `008_xero_integration.sql` | Xero tokens and sync tables |
| 009 | `009_security_fixes.sql` | Security hardening for RLS policies |
| 010 | `010_checkout_speed.sql` | Indexes for checkout performance |
| 011 | `011_notifications.sql` | Notification preferences and event log |
| 012 | `012_customer_accounts.sql` | Customer account tables |
| 013 | `013_partial_refunds.sql` | Refund tracking on order_items |
| 014 | `014_multi_tenant_schema.sql` | Multi-tenant schema foundation |
| 015 | `015_rls_policy_rewrite.sql` | Complete RLS rewrite with `store_id` scoping |
| 016 | `016_super_admin.sql` | Super admin role and cross-tenant access |
| 017 | `017_provision_store_rpc.sql` | `provision_store` RPC for merchant signup flow |
| 018 | `018_setup_wizard.sql` | Setup wizard tables and `store-logos` storage bucket |
| 019 | `019_billing_claims.sql` | `store_plans` table for per-add-on feature flags |
| 020 | `020_super_admin_panel.sql` | Super admin panel tables |
| 021 | `021_security_audit_fixes.sql` | SECURITY DEFINER RPC restrictions (service_role-only) |
| 022 | `022_drop_anon_orders_policy.sql` | Drops anon order read policy (IDOR fix) |
| 023 | `023_performance_indexes.sql` | Performance indexes for high-traffic queries |

> If `npx supabase db push` fails on a migration, check the error message. Most failures are environment-specific (e.g. extension not available). Do not skip migrations — they have dependencies.

### 1.4 Verify Storage Buckets

Go to **Storage > Buckets** in the Supabase dashboard. Confirm two buckets exist:

- `product-images` (created by migration 004)
- `store-logos` (created by migration 018)

If either is missing, check that the corresponding migration applied. You can also create them manually via **Storage > New Bucket** — set to public, match the bucket name exactly.

### 1.5 Configure Auth Settings

Go to **Authentication > URL Configuration**:

1. **Site URL:** `https://yourdomain.com` (your production domain — update after Vercel setup)
2. **Redirect URLs:** Add `https://*.yourdomain.com/**` — allows wildcard subdomain OAuth callbacks

Go to **Authentication > Hooks**:

3. **Custom Access Token hook:** Confirm the hook from migration 003 appears (it injects `store_id`, `role`, and `is_super_admin` into JWTs). If it does not appear, the JWT claims required by middleware will be missing and tenant routing will fail.

### 1.6 Create the Super Admin User

Production starts with no users. Create the initial super admin:

**Step 1 — Create the user:**

Go to **Authentication > Users > Add User**. Enter the email and a strong password. Copy the user's UUID from the list.

**Step 2 — Grant super admin access:**

Open **SQL Editor** and run:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb
WHERE email = 'your-super-admin@email.com';
```

> **Important:** The flag must be in `raw_app_meta_data`, not `user_metadata`. The auth hook reads `raw_app_meta_data` to inject the `is_super_admin` claim into JWTs. If you set it in `user_metadata` the super admin panel will be inaccessible.

**Step 3 — Verify:**

Sign in with the super admin credentials at `https://yourdomain.com/super-admin`. The panel should load without a redirect to login.

> Note: `supabase/seed.ts` is for local development only. Production starts with a clean database — no demo products or stores.

---

## Section 2: Stripe Live Key Configuration

### 2.1 Switch to Live Mode

In the Stripe dashboard, use the **Live/Test toggle** in the top-right corner to switch to Live Mode. All keys and webhooks created from this point must be in Live Mode.

### 2.2 Retrieve Live API Keys

Go to **Developers > API Keys**:

| Key | Env Var |
|-----|---------|
| `sk_live_...` (Secret key) | `STRIPE_SECRET_KEY` |
| `pk_live_...` (Publishable key) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |

> Do not use test keys (`sk_test_...`, `pk_test_...`) in production. Stripe charges only process on live keys.

### 2.3 Create Add-On Products and Price IDs

NZPOS uses per-add-on billing. Create three products in the Stripe dashboard:

Go to **Products > Add a product** for each:

| Add-On | Product Name | Billing | Env Var |
|--------|-------------|---------|---------|
| Xero integration | `Xero Integration Add-on` | Monthly recurring | `STRIPE_PRICE_XERO` |
| Email notifications | `Email Notifications Add-on` | Monthly recurring | `STRIPE_PRICE_EMAIL_NOTIFICATIONS` |
| Custom domain | `Custom Domain Add-on` | Monthly recurring | `STRIPE_PRICE_CUSTOM_DOMAIN` |

For each product, set a price and note the **Price ID** (`price_...`). Copy each price ID into your environment variables.

### 2.4 Register Webhook Endpoint 1 — Order Payments

Go to **Developers > Webhooks > Add endpoint**:

1. **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
2. **Events to send:** Select `checkout.session.completed`
3. Click **Add endpoint**.
4. Click the endpoint > **Signing secret** > **Reveal**. Copy the `whsec_...` value.
5. Set `STRIPE_WEBHOOK_SECRET` to this value.

### 2.5 Register Webhook Endpoint 2 — Billing Subscriptions

Go to **Developers > Webhooks > Add endpoint** (this is a **separate** endpoint):

1. **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe/billing`
2. **Events to send:** Select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Click **Add endpoint**.
4. Click the endpoint > **Signing secret** > **Reveal**. Copy the `whsec_...` value.
5. Set `STRIPE_BILLING_WEBHOOK_SECRET` to this value.

> **Critical:** These two endpoints have **different signing secrets**. `STRIPE_WEBHOOK_SECRET` and `STRIPE_BILLING_WEBHOOK_SECRET` must each hold the secret for their own endpoint. Swapping them causes `constructEvent()` to throw a 400 on every webhook request. You will have two separate entries in the Stripe webhook list.

### 2.6 Verify Webhooks After Deploy

After your Vercel deploy is live (Section 3), return here:

1. Go to **Developers > Webhooks** and click each endpoint.
2. Click **Send test webhook** > select the relevant event type > **Send test webhook**.
3. Check Vercel **Functions** logs (Project > Functions > select the route) — the test event should produce a 200 response.

---

## Section 3: Vercel Production Deploy with Wildcard DNS

### 3.1 Import the Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New > Project**.
3. Import your GitHub repository.
4. Vercel detects Next.js automatically — no framework configuration needed.
5. Do **not** deploy yet — configure environment variables first (Step 3.4).

### 3.2 Add Your Custom Domain

1. Go to **Project > Settings > Domains**.
2. Enter your root domain: `yourdomain.com` (e.g. `nzpos.co.nz`).
3. Vercel displays NS (nameserver) records like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

### 3.3 Delegate Nameservers at Your Registrar

> **Critical — NS delegation required for wildcard SSL.** Vercel requires full nameserver delegation to provision a wildcard SSL certificate for `*.yourdomain.com`. A `CNAME` record for `*.yourdomain.com` will NOT work — Vercel cannot issue a wildcard SSL certificate over CNAME delegation. You must point your domain's nameservers to Vercel.

At your domain registrar (e.g. Namecheap, GoDaddy, iwantmyname):

1. Find **Nameservers** or **DNS** settings for your domain.
2. Change nameservers to Vercel's NS records:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
   (Remove any existing nameservers.)
3. Save changes.

**DNS propagation takes 24-48 hours.** Verify propagation:

```bash
dig NS yourdomain.com
# Should return ns1.vercel-dns.com and ns2.vercel-dns.com
```

Once propagated, Vercel automatically provisions a wildcard SSL certificate for `*.yourdomain.com`. Verify at `https://test.yourdomain.com` — the certificate Common Name should show `*.yourdomain.com`.

### 3.4 Configure Environment Variables

Go to **Project > Settings > Environment Variables**. Add all 24 variables from `.env.example`. Pay particular attention to production-specific values:

| Variable | Production Value |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your production Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your production service role key |
| `ROOT_DOMAIN` | `yourdomain.com` — **do not leave as `lvh.me:3000`** |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `yourdomain.com` — **do not leave as `lvh.me:3000`** |
| `NEXT_PUBLIC_BASE_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |
| `XERO_REDIRECT_URI` | `https://yourdomain.com/api/xero/callback` |
| `STRIPE_SECRET_KEY` | Live key: `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live key: `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From Section 2.4 |
| `STRIPE_BILLING_WEBHOOK_SECRET` | From Section 2.5 |
| `STRIPE_PRICE_XERO` | `price_...` from Section 2.3 |
| `STRIPE_PRICE_EMAIL_NOTIFICATIONS` | `price_...` from Section 2.3 |
| `STRIPE_PRICE_CUSTOM_DOMAIN` | `price_...` from Section 2.3 |
| `RESEND_API_KEY` | From Section 3.6 below |
| `RESEND_FROM_ADDRESS` | Verified sender address |
| `CRON_SECRET` | Run: `openssl rand -base64 32` |
| `STAFF_JWT_SECRET` | Run: `openssl rand -base64 32` |
| `FOUNDER_EMAIL` | Founder notification email |

> For full descriptions of every variable, see [env-vars.md](env-vars.md).

> **`ROOT_DOMAIN` and `NEXT_PUBLIC_ROOT_DOMAIN`** drive subdomain routing in middleware. If left as `lvh.me:3000`, every merchant subdomain will fail to resolve in production. Set both to `yourdomain.com` (no `https://` prefix, no port).

### 3.5 Deploy

1. Click **Deploy** (or push a commit to your main branch — Vercel deploys automatically).
2. Watch the build log — if the build fails, check for missing environment variables.
3. After a successful build, Vercel assigns a `*.vercel.app` preview URL.

### 3.6 Set Up Resend for Email

NZPOS sends transactional emails via [Resend](https://resend.com) — order confirmations, daily summaries, and founder notifications.

1. Create a Resend account at [resend.com](https://resend.com).
2. Go to **Domains > Add Domain**. Enter your domain (e.g. `yourdomain.com`).
3. Add the DNS TXT and MX records Resend provides to your Vercel DNS configuration (Vercel > Project > Settings > Domains > your domain > DNS Records).
4. Wait for Resend to verify domain ownership (usually 5-15 minutes).
5. Go to **API Keys > Create API Key**. Copy the key.
6. Set `RESEND_API_KEY` in Vercel environment variables.
7. Set `RESEND_FROM_ADDRESS` to a verified address on your domain (e.g. `noreply@yourdomain.com`).
8. Redeploy if you added these after the initial deploy: **Project > Deployments > Redeploy**.

### 3.7 Verify Middleware and Routing

After deploy, confirm tenant routing is working:

1. Visit `https://yourdomain.com` — the marketing landing page should load.
2. Visit `https://yourdomain.com/super-admin` — should redirect to login, not 404.
3. Sign up as a new merchant — the subdomain `https://merchantslug.yourdomain.com` should resolve.
4. Visit `https://merchantslug.yourdomain.com/admin` — open browser DevTools > Network > any request. Look for the `x-store-id` response header to confirm tenant context injection.

### 3.8 Verify Cron Jobs

The following cron jobs are pre-configured in `vercel.json`:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/xero-sync` | `0 13 * * *` (1:00 PM UTC daily) | Sync transactions to Xero |
| `/api/cron/expire-orders` | `0 14 * * *` (2:00 PM UTC daily) | Expire abandoned checkout sessions |
| `/api/cron/daily-summary` | `0 19 * * *` (7:00 PM UTC daily) | Send daily summary email to founder |

Verify `CRON_SECRET` is set. Cron routes validate this header — requests without a valid `CRON_SECRET` return 401.

To test a cron job manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/xero-sync
# Expected: 200 OK (or a structured error if Xero is not connected yet)
```

### 3.9 CSP Note

The Content Security Policy in `src/middleware.ts` is currently set as `Content-Security-Policy-Report-Only`. This means violations are reported to the browser console but not blocked.

After go-live, monitor the browser console for CSP violations for 1-2 weeks. When no new violations appear, switch the header name in `middleware.ts` to `Content-Security-Policy` (enforcing). This is a deliberate post-deploy task — do not switch to enforcing as part of the initial deploy.

---

## Section 4: Post-Deploy Smoke Test

Walk through these checks after every production deploy. Tick each box as you go.

- [ ] **Merchant signup:** Visit `https://yourdomain.com` > click **Sign up** > enter email and password > check email for confirmation > click confirmation link > confirm you land on the store setup wizard at `https://newstoreslug.yourdomain.com/admin/setup` > complete the wizard > the admin dashboard loads successfully.

- [ ] **Product creation:** In the admin dashboard > go to **Products > New Product** > enter name (e.g. "Test Product"), price ($23.00), and stock quantity (10) > save > confirm the product appears in the products list and is visible on the storefront at `https://newstoreslug.yourdomain.com`.

- [ ] **POS sale:** Visit `https://newstoreslug.yourdomain.com/pos` > log in with a staff PIN > add the test product to the cart > select **Cash** payment > complete the sale > confirm a receipt is displayed and the product's stock count decrements by 1 in the admin dashboard.

- [ ] **Online order + Stripe payment:** Visit the storefront at `https://newstoreslug.yourdomain.com` > add the test product to cart > proceed to checkout > complete payment with a real card (small amount) > confirm the order appears in **Admin > Orders** with status **Paid** > confirm stock decrements.

- [ ] **Xero sync:** In the admin dashboard > go to **Integrations > Xero** > connect your Xero organisation > trigger a manual sync. Alternatively, test the cron endpoint directly:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/xero-sync
  ```
  Expected: 200 OK with no error body.

- [ ] **Email notification:** After completing the online order in step 4, check the customer email address for an order confirmation email. The email should include the store name, itemised receipt, and GST amount.
