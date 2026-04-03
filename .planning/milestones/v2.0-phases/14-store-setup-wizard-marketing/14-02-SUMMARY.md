---
phase: 14-store-setup-wizard-marketing
plan: 02
subsystem: ui, wizard, admin, storefront
tags: [next.js, react, tailwind, server-actions, wizard, branding]

# Dependency graph
requires:
  - phase: 14-01
    provides: saveStoreNameStep, saveLogoStep, saveProductStep, dismissWizard, getChecklistState, /api/store/logo
  - phase: 12-multi-tenant-infrastructure
    provides: x-store-id middleware header, stores table, tenant routing
provides:
  - src/app/admin/setup/page.tsx — wizard entry point (setup_completed_steps bitmask -> initialStep)
  - src/components/wizard/SetupWizard.tsx — client orchestrator with step state + completedSteps + auto-redirect
  - src/components/wizard/WizardLayout.tsx — minimal chrome (no admin sidebar, NZPOS wordmark)
  - src/components/wizard/WizardStepIndicator.tsx — 3-dot indicator with amber/navy/pending + aria-current
  - src/components/wizard/WizardStepCard.tsx — AuthCard-pattern shell
  - src/components/wizard/StoreNameStep.tsx — step 1: name + slug, saveStoreNameStep, Skip
  - src/components/wizard/LogoBrandStep.tsx — step 2: logo upload + color picker, saveLogoStep, Skip
  - src/components/wizard/FirstProductStep.tsx — step 3: product form, saveProductStep + dismissWizard
  - src/components/wizard/LogoUploadZone.tsx — drag-drop + click, /api/store/logo, SVG/PNG/JPG, preview
  - src/components/wizard/BrandColorPicker.tsx — 8 swatches, amber selection ring, aria-pressed
  - src/components/wizard/WizardCompletion.tsx — checkmark, "Your store is ready.", fade-in, "Taking you there..."
  - src/components/admin/SetupChecklist.tsx — 5-item banner, progress bar, auto-collapse on all-complete
  - src/app/admin/dashboard/page.tsx — modified to include SetupChecklist above Dashboard h1
  - src/app/admin/settings/page.tsx — branding settings with BrandingForm client component
  - src/app/admin/settings/BrandingForm.tsx — reuses LogoUploadZone + BrandColorPicker, updateBranding
  - src/actions/setup/updateBranding.ts — Server Action: resolveAuth + z.safeParse + stores UPDATE
  - src/components/store/StorefrontHeader.tsx — branding prop (logo/name/primaryColor), luminance-aware text
  - src/app/(store)/layout.tsx — reads x-store-id header, queries stores branding, passes to header
