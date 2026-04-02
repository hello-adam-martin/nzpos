# Feature Landscape

**Domain:** NZ retail POS system — SaaS Platform transformation (v2.0)
**Researched:** 2026-04-03
**Confidence:** MEDIUM–HIGH overall (live web research conducted; specifics on NZ POS competitors from training data)

---

## Scope Note

This document covers the **v2.0 SaaS platform layer** added on top of the existing v1.1 single-tenant POS. The v1 features (POS checkout, storefront, admin, Xero, refunds, etc.) are shipped and not re-researched here. All items below are new for v2.

The research question: what are table stakes vs differentiators for multi-tenant onboarding, feature gating/billing, subdomain storefronts, store setup wizards, super admin panels, and marketing landing pages in SaaS POS/retail platforms?

---

## Table Stakes

Features users expect from any modern SaaS platform. Missing these = product feels unfinished, untrustworthy, or dangerous to sign up for.

### Multi-Tenant Onboarding

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Self-serve signup (email + password) | Every SaaS requires this. No manual provisioning. | LOW | Supabase Auth covers this. store_id provisioning is the new work. |
| Automatic store creation on signup | Merchant must have a working environment immediately. "Apply and wait" is a 2010 pattern. | MEDIUM | Create store record, seed default config, generate subdomain slug. One transaction. |
| Email verification before access | Security table stakes. Prevents fake accounts and spam tenants. | LOW | Supabase Auth handles verification flow. Block access until confirmed. |
| Unique subdomain per store | `[store-slug].nzpos.app` is expected. It's how merchants share their storefront link. | MEDIUM | Wildcard DNS + Next.js middleware tenant resolution. Vercel requires nameserver delegation for wildcard SSL. |
| Tenant data isolation | Each merchant's data must be invisible to others. A breach here is catastrophic. | LOW | Already built via `store_id` + RLS. New work: RLS for any new v2 tables, admin bypass pattern. |
| Graceful "store not found" handling | Wrong subdomain, deleted store — must show a clean error, not a 500. | LOW | Middleware check before rendering any tenant page. |

### Feature Gating / Billing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Free core tier that actually works | Freemium SaaS (Square model) must deliver real value on free. Hobbled free tiers kill conversion. POS + storefront + admin must work free. | LOW | Already exists; gating is additive enforcement. |
| Clear upgrade prompts at gate | Users hitting a locked feature need to see pricing and a buy button. Opacity kills conversions. | MEDIUM | Inline CTA or modal when gated feature is touched. Link to Stripe Checkout session. |
| Stripe subscription checkout | Standard for SaaS billing. Users expect card-on-file subscriptions. | MEDIUM | Stripe Checkout session per product/price. Webhook on `checkout.session.completed`. |
| Stripe Customer Portal link | Merchants must be able to cancel, update payment method, view invoices without contacting support. | LOW | Stripe's hosted portal — one API call to create session, one link in admin. |
| Subscription status sync via webhooks | Stripe → your DB must stay in sync. Revoked access when subscription lapses. | MEDIUM | Handle: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. |
| Graceful access revocation on lapse | If subscription lapses, the feature gate must activate cleanly — not error, not silently break. | MEDIUM | Check subscription status server-side before rendering/executing gated actions. Show "renew" prompt. |

### Store Setup Wizard

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Progress indicator | Multi-step wizards without progress bars see 30–50% higher drop-off. Users need to know how many steps remain. | LOW | Step counter or visual stepper. 3–5 steps max. |
| Store name + slug selection | Merchant needs to name their store and confirm their subdomain URL immediately. | LOW | Slug auto-derived from name with manual override. Uniqueness check. |
| Logo upload | Storefront without branding looks unfinished. First thing any merchant does. | LOW | Supabase Storage upload. Already have image infrastructure. |
| Skip option on every step | Forcing completion causes abandonment. Time-to-value trumps completeness. | LOW | All steps skippable. "Complete your store" checklist persists in admin. |
| Post-wizard redirect to admin | After setup, merchant lands in their admin dashboard — not a "thanks!" page with nothing to do. | LOW | Standard redirect. Dashboard shows setup checklist with remaining items. |

