# Phase 14: Store Setup Wizard + Marketing — Research

**Researched:** 2026-04-03
**Domain:** Multi-step onboarding wizard, setup checklist, static marketing landing page, logo upload, brand color picker
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Wizard is a dedicated route (`/admin/setup`). After email verification, first dashboard visit redirects to `/admin/setup`. Completing or skipping all steps lands on dashboard.
- **D-02:** 3 wizard steps: (1) Store name + slug display-only, (2) Logo upload + primary color, (3) Add first product.
- **D-03:** Resume where they left off. Track completed steps in DB (`setup_completed_steps` jsonb or integer bitmask on `stores` table). On return, jump to first incomplete step.
- **D-04:** Slug is display-only in wizard — immutable after signup (per REQUIREMENTS.md out-of-scope decision). Store name is editable.
- **D-05:** Every wizard step is individually skippable (per SETUP-02). Skipping all steps still results in a usable dashboard.
- **D-06:** Persistent banner at top of admin dashboard showing progress ("2 of 5 steps complete"). Auto-hides when all items complete with congratulations message.
- **D-07:** 5 checklist items: Store name set, Logo uploaded, First product added, First POS sale completed, First online order received.
- **D-08:** Auto-hide when all 5 items complete — no manual dismiss. Shows congratulations briefly then disappears permanently.
- **D-09:** Landing page lives at root domain homepage `/`. Statically rendered for <2s mobile load time.
- **D-10:** Sections: Hero + CTA, feature highlights, pricing, final CTA.
- **D-11:** Tone: Friendly, practical, NZ-focused. "Built for Kiwi retailers." No corporate-speak.
- **D-12:** Pricing shown transparently. Free core clearly stated, paid add-ons with NZD prices.
- **D-13:** One tap/click from hero CTA to `/signup`.
- **D-14:** Logo upload: click-to-browse + drag-drop zone. Shows preview. Uploads to Supabase Storage. Max ~2MB, PNG/JPG/SVG.
- **D-15:** Primary color picker: preset palette of 8-10 curated color swatches. No free-form picker.
- **D-16:** Branding appears on storefront header (logo + primary color) and favicon. Admin stays in NZPOS platform brand.
- **D-17:** Branding editable after wizard via `/admin/settings`. Wizard is just the first touch.

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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Merchant completes a 3-step setup wizard (store name/slug, logo, first product) | D-01 through D-05 locked. Middleware redirect pattern, Server Action save pattern, and Supabase Storage upload pattern all verified in codebase. |
| SETUP-02 | Every wizard step is skippable | D-05 locked. Skip paths must write partial state to DB and redirect correctly. Null-safety in dashboard verified. |
| SETUP-03 | Admin dashboard shows a persistent setup completion checklist | D-06 through D-08 locked. AdminLayout banner pattern verified (XeroDisconnectBanner, StripeTestModeBanner precedents). Dashboard component structure confirmed. |
| MKTG-01 | Public marketing landing page with hero, pricing, and signup CTA | D-09 through D-13 locked. Root domain already passes through middleware unchanged. Route group `(marketing)` pattern available. |
| MKTG-02 | Landing page is mobile-optimised and statically rendered for fast load | `export const dynamic = 'force-static'` pattern confirmed in codebase. No client-side data fetch required. Tailwind responsive utilities available. |
</phase_requirements>

---

## Summary

Phase 14 introduces two distinct work streams that share almost no implementation overlap: (1) a merchant onboarding wizard with a persistent dashboard checklist, and (2) a static marketing landing page at the root domain.

The wizard work is well-scaffolded. The `stores` table already has `logo_url`, `primary_color`, and `store_description` columns from Phase 12 migration 014. The product image upload Route Handler (`/api/products/image`) and `ProductImagePicker` component provide a direct template for logo upload. The middleware already handles the email-verification gate — adding a setup-incomplete check is a single additional condition in the admin route branch. The admin layout already renders conditional banners (`XeroDisconnectBanner`, `StripeTestModeBanner`); `SetupChecklist` follows the same insertion pattern.

