# Phase 14: Store Setup Wizard + Marketing - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A newly provisioned merchant configures their store in under 5 minutes via a 3-step wizard, and a public marketing landing page on the root domain explains the product and drives signups. The wizard triggers on first dashboard visit after email verification. A persistent setup checklist on the dashboard tracks onboarding progress. The landing page is statically rendered for fast mobile load.

</domain>

<decisions>
## Implementation Decisions

### Wizard Flow & Trigger
- **D-01:** Wizard is a dedicated route (`/admin/setup`). After email verification, first dashboard visit redirects to `/admin/setup` instead of `/admin/dashboard`. Completing or skipping all steps lands on dashboard.
- **D-02:** 3 wizard steps: (1) Store name + slug (slug display-only, name editable), (2) Logo upload + primary color selection, (3) Add first product (name, price, category, image).
- **D-03:** Resume where they left off. Track completed steps in DB (e.g. `setup_completed_steps` jsonb or integer bitmask on `stores` table). On return, jump to first incomplete step.
- **D-04:** Slug is display-only in wizard — immutable after signup (per REQUIREMENTS.md out-of-scope decision). Store name is editable.
- **D-05:** Every wizard step is individually skippable (per SETUP-02). Skipping all steps still results in a usable dashboard.

### Setup Checklist
- **D-06:** Persistent banner at top of admin dashboard showing progress (e.g. "2 of 5 steps complete"). Auto-hides when all items are complete with a brief congratulations message.
- **D-07:** 5 checklist items: Store name set, Logo uploaded, First product added, First POS sale completed, First online order received. Covers the full "store is live" journey.
- **D-08:** Auto-hide when all 5 items complete — no manual dismiss. Shows congratulations briefly, then disappears permanently.

### Landing Page
- **D-09:** Landing page lives at root domain homepage `/` (nzpos.co.nz/). Statically rendered (no client-side data fetch) for <2s mobile load time.
- **D-10:** Sections: Hero with headline + CTA, feature highlights (POS, online store, GST, inventory sync), pricing (free core + paid add-ons with prices), final CTA.
- **D-11:** Tone: Friendly, practical, NZ-focused. Lead with NZ-specific value props (GST built in, NZD, iPad POS). Casual, confident. "Built for Kiwi retailers" energy. No corporate-speak.
- **D-12:** Pricing shown transparently on landing page. Free core clearly stated, paid add-ons with prices. NZ small businesses want to know cost upfront.
- **D-13:** One tap/click from hero CTA to `/signup` form (per success criteria #5).

### Logo Upload & Branding
- **D-14:** Simple click-to-browse file picker with drag-drop zone. Shows preview after selection. Uploads to Supabase Storage. Max ~2MB, accepts PNG/JPG/SVG.
- **D-15:** Primary color picker uses preset palette: 8-10 curated color swatches that look good as accent colors. One tap to select. No free-form color picker.
- **D-16:** Branding appears on storefront header (logo + primary color as accent) and favicon (generated from logo). Admin stays in NZPOS platform brand.
- **D-17:** Branding editable after wizard via an `/admin/settings` page. Wizard is just the first touch — merchants can update logo, color, store name anytime.

### Claude's Discretion
- Exact wizard step UI layout and transitions (stepper, cards, etc.)
- Setup checklist banner design and congratulations message
- Landing page exact copy, hero image/illustration approach
- Preset color palette selection (8-10 colors that work well as accents)
- Logo storage bucket naming and path structure in Supabase Storage
- Favicon generation approach (resize logo, or initials fallback)
- Setup step tracking data model (jsonb vs bitmask vs boolean columns)
- Landing page component structure and static rendering approach
- First product wizard step: which fields are required vs optional

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Schema
- `supabase/migrations/014_multi_tenant_schema.sql` — Stores table with `logo_url`, `store_description`, `primary_color` columns already present. Setup wizard writes to these columns.
- `supabase/seed.ts` — Current seed data pattern. Reference for store row structure.
- `src/types/database.ts` — Generated Supabase types including branding columns on stores.

### Auth & Middleware
- `src/middleware.ts` — Tenant resolution middleware. Must add setup wizard redirect logic (check if setup complete, redirect to `/admin/setup` on first visit).
- `src/lib/resolveAuth.ts` — Server-side auth resolution. Used to check session state and store_id.

### Signup Flow (Phase 13)
- `src/app/signup/page.tsx` — Signup form. Landing page CTA links here.
- `src/app/signup/provisioning/page.tsx` — Provisioning screen. Wizard triggers after this flow completes and email is verified.
- `src/app/signup/verify-email/page.tsx` — Email verification screen. After verification, redirect goes to admin dashboard which then intercepts to wizard.

### Admin Dashboard
- `src/app/admin/dashboard/page.tsx` — Current dashboard. Setup checklist banner will be added here. Wizard redirect logic triggers from here.
- `src/app/admin/layout.tsx` — Admin layout. Wizard may need its own layout or share this one.

### Existing Components
- `src/components/admin/` — Admin component directory. Checklist banner and settings page components go here.
- `src/components/store/` — Storefront components. Branding (logo, primary color) applies to storefront header.

### Supabase Storage
- Supabase Storage already configured for product images (`next.config.ts` has `remotePatterns` for `*.supabase.co`). Logo upload follows same pattern.

### Design System
- `DESIGN.md` — All font choices, colors, spacing, and aesthetic direction. Landing page and wizard must follow this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `stores` table branding columns (`logo_url`, `store_description`, `primary_color`) — already in schema from Phase 12, ready to write to
- Supabase Storage integration — product image upload pattern exists, logo upload follows same approach
- Admin layout and dashboard components — checklist banner plugs into existing dashboard page
- Middleware tenant resolution — wizard redirect logic extends existing middleware checks

### Established Patterns
- Server Actions with Zod validation for all mutations (wizard steps save via Server Actions)
- Supabase Storage for image uploads (product images) — reuse for logo upload
- Middleware-based route protection and redirects (email verification gate already exists)
- Static pages via Next.js App Router (export const dynamic = 'force-static' or default static)

### Integration Points
- Middleware: Add setup-incomplete check after email verification check — redirect to `/admin/setup`
- Dashboard page: Add SetupChecklist component above existing content
- Storefront header: Read `logo_url` and `primary_color` from store data to apply branding
- Root domain: Add homepage route (`src/app/page.tsx` or root domain routing in middleware)

</code_context>

<specifics>
## Specific Ideas

- NZ-focused messaging: "Built for Kiwi retailers", lead with GST/NZD/iPad value props
- Transparent pricing on landing page — NZ small businesses expect upfront cost clarity
- Preset color palette (not free-form) ensures all storefronts look professional regardless of merchant's design skill
- Checklist tracks beyond wizard into actual store usage (first sale, first online order) — measures real activation, not just form completion

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-store-setup-wizard-marketing*
*Context gathered: 2026-04-03*