### Super Admin Panel

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| List all tenants (paginated) | Operators must be able to see who has signed up. | LOW | Query stores table with pagination. |
| View tenant details (plan, created, last active) | Support and billing need this for every support ticket. | LOW | Join stores + subscriptions. |
| Suspend / delete a tenant | GDPR/Privacy Act compliance, abuse handling, churned account cleanup. | MEDIUM | Soft-delete pattern. Revoke access without destroying data for 30-day recovery window. |
| Search tenants by email or store name | List view without search is unusable past 50 tenants. | LOW | Postgres full-text or ILIKE on stores + auth.users. |
| Super admin route protection | Admin panel must be completely inaccessible to regular merchants. | MEDIUM | Separate auth check for `is_super_admin` claim. Cannot rely on store_id RLS alone. |

### Marketing Landing Page

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hero section with value proposition | 3–5 seconds to communicate the product. No hero = no conversions. | LOW | "Free NZ retail POS + online store. Start in minutes." Story-driven, not feature-listed. |
| Signup CTA above fold | Organic visitors must be able to start immediately without scrolling. | LOW | Single email field or "Start free" button linking to `/signup`. |
| Pricing section | SaaS without visible pricing is a red flag. Merchants want to know what's free vs paid before investing time. | LOW | Free tier clearly listed. Paid add-ons with prices. |
| Mobile-optimized | Most discovery is mobile. Desktop-only landing page loses the majority of visitors. | LOW | Tailwind responsive utilities. Test on iOS Safari (target market is iPad users). |
| Fast page load | Core Web Vitals affect SEO and conversion. Under 1.5s LCP is target. | LOW | Next.js App Router static rendering for marketing page. No auth overhead. |

---

## Differentiators

Features that would set this SaaS POS platform apart from Square/Lightspeed/Shopify in the NZ market. Not baseline expectations, but meaningful competitive advantage.

### Multi-Tenant Onboarding

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Working POS + storefront in under 5 minutes | Square takes 10+ min with hardware setup. Lightspeed requires sales conversation. The "instant store" is the demo. | HIGH | Requires wizard + auto-provisioning + sample data (optional starter catalog). Time-to-value is the KPI. |
| NZ-specific signup defaults | GST pre-enabled at 15%, NZD, EFTPOS as default payment type. No configuration needed to be legally compliant from day 1. | LOW | Defaults written into store seed function. Other platforms require manual GST config. |
| Starter product catalog option | "Load 20 example products to see what your store looks like" reduces time-to-value. Merchants can see a real storefront before loading their own data. | MEDIUM | Optional step in wizard. Seed from a pre-built template, tagged for easy deletion. |

### Feature Gating / Billing

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Stripe Entitlements API for feature checks | Native Stripe entitlements (not a custom DB column) means billing source-of-truth is Stripe, not your DB. Simpler to audit, harder to exploit. | MEDIUM | Stripe Entitlements is production-ready as of 2025. Attach features to products; query `stripe.entitlements.activeEntitlements.list()` server-side. HIGH confidence. |
| Per-feature Stripe products (not plan tiers) | Sell add-ons individually (Xero $9/mo, Email $5/mo, Custom Domain $10/mo) rather than S/M/L tiers. Merchants pay for what they use. | MEDIUM | More granular than typical "starter/pro/enterprise". Better fit for this product's discrete add-ons. Prevents tier-upgrade cliff. |
| Upgrade prompt in context | Prompt appears when merchant touches the locked feature — not in a separate "billing" page. Contextual upsell converts better than navigation-based upsell. | MEDIUM | Server-side entitlement check → client receives `feature_locked: true` → component renders inline upgrade CTA. |

### Store Setup Wizard

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live storefront preview during setup | Merchant sees their storefront update in real-time as they add logo/name. Makes the wizard feel productive, not bureaucratic. | HIGH | Preview panel next to form. Requires subdomain provisioned before wizard completes. Complex but high-impact. |
| Persistent setup checklist in admin | After wizard, a completion checklist lives in the admin dashboard. "Add your first product," "Connect Xero," etc. Industry standard (Shopify-style). | LOW | A simple checklist component. Each item links to the relevant admin section. Dismissable once all complete. |
| Subdomain slug conflict resolution | If chosen slug is taken, suggest alternatives automatically (`[name]-nz`, `[name]-store`). Don't just show an error. | LOW | On blur/submit, check uniqueness and render suggestions. Small detail that prevents frustration at step 1. |