affects:
  - 14-03 (marketing landing page — independent, no dependency on wizard UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wizard step bitmask -> initialStep derivation in Server Component
    - Client wizard orchestrator (SetupWizard) with step/completedSteps state
    - Luminance heuristic for header text color contrast (0.299R + 0.587G + 0.114B)
    - CSS animation for wizard completion fade-in and checklist banner collapse
    - Reuse of wizard sub-components (LogoUploadZone, BrandColorPicker) in settings page

key-files:
  created:
    - src/app/admin/setup/page.tsx
    - src/components/wizard/SetupWizard.tsx
    - src/components/wizard/WizardLayout.tsx
    - src/components/wizard/WizardStepIndicator.tsx
    - src/components/wizard/WizardStepCard.tsx
    - src/components/wizard/StoreNameStep.tsx
    - src/components/wizard/LogoBrandStep.tsx
    - src/components/wizard/FirstProductStep.tsx
    - src/components/wizard/LogoUploadZone.tsx
    - src/components/wizard/BrandColorPicker.tsx
    - src/components/wizard/WizardCompletion.tsx
    - src/components/admin/SetupChecklist.tsx
    - src/app/admin/settings/page.tsx
    - src/app/admin/settings/BrandingForm.tsx
    - src/actions/setup/updateBranding.ts
  modified:
    - src/app/admin/dashboard/page.tsx
    - src/components/store/StorefrontHeader.tsx
    - src/app/(store)/layout.tsx

key-decisions:
  - "SetupWizard extracted as separate component (SetupWizard.tsx) from setup/page.tsx — allows Server Component page with Client Component wizard child cleanly"
  - "BrandingForm extracted to settings/BrandingForm.tsx — keeps settings/page.tsx as a Server Component"
  - "Storefront layout reads x-store-id header then falls back to null branding — header shows NZPOS fallback when no tenant context"

requirements-completed:
  - SETUP-01
  - SETUP-02
  - SETUP-03

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 14 Plan 02: Store Setup Wizard UI Summary

**11 wizard components + dashboard checklist + settings page + updateBranding Server Action + storefront branding wiring per D-16**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-03T02:46:00Z
- **Completed:** 2026-04-03T02:54:44Z
- **Tasks:** 2 of 3 (Task 3 is a human-verify checkpoint — not executed)
- **Files created:** 15
- **Files modified:** 3

## Accomplishments

### Task 1: Wizard route, wizard components, step UI
- `/admin/setup` Server Component page: reads bitmask from `setup_completed_steps`, computes `initialStep`, redirects if `setup_wizard_dismissed`
- `WizardLayout`: minimal chrome wrapping wizard (no admin sidebar), NZPOS wordmark in Satoshi 700 / navy / 20px
- `WizardStepIndicator`: amber active, navy completed (checkmark), border-only pending; connecting line fills navy when both sides complete; `aria-current="step"` on active
- `WizardStepCard`: AuthCard-pattern shell (max-w-md, shadow-md, rounded-lg, padding-xl)
- `SetupWizard`: client orchestrator — `useState` for step (1-4) and completedSteps; 1500ms auto-redirect on completion via `useRouter`
- `StoreNameStep`: pre-filled name, read-only slug, `saveStoreNameStep`, "Save & Continue" / "Skip for now"
- `LogoBrandStep`: `LogoUploadZone` + `BrandColorPicker`, `saveLogoStep`, "Save & Continue" / "Skip for now"
- `FirstProductStep`: name/price (NZD $-prefix)/category select/image upload, `saveProductStep` + `dismissWizard`, "Add Product & Finish" / "Skip — go to dashboard"
- `LogoUploadZone`: drag-drop + click-to-browse, fetch POST `/api/store/logo`, SVG passthrough, PNG/JPG, 2MB limit, preview mode with "Remove" link; `role="button"`, `aria-label="Upload logo"`, keyboard activation
- `BrandColorPicker`: 8 swatches (`#1E293B` through `#B45309`), amber 3px outline ring, `aria-pressed`, help text
- `WizardCompletion`: checkmark SVG, "Your store is ready.", body text, "Taking you there...", 250ms fade-in CSS animation

### Task 2: Dashboard checklist, settings, branding action, storefront
- `SetupChecklist`: progress banner with `role="progressbar"` / `aria-valuenow`, 5 items with checkmark/circle SVGs, "Resume setup" link; all-complete state fades out after 3s then collapses via `useState`; renders nothing while wizard is active (`!dismissed`)
- `dashboard/page.tsx`: added `getChecklistState` queries (storeData, channelOrders, productCount); `SetupChecklist` rendered as first child above Dashboard heading
- `settings/page.tsx`: `force-dynamic`, fetches `name/slug/logo_url/primary_color`, renders `BrandingForm` client component
- `BrandingForm.tsx`: reuses `LogoUploadZone` + `BrandColorPicker`, calls `updateBranding`, shows "Settings saved." on success
- `updateBranding.ts`: `'use server'` + `server-only`, `resolveAuth()`, `z.safeParse`, updates `name`/`logo_url`/`primary_color` in `stores` table
- `StorefrontHeader.tsx`: extended with `BrandingInfo` prop — renders logo `<img>` if `logoUrl`, else `storeName`, else "NZPOS" fallback; applies `primaryColor` as header background; luminance heuristic (0.299R + 0.587G + 0.114B) / 255 < 0.5 → white text, else navy
- `(store)/layout.tsx`: reads `x-store-id` from request headers, queries `stores` for branding, passes `branding` prop to `StorefrontHeader`

## Task Commits

1. **Task 1: Wizard route, wizard components, and step UI** - `ce06345` (feat)
2. **Task 2: Dashboard setup checklist, admin settings page, updateBranding action, and storefront branding wiring** - `c7a9d91` (feat)

## Decisions Made

- **SetupWizard extracted as separate component:** The Server Component page (`setup/page.tsx`) cannot use `useState`/`useEffect`. Extracted `SetupWizard` as a `'use client'` component that receives `initialStep`, `storeData`, and `categories` as props. This avoids marking the entire page as a client component.
- **BrandingForm extracted to settings/BrandingForm.tsx:** Keeps `settings/page.tsx` as a Server Component for data fetching while the interactive form is a client component.
- **Storefront branding falls back gracefully:** If `x-store-id` header is missing (root domain, dev environment), `branding` is `null` and the header shows "NZPOS" as fallback — no errors.

## Deviations from Plan

None — plan executed as written. All acceptance criteria met.

## Known Stubs

None. All wiring is connected end-to-end:
- Wizard calls real Server Actions (saveStoreNameStep, saveLogoStep, saveProductStep, dismissWizard)
- SetupChecklist reads real `getChecklistState` output derived from live DB queries
- StorefrontHeader receives real branding from stores table via x-store-id header
- updateBranding persists to the stores table

## Next Phase Readiness

- Wizard and checklist UI are complete — Plan 14-03 (marketing landing page) is independent and not blocked
- Task 3 is a human-verify checkpoint — requires visual QA before marking plan complete

## Self-Check: PASSED

All 19 files exist on disk. Both task commits verified:
- `ce06345` — feat(14-02): wizard route, wizard components, and step UI
- `c7a9d91` — feat(14-02): dashboard checklist, settings page, branding action, storefront wiring

---
*Phase: 14-store-setup-wizard-marketing*
*Completed: 2026-04-03*