The only new schema needed is a `setup_completed_steps` tracking column on `stores` and a `setup_wizard_dismissed` boolean. The wizard state machine is simple: an integer bitmask or jsonb on `stores` records which of the 3 wizard steps have been actioned (saved or skipped). The dashboard checklist tracks 5 items including post-wizard milestones (first POS sale, first online order) which must be derived from existing `orders` table data — not a separate flag.

The landing page is a pure static rendering problem. The root domain passes through middleware untouched (line 23-27 of `middleware.ts`). The existing `src/app/page.tsx` (if any) or a new `(marketing)` route group serves it. `export const dynamic = 'force-static'` ensures no server-side data fetching. The UI-SPEC is fully defined and approved.

**Primary recommendation:** Implement in four sequential tasks — (1) schema migration + wizard routes + Server Actions, (2) wizard UI components, (3) dashboard checklist component, (4) landing page. The logo upload API route is a near-copy of `/api/products/image`.

---

## Standard Stack

### Core (all already installed — no new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.1 | Route structure, Server Actions, static pages | Project standard — all pages and actions use App Router |
| Supabase JS | ^2.101.1 | DB reads/writes for wizard state and checklist data | Project standard — all data access |
| @supabase/ssr | ^0.10.0 | Server-side Supabase client | Project standard — cookie handling |
| Zod | ^4.3.6 | Server Action input validation | Project standard — every mutation validated |
| Tailwind CSS | ^4 | All styling | Project standard — no CSS Modules |

### No New Dependencies

All Phase 14 work uses existing installed packages. Specifically:

- **Logo upload:** Reuses `sharp` (auto-installed by Next.js) + `@supabase/supabase-js` storage API — same as `/api/products/image`
- **Color picker:** 8 hardcoded swatch buttons — no external color picker library needed
- **Stepper/wizard UI:** Plain CSS with Tailwind — no multi-step form library needed
- **Static landing page:** `export const dynamic = 'force-static'` — no SSG library needed
- **Checklist progress:** CSS width calculation + Tailwind — no progress library needed

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                          # REPLACES: root domain landing page (static)
│   ├── (marketing)/                      # Route group (no layout impact on other routes)
│   │   ├── layout.tsx                    # Minimal layout: fonts, no admin chrome
│   │   └── components/
│   │       ├── LandingNav.tsx
│   │       ├── LandingHero.tsx
│   │       ├── LandingFeatures.tsx
│   │       ├── LandingPricing.tsx
│   │       ├── LandingCTA.tsx
│   │       └── LandingFooter.tsx
│   └── admin/
│       ├── setup/
│       │   ├── page.tsx                  # Wizard entry — resolves current step
│       │   └── [step]/
│       │       └── page.tsx              # Optional: step-parameterized route
│       ├── settings/
│       │   └── page.tsx                  # Branding settings (editable post-wizard)
│       ├── dashboard/
│       │   └── page.tsx                  # MODIFIED: adds SetupChecklist above existing content
│       └── layout.tsx                    # MODIFIED: renders SetupChecklist in layout, or pass via page
├── components/
│   ├── wizard/
│   │   ├── WizardLayout.tsx
│   │   ├── WizardStepIndicator.tsx
│   │   ├── WizardStepCard.tsx
│   │   ├── LogoUploadZone.tsx
│   │   └── BrandColorPicker.tsx
│   └── admin/
│       └── SetupChecklist.tsx            # NEW
├── actions/
│   └── setup/
│       ├── saveStoreNameStep.ts
│       ├── saveLogoStep.ts
│       └── saveProductStep.ts
└── app/
    └── api/
        └── store/
            └── logo/
                └── route.ts              # Logo upload — mirrors /api/products/image
```

### Pattern 1: Wizard State Tracking via Integer Bitmask

**What:** A single `INT` column `setup_completed_steps` on `stores` stores which wizard steps have been touched (saved or skipped). Bit 0 = step 1 done, bit 1 = step 2 done, bit 2 = step 3 done.

**When to use:** When you need to track completion of a fixed, ordered set of steps without a join table.

**Why bitmask over JSONB:** Simpler comparison (`setup_completed_steps & 1 = 1`), atomic updates, less schema noise. JSONB is acceptable but adds unnecessary flexibility for 3 boolean flags.

**Why bitmask over 3 boolean columns:** Single column, atomic "mark step N complete" update without needing to know other column names.

```typescript
// Source: established project pattern — Supabase JS client with typed queries
// src/actions/setup/saveStoreNameStep.ts
'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveAuth } from '@/lib/resolveAuth'