### Super Admin Panel

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Impersonate tenant (act-as) | Support can debug a merchant's issue from their perspective without credentials. Eliminates entire class of support escalations. | HIGH | Sign a short-lived JWT with the target store_id + super_admin flag. Renders a visible impersonation banner. Audit-logged. |
| Per-tenant usage metrics | See which tenants are active, which are dormant, which add-ons drive the most revenue. Informs product decisions. | MEDIUM | Log transaction count, last_active_at per store. Simple aggregate queries. Not a full analytics suite. |
| Manual plan override | Grant a tenant a free trial of a paid feature, or comp a merchant for a support issue, without touching Stripe UI. | MEDIUM | Admin writes `feature_overrides` row that bypasses Stripe entitlement check. Time-limited. Audit-logged. |

### Marketing Landing Page

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live storefront demo link | Let prospects click through a working demo store before signing up. The product is the demo. | MEDIUM | Seed a demo store (e.g., `demo.nzpos.app`). Read-only or restricted to prevent abuse. |
| NZ-specific social proof | "Built for NZ retailers. GST-compliant out of the box. Xero-ready." NZ buyers are skeptical of generic international tools. | LOW | Copy and imagery. No technical work beyond writing. High conversion leverage. |
| Transparent free tier explanation | "Free forever" with clear add-on pricing builds trust. Merchants have been burned by bait-and-switch free tiers. | LOW | Pricing table with feature checklist per tier. Link to Terms for upgrade/cancellation terms. |

### Custom Domains (Paid Add-on)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bring-your-own domain for storefront | `shop.floralcreations.co.nz` instead of `floralcreations.nzpos.app`. Premium brand signal. | HIGH | Vercel Domains API: programmatic domain add + DNS verification + SSL provisioning. Merchant adds a CNAME, system verifies and activates. |
| Canonical redirect from subdomain | Once custom domain is active, `[store].nzpos.app` redirects to custom domain. Avoids SEO duplicate content. | LOW | Middleware check: if store has custom domain and request is on subdomain, 301 redirect. |
| Domain verification flow | Merchant must prove ownership via DNS TXT or CNAME record. Standard pattern — avoids domain hijacking. | MEDIUM | Vercel Domains API handles the crypto. UI needs to show DNS record to add, polling status, and success/failure state. |

---

## Anti-Features

Features that are commonly requested, seem reasonable, but create disproportionate complexity or downstream problems.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Database-per-tenant isolation | "Maximum isolation, tenant can have their own DB" | Supabase free tier is one database. Schema-per-tenant on free tier hits PG connection limits fast. Row-level isolation via `store_id` + RLS is proven, scales to thousands of tenants, and is already built. | `store_id` + RLS. Already implemented. |
| Multi-plan tiers (Starter/Pro/Enterprise) | "Standard SaaS packaging" | This product has 3 discrete add-ons (Xero, Email, Custom Domain). Forcing them into tiers creates upgrade cliffs and pays-for-what-they-don't-need frustration. Tier packaging is premature before product-market fit. | Individual Stripe products per add-on. Merchants subscribe to exactly what they need. |
| Onboarding email drip sequences | "Improve activation with nurture emails" | Email marketing infrastructure (Resend sequences, unsubscribe handling, bounce management) is a project in itself. Premature for initial launch. | Single transactional "welcome" email with setup checklist link. Add drip sequences in v2.1 once activation metrics exist. |
| Free trial with credit card required | "Reduce churn from low-intent signups" | NZ small business owners are skeptical of card-required trials. Square's no-card-required model built its NZ market share. Card requirement at signup is the single biggest conversion killer for this segment. | Purely freemium (no card required). Upgrade prompt when gated feature is touched. |
| Real-time tenant usage dashboard in super admin | "See activity live" | WebSocket connection to monitor all tenants adds Supabase Realtime cost and complexity. Not needed until support volume justifies it. | Refresh-on-demand queries. `last_active_at` column updated on transaction. |
| White-label (hide "Powered by NZPOS") | "Let merchants fully brand the platform" | Premature. NZPOS brand recognition is the goal at launch. White-label is a B2B enterprise sale, not a freemium play. | Attribution footer on storefront. Remove as a paid add-on in v3 if demanded. |
| Tenant self-service subdomain changes | "Let merchants rename their store slug" | Slug is the primary key of the subdomain routing system. Renaming requires migrating all references, invalidating bookmarks, breaking existing Google links for the storefront. | Slug is set at signup and locked. Name (display) is editable. If slug change is truly needed, super admin handles it manually with migration. |
| Bulk CSV tenant import (admin) | "Migrate existing customers" | Not needed for launch. The platform has zero existing customers. Manual signup is fine until the first wave. | Manual signup. If migration becomes needed, write a one-off script. |

---

## Feature Dependencies

```
Subdomain routing
    └──requires──> Tenant resolution middleware
    └──requires──> Store slug uniqueness (enforced at signup)
    └──requires──> Wildcard DNS configured on Vercel

Self-serve signup
    └──requires──> Automatic store provisioning (create store record)
    └──requires──> Subdomain slug generation
    └──requires──> Email verification (Supabase Auth)

Feature gating
    └──requires──> Stripe subscription checkout
    └──requires──> Webhook handler (subscription.updated, subscription.deleted)
    └──requires──> Server-side entitlement check on every gated route/action
    └──requires──> Stripe Customer ID stored per store

Stripe Customer Portal
    └──requires──> Stripe Customer ID per store
    └──enhances──> Feature gating (self-serve upgrade/downgrade)

Store setup wizard
    └──requires──> Store provisioning (store must exist before wizard runs)
    └──requires──> Supabase Storage (logo upload)
    └──enhances──> Marketing (wizard completion = activation event)

Custom domains
    └──requires──> Vercel Domains API access
    └──requires──> Subdomain routing (custom domain is an alias for the subdomain)
    └──requires──> Feature gating (custom domain is a paid add-on)
    └──enhances──> Subdomain routing (middleware must check both subdomain + custom domain)

Super admin panel
    └──requires──> is_super_admin JWT claim or DB flag
    └──requires──> Separate auth guard (not store_id RLS)
    └──enhances──> Feature gating (manual plan override)

Marketing landing page
    └──requires──> Signup flow exists (CTA must go somewhere working)
    └──enhances──> Subdomain routing (demo store shows the product)

Xero integration (existing, paid add-on)
    └──requires──> Feature gating (must check entitlement before OAuth connect)

Email notifications (existing, paid add-on)
    └──requires──> Feature gating (must check entitlement before sending)
```

### Dependency Notes

- **Subdomain routing must ship before storefront is tenant-aware.** Without it, merchants all hit the same store. This is Phase 1.
- **Stripe Customer ID must be created at signup or at first upgrade attempt.** Creating at signup avoids a race condition where a user tries to upgrade before a Customer exists. Create on signup, store in `stores.stripe_customer_id`.
- **Feature gating depends on webhook reliability.** If webhooks are missed, a merchant could retain access after cancellation (bad) or lose access incorrectly (worse). Use Stripe webhook idempotency and retry on failure.
- **Custom domains conflict with subdomain routing** if middleware doesn't handle both. Middleware must resolve tenant by custom domain first, subdomain second. Ship after subdomain routing is stable.

---

## MVP Definition for v2.0

### Launch With (v2.0 — the SaaS platform)

The minimum to call this a multi-tenant SaaS platform and onboard a second merchant.

- [ ] Wildcard subdomain routing + tenant resolution middleware
- [ ] Self-serve merchant signup with automatic store provisioning
- [ ] Store setup wizard (name, slug, logo — 3 steps, fully skippable)
- [ ] Feature gating for Xero, Email Notifications (existing add-ons)
- [ ] Stripe subscription checkout for each add-on
- [ ] Stripe webhook handler (subscription state sync)
- [ ] Stripe Customer Portal link in admin billing section
- [ ] Super admin panel (tenant list, view, suspend)
- [ ] Marketing landing page (hero, pricing, signup CTA)

### Add After First External Merchants (v2.1)

Once real merchants are using the platform and support patterns emerge.