const schema = z.object({
  storeName: z.string().min(1).max(100),
})

export async function saveStoreNameStep(formData: FormData) {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const parsed = schema.safeParse({ storeName: formData.get('storeName') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('stores')
    .update({
      name: parsed.data.storeName,
      // Bitwise OR to mark step 1 complete (bit 0)
      setup_completed_steps: supabase.rpc('bitwise_or_step', { step: 1 }),
    })
    .eq('id', auth.store_id)

  if (error) return { error: 'Failed to save store name' }
  return { success: true }
}
```

**Simpler alternative — raw SQL update in Server Action:**
```typescript
// Increment bitmask with raw update (no RPC needed)
await supabase.rpc('mark_setup_step', { p_store_id: auth.store_id, p_step_bit: 1 })
```

Or use 3 separate boolean columns (`setup_step1_done`, `setup_step2_done`, `setup_step3_done`) — simpler to read, acceptable for 3 fixed flags. Recommend this over bitmask for clarity.

### Pattern 2: Middleware Setup Redirect

**What:** After the email-verification check, add a second condition: if the store has not completed setup, redirect to `/admin/setup`.

**When to use:** Intercept admin navigation before reaching dashboard when wizard is incomplete.

**Key constraint:** Must NOT redirect when the request is already for `/admin/setup` (avoid redirect loop).

```typescript
// Source: src/middleware.ts — existing admin route branch (lines 58-108)
// Add after the emailVerified check, before returning response:

if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/setup')) {
  // Check setup completion
  const { data: store } = await supabase  // already initialized above
    .from('stores')
    .select('setup_completed_steps, setup_wizard_dismissed')
    .eq('id', storeId)
    .single()

  // setup_wizard_dismissed = true means merchant explicitly finished or dismissed
  if (store && !store.setup_wizard_dismissed) {
    return NextResponse.redirect(new URL('/admin/setup', request.url))
  }
}
```

**Important:** The middleware already calls `supabase.auth.getUser()` and has `storeId` resolved by line 58. Use the already-initialized `supabase` client — do not make a second auth call.

**Performance:** The `stores` query adds ~1 database round-trip on every admin page load until wizard is dismissed. This is acceptable for a first-visit flow. Once `setup_wizard_dismissed = true`, the check is a single indexed lookup that returns immediately.

### Pattern 3: Logo Upload Route Handler (mirrors product image)

**What:** A Route Handler at `/api/store/logo` that accepts multipart form data, validates file type/size, uses `sharp` to resize to a standard dimension, uploads to a dedicated `store-logos` Supabase Storage bucket, and returns the public URL.

**When to use:** Logo upload from `LogoUploadZone` component.

**Key differences from product image upload:**
- Different bucket: `store-logos` (not `product-images`)
- Smaller max file size: 2MB (not 10MB)
- Accepts SVG in addition to PNG/JPG (no `sharp` processing for SVG — pass through directly)
- Resize target: 400x400 max (logos are smaller than product images)
- Path structure: `{store_id}/{uuid}.webp` (scoped by store for RLS-like access pattern)

```typescript
// Source: src/app/api/products/image/route.ts — direct template
// src/app/api/store/logo/route.ts

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

// SVG passthrough — sharp cannot process SVG reliably
if (file.type === 'image/svg+xml') {
  // Upload SVG directly without sharp processing
  const bytes = await file.arrayBuffer()
  // upload to store-logos bucket as .svg
}
```

### Pattern 4: Static Landing Page

**What:** Root domain homepage served as a statically rendered Next.js page with no data fetching.

**When to use:** Any page that has no user-specific or store-specific data.

```typescript
// Source: Next.js App Router docs — static rendering
// src/app/page.tsx (root domain)
export const dynamic = 'force-static'

export default function LandingPage() {
  // Pure JSX — no async, no data fetching, no Supabase calls
  return (
    <>
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </>
  )
}
```

**Middleware note:** Root domain already passes through at line 23-27 of `middleware.ts` (`if (isRoot)`) with only a session refresh. The landing page at `/` on the root domain does not need any middleware changes.

**Current `src/app/page.tsx` state:** The file does not currently exist in the codebase (`src/app/` lists only `favicon.ico`, `globals.css`, `layout.tsx`, `login`, `manifest.ts`, `not-found`, `signup`, `unauthorized`). There is no root page yet. Creating `src/app/page.tsx` is safe — it becomes the root domain homepage.

### Pattern 5: Setup Checklist — Deriving Completion from Orders Table

**What:** The 5-item checklist includes "First POS sale completed" and "First online order received" — these are not wizard steps. They must be derived from the `orders` table, not stored as flags.

**When to use:** For checklist items that reflect real-world events rather than form completions.

```typescript
// Derive checklist items from store data
const hasStoreName = !!store.name && store.name !== store.slug  // or check setup flag
const hasLogo = !!store.logo_url
const hasProduct = productCount > 0
const hasPosSale = orders.some(o => o.channel === 'pos')
const hasOnlineOrder = orders.some(o => o.channel === 'online')
```

**Query approach:** A single query fetching `orders.channel` (any status) for the store, checking for both channels. This is a cheap `EXISTS`-style query since we only need one row per channel.

### Pattern 6: Wizard as Client Component with Server Action Saves

**What:** Each wizard step is a Client Component (`'use client'`) that manages local form state. On "Save & Continue", it calls a Server Action. On success, it transitions to the next step via client-side state or `router.push`.

**When to use:** Wizard UI where step transitions should feel instant without full page reloads.

**Alternative:** Server-side multi-step using URL params (`/admin/setup?step=2`). Both work. Client Component approach gives smoother transitions (250ms slide animation per UI-SPEC). Recommend client approach for the wizard shell with Server Actions for persistence.

```typescript
// Wizard shell — Client Component managing current step
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupWizard({ initialStep, storeData }: Props) {
  const [step, setStep] = useState(initialStep) // 1, 2, or 3
  const router = useRouter()

  async function handleStepSave(action: () => Promise<{ error?: string }>) {
    const result = await action()
    if (result.error) { /* show error */ return }
    if (step < 3) setStep(step + 1)
    else router.push('/admin/dashboard')
  }
  // ...
}
```

### Anti-Patterns to Avoid

- **Tracking wizard completion in localStorage:** User can clear storage or switch devices. DB is the only reliable source of truth for wizard state.
- **Redirecting to `/admin/setup` from the dashboard page:** Do this in middleware, not in the page Server Component. Page-level redirects cause unnecessary rendering before the redirect. Middleware fires first.
- **Making the landing page dynamic:** Any `await supabase...` call in `page.tsx` will make it dynamic and defeat MKTG-02. Keep all landing page components pure JSX with no async data.
- **Calling `createSupabaseServerClient()` in a wizard Client Component directly:** Server clients cannot be instantiated on the client. All Supabase writes from wizard Client Components must go through Server Actions.
- **Storing SVG logo through sharp:** sharp cannot reliably process SVG. Pass SVGs through directly to Supabase Storage without processing.
- **Redirect loop in middleware:** The setup redirect must check `!pathname.startsWith('/admin/setup')` to avoid infinite redirect when the merchant is already on the wizard.
- **Using `router.refresh()` for checklist state updates:** After a wizard step saves branding data, the storefront header reads `logo_url`/`primary_color` from a Server Component. A `router.refresh()` triggers a server re-render which picks up the new values. This is correct — do not use client state for storefront branding.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logo image resizing | Custom canvas/browser resize | `sharp` in Route Handler | sharp handles EXIF rotation, ICC profiles, memory efficiency; browser resize loses metadata and quality |
| File drag-drop detection | Raw `dragenter`/`drop` event wiring | Follow `ProductImagePicker` pattern (click-to-open, no drag-drop complexity) OR simple drag-drop via HTML5 `onDragOver`/`onDrop` | Browser API is sufficient; no library needed for basic drag-drop on a single zone |
| Progress bar | Third-party component | CSS `width` percentage on a div | Three lines of Tailwind — no library justified |
| Step indicator | External stepper library | Custom `WizardStepIndicator` SVG + Tailwind | Stepper libraries have API surface and style lock-in; this is 20 lines of JSX |
| Color picker | react-colorful, etc. | 8 hardcoded `<button>` swatches | D-15 locked preset palette — no free-form input needed |
| Form state management | react-hook-form | Plain `useState` + Server Action | Each wizard step has 1-3 fields; RHF overhead is not justified |
| Landing page animations | Framer Motion, GSAP | None — static sections with CSS | MKTG-02 requires no scroll animations; static HTML is the feature |

**Key insight:** The wizard involves no complex state machine — it is 3 linear steps with skip. Plain React state handles this in ~30 lines.

---

## Runtime State Inventory

> This is a greenfield feature addition (no rename/refactor). This section is not applicable.

None — Phase 14 adds new routes and columns. No existing stored data contains strings that need renaming.

---

## Common Pitfalls

### Pitfall 1: Middleware Redirect Loop on `/admin/setup`

**What goes wrong:** Adding a redirect to `/admin/setup` in the admin middleware branch without excluding the `/admin/setup` path itself causes infinite redirects. The browser shows "too many redirects".

**Why it happens:** The middleware runs on every request including the `/admin/setup` route itself.

**How to avoid:** Gate the redirect condition on `!pathname.startsWith('/admin/setup')`. Also exclude `/admin/settings` (the post-wizard branding edit page) from the redirect to allow merchants to access settings before wizard is complete if desired.

**Warning signs:** Browser shows ERR_TOO_MANY_REDIRECTS on admin routes.

### Pitfall 2: Wizard Dismiss Flag Never Set — Merchant Stuck in Wizard

**What goes wrong:** If the wizard routes never update `setup_wizard_dismissed = true` (e.g., on "Skip all" path), every admin visit redirects to the wizard forever.

**Why it happens:** The skip path is easy to implement as "do nothing and navigate to dashboard" — forgetting to write the dismiss flag.

**How to avoid:** Every terminal wizard action (final step save, final step skip) must write `setup_wizard_dismissed = true` to `stores`. The middleware reads this flag to stop redirecting.

**Warning signs:** After completing wizard, every admin navigation goes to `/admin/setup`.

### Pitfall 3: SVG Logo Passed Through Sharp

**What goes wrong:** `sharp(svgBuffer)` throws an error or produces unexpected output because SVG is a vector format, not raster.

**Why it happens:** The product image route allows JPEG/PNG/WebP — SVG is a new addition for logos. Copy-paste of the route without handling the SVG case.

**How to avoid:** In the logo Route Handler, branch on `file.type === 'image/svg+xml'` and upload the SVG bytes directly to Supabase Storage without sharp processing.

**Warning signs:** `sharp` throws "Input file is missing" or produces a 0-byte output for SVG inputs.

### Pitfall 4: Landing Page Accidentally Dynamic

**What goes wrong:** `export const dynamic = 'force-static'` is omitted, or a child component uses `cookies()`, `headers()`, or any async Supabase call, making the page opt into dynamic rendering. The page now server-renders on every request and may miss the <2s mobile load target.

**Why it happens:** Copying an admin component pattern (which uses `createSupabaseServerClient()`) into a landing page component.

**How to avoid:** All landing page components (`LandingNav`, `LandingHero`, etc.) must be pure JSX Server Components with no async data. The `LandingNav` "Sign in" link is a plain `<Link>` — it does not read auth state (the landing page does not know if the visitor is logged in).

**Warning signs:** Next.js build output shows the `/` route as `λ` (dynamic) instead of `○` (static).

### Pitfall 5: Checklist Shows Stale State After Wizard Completion

**What goes wrong:** Merchant completes wizard step 1 (saves store name), then views dashboard — checklist still shows step 1 incomplete because the dashboard page was cached.

**Why it happens:** The dashboard page uses `export const dynamic = 'force-dynamic'` (confirmed in source). But the checklist component is rendered by the layout or page — if the data fetch for checklist state is in the layout and the layout is cached, stale data appears.

**How to avoid:** Place the checklist data fetch in `dashboard/page.tsx` (which is already `force-dynamic`) not in `admin/layout.tsx`. The layout should receive checklist data as a prop or the checklist component should be a Server Component rendered in the page, not the layout.

**Warning signs:** Checklist item for "Set your store name" stays unchecked after wizard step 1 completes.

### Pitfall 6: `next/image` Failing for SVG Logos

**What goes wrong:** `<Image src={store.logo_url} />` throws an error when the logo URL points to an SVG file because Next.js `next/image` does not optimize SVGs by default.

**Why it happens:** `next/image` calls the image optimizer for all remote images. SVG cannot be optimized like raster formats.

**How to avoid:** When rendering a logo where the URL may be SVG, check the URL extension and use `<img>` for SVGs or add `unoptimized` prop conditionally. Alternatively, use `<img>` for all logo renders (logos are already small, optimization is low-value).

**Warning signs:** `Error: Unable to optimize image and unable to fallback to external image` in the console.

---

## Code Examples

### Wizard Step — Server Action (Zod + Supabase pattern)

```typescript
// Source: src/actions/auth/ownerSignup.ts + src/actions/products/* — established pattern
// src/actions/setup/saveLogoStep.ts
'use server'
import 'server-only'
import { z } from 'zod'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const schema = z.object({
  logoUrl: z.string().url().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
})

export async function saveLogoStep(formData: FormData) {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const parsed = schema.safeParse({
    logoUrl: formData.get('logoUrl') || null,
    primaryColor: formData.get('primaryColor') || null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('stores')
    .update({
      ...(parsed.data.logoUrl && { logo_url: parsed.data.logoUrl }),
      ...(parsed.data.primaryColor && { primary_color: parsed.data.primaryColor }),
      setup_completed_steps: 3, // bitmask: bits 0+1 set = steps 1+2 done
    })
    .eq('id', auth.store_id)

  if (error) return { error: 'Failed to save branding' }
  return { success: true }
}
```

### Dismiss Wizard — Server Action

```typescript
// Called on final step save OR final step skip
// src/actions/setup/dismissWizard.ts
'use server'
import 'server-only'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function dismissWizard() {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const supabase = await createSupabaseServerClient()
  await supabase
    .from('stores')
    .update({ setup_wizard_dismissed: true })
    .eq('id', auth.store_id)

  return { success: true }
}
```

### Logo Route Handler (SVG passthrough)

```typescript
// Source: src/app/api/products/image/route.ts — direct template with SVG branch
// src/app/api/store/logo/route.ts
const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml']

export async function POST(req: NextRequest) {
  // ... auth check (same as product image route) ...

  if (file.type === 'image/svg+xml') {
    // SVG passthrough — do not process with sharp
    const bytes = new Uint8Array(await file.arrayBuffer())
    const filename = `${storeId}/${crypto.randomUUID()}.svg`
    const { error } = await supabase.storage
      .from('store-logos')
      .upload(filename, bytes, { contentType: 'image/svg+xml', upsert: false })
    // ... return URL
  }

  // Raster images — resize with sharp to 400x400 max
  const resized = await sharp(buffer)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  // ...
}
```

### Static Landing Page

```typescript
// Source: Next.js App Router — static rendering pattern
// src/app/page.tsx
import LandingNav from './(marketing)/components/LandingNav'
import LandingHero from './(marketing)/components/LandingHero'
import LandingFeatures from './(marketing)/components/LandingFeatures'
import LandingPricing from './(marketing)/components/LandingPricing'
import LandingCTA from './(marketing)/components/LandingCTA'
import LandingFooter from './(marketing)/components/LandingFooter'

export const dynamic = 'force-static'

export default function LandingPage() {
  return (
    <main>
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
```

### Checklist Data Query (dashboard page)

```typescript
// Derive all 5 checklist states from DB in one pass
// Add to src/app/admin/dashboard/page.tsx alongside existing queries

const { data: storeData } = await supabase
  .from('stores')
  .select('name, logo_url, setup_completed_steps, setup_wizard_dismissed')
  .eq('id', storeId)
  .single()

// Check if any orders exist per channel (cheap — just needs 1 row per channel)
const { data: channelData } = await supabase
  .from('orders')
  .select('channel')
  .eq('store_id', storeId)
  .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])

const hasPosSale = channelData?.some(o => o.channel === 'pos') ?? false
const hasOnlineOrder = channelData?.some(o => o.channel === 'online') ?? false

// Product count (already queried in dashboard — reuse)
const hasProduct = (products ?? []).length > 0

const checklistState = {
  storeName: !!(storeData?.name),
  logo: !!(storeData?.logo_url),
  firstProduct: hasProduct,
  firstPosSale: hasPosSale,
  firstOnlineOrder: hasOnlineOrder,
  dismissed: storeData?.setup_wizard_dismissed ?? false,
}
```

---

## Schema Changes Required

Two new columns on `stores` table (new migration file required):

```sql
-- Migration: 018_setup_wizard.sql
ALTER TABLE public.stores
  ADD COLUMN setup_completed_steps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN setup_wizard_dismissed BOOLEAN NOT NULL DEFAULT false;

-- Storage bucket for store logos (separate from product-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for store logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

CREATE POLICY "Authenticated users can upload store logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-logos');

CREATE POLICY "Authenticated users can update store logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-logos');

CREATE POLICY "Authenticated users can delete store logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-logos');
```

**Note:** `setup_wizard_dismissed = false` by default means ALL existing stores (including the demo store from seeding) will be redirected to the wizard on first admin visit after this phase deploys. The seed file and any existing store fixtures must have `setup_wizard_dismissed = true` set to avoid disrupting development.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wizard as separate pages with GET params | Client Component with step state + Server Actions per step | React 18+ / App Router | Smoother transitions, no full page reload between steps |
| Progress stored in `localStorage` | Progress stored in DB | SaaS best practice | Survives device switches, browser clears |
| Color pickers (react-colorful etc.) | Preset swatches only | Product design evolution | D-15 locked — preset palette ensures storefront quality |

**Not applicable/deprecated:**

- `@supabase/auth-helpers-nextjs`: deprecated, replaced by `@supabase/ssr` (already using correct package)

---

## Open Questions

1. **`next/image` and SVG logos on storefront header**
   - What we know: `StorefrontHeader.tsx` currently hardcodes "NZPOS" as a text link, not an image. It does not read `logo_url` at all.
   - What's unclear: The storefront header will need to read store branding data from DB. This requires making it a Server Component (or fetching in a parent Server Component and passing as prop). The current header is `'use client'`.
   - Recommendation: Fetch `logo_url` and `primary_color` in the storefront page's Server Component parent and pass as props to the header. Use `<img>` (not `next/image`) for logo to handle SVG without the optimizer.

2. **Favicon generation from logo**
   - What we know: CONTEXT.md leaves favicon approach to Claude's discretion. The current `src/app/layout.tsx` has a static `<link rel="apple-touch-icon">`.
   - What's unclear: Dynamic per-store favicon requires either a Route Handler at `/favicon.ico` that reads the store's logo and serves a resized version, or an initials-based SVG favicon. Both add complexity.
   - Recommendation: Initials fallback as an SVG data URI is simplest for v1. If store has `logo_url`, link to it directly as favicon (browsers accept remote URLs for `<link rel="icon">`). Defer per-store dynamic favicon generation to a future phase — the value is low relative to complexity.

3. **`setup_wizard_dismissed` on existing seed store**
   - What we know: `supabase/seed.ts` provisions a demo store row. After migration 018, this row will have `setup_wizard_dismissed = false` by default.
   - What's unclear: The seeding script will need updating to set `setup_wizard_dismissed = true` on the demo store to prevent the wizard redirect breaking local development.
   - Recommendation: Wave 0 task: update `supabase/seed.ts` to set `setup_wizard_dismissed = true` for the demo store.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all tools already installed and verified in prior phases).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npm test` (vitest run) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | `saveStoreNameStep` validates input and updates DB | unit | `npx vitest run src/actions/setup/saveStoreNameStep.test.ts` | ❌ Wave 0 |
| SETUP-01 | `saveLogoStep` validates input and updates DB | unit | `npx vitest run src/actions/setup/saveLogoStep.test.ts` | ❌ Wave 0 |
| SETUP-01 | `saveProductStep` validates input, creates product | unit | `npx vitest run src/actions/setup/saveProductStep.test.ts` | ❌ Wave 0 |
| SETUP-02 | Skip path sets `setup_wizard_dismissed = true` | unit | covered in `dismissWizard.test.ts` | ❌ Wave 0 |
| SETUP-03 | Checklist completion flags derive correctly from store + orders data | unit | `npx vitest run src/lib/setupChecklist.test.ts` | ❌ Wave 0 |
| MKTG-01 | Landing page renders hero, pricing, CTA without errors | smoke | Build check (`npm run build`) | N/A |
| MKTG-02 | Landing page route renders as static (no dynamic marker) | smoke | `npm run build` — check `○` marker for `/` route | N/A |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/setup/saveStoreNameStep.test.ts` — covers SETUP-01 (name save)
- [ ] `src/actions/setup/saveLogoStep.test.ts` — covers SETUP-01 (logo save)
- [ ] `src/actions/setup/saveProductStep.test.ts` — covers SETUP-01 (product save)
- [ ] `src/actions/setup/dismissWizard.test.ts` — covers SETUP-02 (skip/dismiss)
- [ ] `src/lib/setupChecklist.test.ts` — covers SETUP-03 (checklist derivation logic)

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 14 |
|-----------|-------------------|
| Always read DESIGN.md before any visual/UI decisions | UI-SPEC already incorporates DESIGN.md. Every new component must follow the spacing, color, and typography tokens defined there. |
| No deviations from DESIGN.md without explicit user approval | All 12 new components in the component inventory must use `var(--color-*)`, `var(--space-*)`, and font classes established in the design system. |
| Tech stack is non-negotiable: Next.js + Supabase + Stripe + Tailwind | No new libraries. Wizard uses React state + Server Actions. Landing page uses Tailwind CSS only. |
| Server Actions must validate inputs with `z.safeParse()` | All 4 wizard Server Actions (`saveStoreNameStep`, `saveLogoStep`, `saveProductStep`, `dismissWizard`) require Zod validation. |
| Do not use `@supabase/auth-helpers-nextjs` (deprecated) | Confirmed: project uses `@supabase/ssr`. No change needed. |
| Do not use CSS Modules, styled-components, or Emotion | Landing page components: Tailwind utility classes only. |
| Do not use Tailwind v3 | Confirmed: `tailwindcss ^4` installed. |
| Import `server-only` in files with Supabase credentials or Server Actions | All wizard Server Action files must start with `import 'server-only'`. |
| Do not use Supabase Realtime | Not applicable to this phase. |
| GSD workflow enforcement | All file changes happen within this GSD phase execution. |

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection — `src/middleware.ts` (lines 23-27, 58-108) — confirmed root domain passthrough and admin auth gate pattern
- Codebase inspection — `src/app/api/products/image/route.ts` — confirmed logo upload template (sharp + Supabase Storage)
- Codebase inspection — `supabase/migrations/014_multi_tenant_schema.sql` — confirmed `logo_url`, `primary_color`, `store_description` columns exist
- Codebase inspection — `src/types/database.ts` (lines 675-717) — confirmed `stores` Row type includes branding columns
- Codebase inspection — `src/app/admin/layout.tsx` — confirmed banner insertion pattern (XeroDisconnectBanner)
- Codebase inspection — `src/app/admin/dashboard/page.tsx` — confirmed `force-dynamic`, existing query structure
- Codebase inspection — `vitest.config.mts` + package.json — confirmed Vitest ^4.1.2, `npm test` command
- Phase 14 CONTEXT.md — all locked decisions (D-01 through D-17)
- Phase 14 UI-SPEC.md — component inventory, screen specifications, motion contract, copy contract

### Secondary (MEDIUM confidence)

- Next.js App Router docs — `export const dynamic = 'force-static'` for static rendering (confirmed by project pattern: existing pages use `force-dynamic` which demonstrates awareness of the directive)

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used in codebase
- Architecture: HIGH — patterns derived from existing codebase code, not speculation
- Pitfalls: HIGH — derived from reading actual source files (middleware, upload route, layout)
- Schema changes: HIGH — branding columns already exist; new columns are minimal additions

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack — no fast-moving dependencies)