- [ ] Custom domains (high complexity, low priority until merchants ask for it)
- [ ] Impersonate-tenant in super admin (needed when first support ticket arrives that can't be diagnosed remotely)
- [ ] Per-tenant usage metrics in super admin
- [ ] Setup checklist persistence in admin (post-wizard completeness nudging)
- [ ] Welcome email with setup checklist link

### Future Consideration (v3+)

- [ ] Live storefront preview in setup wizard (high value, high complexity)
- [ ] Starter product catalog option in wizard
- [ ] White-label / remove "Powered by NZPOS" (enterprise tier)
- [ ] Email drip onboarding sequences
- [ ] Advanced super admin analytics

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wildcard subdomain routing | HIGH | MEDIUM | P1 |
| Self-serve merchant signup | HIGH | MEDIUM | P1 |
| Store setup wizard (basic) | HIGH | LOW | P1 |
| Feature gating (Xero + Email) | HIGH | MEDIUM | P1 |
| Stripe subscription checkout | HIGH | MEDIUM | P1 |
| Stripe webhook handler | HIGH | MEDIUM | P1 |
| Marketing landing page | HIGH | LOW | P1 |
| Super admin panel (basic) | MEDIUM | LOW | P1 |
| Stripe Customer Portal link | MEDIUM | LOW | P1 |
| Custom domains | MEDIUM | HIGH | P2 |
| Impersonate tenant (admin) | MEDIUM | HIGH | P2 |
| Setup checklist (admin) | MEDIUM | LOW | P2 |
| Per-tenant usage metrics | LOW | MEDIUM | P2 |
| Live wizard preview | HIGH | HIGH | P3 |
| Starter product catalog | MEDIUM | MEDIUM | P3 |
| Welcome email | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add in v2.1 after first external merchants
- P3: Nice to have, v3+

---

## Competitor Feature Analysis

| Feature | Square | Lightspeed/Vend | Shopify POS | NZPOS v2.0 Plan |
|---------|--------|-----------------|-------------|-----------------|
| Self-serve signup | Yes, instant | Sales-assisted onboarding | Yes | Yes (goal: under 5 min) |
| Free core POS | Yes (card processing fee only) | No (from $89 NZD/mo) | No (from $49 USD/mo) | Yes |
| Wildcard subdomains | No (uses squareup.com/store URL) | No (custom domain required) | Yes (myshopify.com subdomain) | Yes (nzpos.app subdomain) |
| Custom domains | Yes (paid) | Yes (standard) | Yes (standard) | Yes (paid add-on, v2.1) |
| NZ GST pre-configured | Partial (must configure) | Yes | Partial (AU/NZ mode) | Yes (default at signup) |
| Xero integration | Limited sync | Yes (paid tier) | Via app store (third-party) | Yes (paid add-on, native) |
| Feature gating model | Tiered plans | Tiered plans | Tiered plans + app store | Per-add-on (granular) |
| Setup wizard | 3-step quick start | Long (15+ steps) | 14-step guided setup | 3-step (skippable) |
| Super admin panel | N/A | N/A | N/A | Yes (first-party) |

**NZPOS advantage:** NZ-first defaults, Xero native (not third-party), granular add-on pricing (not forced tiers), full code ownership.

---

## Sources

- [Vercel for Platforms — multi-tenant docs](https://vercel.com/docs/multi-tenant) — HIGH confidence
- [Vercel Platforms Starter Kit template](https://vercel.com/templates/next.js/platforms-starter-kit) — HIGH confidence
- [Stripe Entitlements API docs](https://docs.stripe.com/billing/entitlements) — HIGH confidence
- [Stripe Customer Portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal) — HIGH confidence
- [Stripe SaaS integration guide](https://docs.stripe.com/saas) — HIGH confidence
- [SaaS onboarding best practices (DesignRevision, 2026)](https://designrevision.com/blog/saas-onboarding-best-practices) — MEDIUM confidence
- [Onboarding wizard patterns (UserGuiding)](https://userguiding.com/blog/what-is-an-onboarding-wizard-with-examples) — MEDIUM confidence
- [SaaS feature flags guide (DesignRevision, 2026)](https://designrevision.com/blog/saas-feature-flags-guide) — MEDIUM confidence
- [Feature gating freemium SaaS without duplicating components (DEV community)](https://dev.to/aniefon_umanah_ac5f21311c/feature-gating-how-we-built-a-freemium-saas-without-duplicating-components-1lo6) — MEDIUM confidence
- [Multi-tenant architecture best practices (Relevant Software)](https://relevant.software/blog/multi-tenant-architecture/) — MEDIUM confidence
- Square vs Lightspeed/Vend/Shopify feature comparison: training knowledge + web research — MEDIUM confidence
- [B2B SaaS landing page best practices (GenesysGrowth, 2026)](https://genesysgrowth.com/blog/designing-b2b-saas-landing-pages) — MEDIUM confidence

---

## v1 Feature Reference

The v1 feature landscape (POS, storefront, admin, Xero, NZ compliance, competitive analysis) is preserved in git history at commit before v2.0 milestone start. All v1 features are shipped and not re-researched here.

---
*Feature research for: NZPOS v2.0 SaaS Platform*
*Researched: 2026-04-03*
