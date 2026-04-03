---
phase: 13-merchant-self-serve-signup
plan: 03
subsystem: ui
tags: [react, next-js, tailwind, signup, forms, accessibility]

requires:
  - phase: 13-02
    provides: ownerSignup, checkSlugAvailability, retryProvisioning, resendVerification Server Actions, PKCE callback, email verification middleware gate

provides:
  - AuthCard reusable centered card shell
  - SignupForm 4-field form with slug auto-generation and live availability check
  - SlugInput with debounced availability check (400ms), green/red indicators, aria-live
  - ProvisioningStepList animated 3-step progress with accessible roles
  - ProvisioningScreen with success animation, auto-redirect to store dashboard, failure/retry state
  - VerifyEmailCard with resend button, 30-second cooldown, sign-out link
  - /signup page rendering brand mark + heading + SignupForm
  - /signup/provisioning page rendering ProvisioningScreen (full-screen)
  - /signup/verify-email page rendering VerifyEmailCard in AuthCard

affects:
  - Phase 14 (billing/subscription UI will follow same AuthCard + form patterns)
  - Phase 15 (merchant admin UI patterns established here)

tech-stack:
  added: []
  patterns:
    - "AuthCard: presentational Server Component wrapper — no 'use client' needed for layout shells"
    - "SlugInput: useEffect + setTimeout debounce (400ms) for API availability checks"
    - "SignupForm: useActionState wrapping Server Action, router.push on success with slug from action result"
    - "ProvisioningScreen: UX animation through steps on mount (provisioning already done in Server Action), then redirect to subdomain"
    - "VerifyEmailCard: resend cooldown timer via setInterval, aria-label updates with countdown"

key-files:
  created:
    - src/components/signup/AuthCard.tsx
    - src/components/signup/SignupForm.tsx
    - src/components/signup/SlugInput.tsx
    - src/components/signup/ProvisioningScreen.tsx
    - src/components/signup/ProvisioningStepList.tsx
    - src/components/signup/VerifyEmailCard.tsx
    - src/app/signup/page.tsx
    - src/app/signup/provisioning/page.tsx
    - src/app/signup/verify-email/page.tsx
  modified: []

key-decisions:
  - "ProvisioningScreen animates through steps as UX affordance — actual provisioning already completed in ownerSignup Server Action before redirect"
  - "Subdomain redirect uses NEXT_PUBLIC_ROOT_DOMAIN env var with lvh.me fallback for local dev; protocol auto-detected based on domain"

patterns-established:
  - "Signup UI pattern: AuthCard > brand mark (font-display 3xl semibold navy) + heading (2xl) + form"
  - "Provisioning redirect: {protocol}://{slug}.{rootDomain}/admin/dashboard constructed client-side from NEXT_PUBLIC_ROOT_DOMAIN"
  - "Ghost button variant: border border-[var(--color-border)] bg-white text-[var(--color-navy)] for secondary CTAs"

requirements-completed: [SIGNUP-01, SIGNUP-03]

duration: ~45min (Tasks 1+2) + human verification
completed: 2026-04-03
---

# Phase 13 Plan 03: Signup UI Screens Summary

**Three merchant signup screens (form + provisioning + email verification) with slug availability check, step animation, and subdomain redirect — complete self-serve signup flow end-to-end**

## Performance

- **Duration:** ~45 min (code) + human verification checkpoint
- **Started:** 2026-04-03T01:00:00Z
- **Completed:** 2026-04-03
- **Tasks:** 3 (2 code + 1 human-verify checkpoint)
- **Files modified:** 9 created

## Accomplishments

- Complete self-serve signup flow: 4-field form at `/signup` → provisioning animation at `/signup/provisioning` → email gate at `/signup/verify-email` → store admin dashboard
- `SlugInput` component with 400ms debounced `checkSlugAvailability` call, green checkmark / red X visual feedback, `aria-live="polite"` region, and `{slug}.nzpos.co.nz` preview helper text
- `ProvisioningScreen` animates through 3 steps as a UX affordance (provisioning already happened in the Server Action), then redirects to `{slug}.{rootDomain}/admin/dashboard`. Failure state shows retry button wired to `retryProvisioning` Server Action
- `VerifyEmailCard` shows resend button with 30-second cooldown countdown, "Wrong email? Sign out" link, and status states (sending / sent / rate-limited)
- All screens verified working by human QA: form renders, slug auto-populates, availability check works (green checkmark), verify-email shows correctly, provisioning error state renders with retry button

## Task Commits

1. **Task 1: AuthCard shell + SignupForm + SlugInput + signup page** - `b066492` (feat)
2. **Task 2: ProvisioningScreen + VerifyEmailCard + remaining pages** - `79f4732` (feat)
3. **Task 3: Visual and functional verification** — human-approved (no commit — verification only)

## Files Created/Modified

- `src/components/signup/AuthCard.tsx` — Reusable centered card shell (Server Component, no 'use client')
- `src/components/signup/SignupForm.tsx` — 4-field form, slug auto-generation on store name blur, useActionState wrapping ownerSignup
- `src/components/signup/SlugInput.tsx` — Debounced availability check, green/red indicators, aria-live region
- `src/components/signup/ProvisioningScreen.tsx` — Step animation, auto-redirect, retry on failure
- `src/components/signup/ProvisioningStepList.tsx` — Animated 3-step list with spinner/checkmark/idle states, role="list", aria-current
- `src/components/signup/VerifyEmailCard.tsx` — Resend with 30s cooldown, sign-out link
- `src/app/signup/page.tsx` — Brand mark + heading + SignupForm in AuthCard
- `src/app/signup/provisioning/page.tsx` — Full-screen ProvisioningScreen (no AuthCard wrapper)
- `src/app/signup/verify-email/page.tsx` — Brand mark + VerifyEmailCard in AuthCard

## Decisions Made

- `ProvisioningScreen` animates through steps as a UX affordance on mount. The actual provisioning was already completed inside `ownerSignup` before the client was redirected. This avoids a polling loop and keeps the provisioning page purely presentational.
- Subdomain redirect builds the URL client-side using `NEXT_PUBLIC_ROOT_DOMAIN` with `lvh.me:3000` as the local dev fallback. Protocol is auto-detected (`http` for lvh.me/localhost, `https` otherwise).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all interactive components are fully wired to their Server Actions. The provisioning animation is intentionally presentational (not a polling stub) per plan spec.

## Self-Check: PASSED

- `src/components/signup/AuthCard.tsx` — FOUND (confirmed contains "max-w-sm", "min-h-screen", "color-bg")
- `src/components/signup/SignupForm.tsx` — FOUND (confirmed contains "ownerSignup", "slugify", "SlugInput", "Create my store")
- `src/components/signup/SlugInput.tsx` — FOUND (confirmed contains "checkSlugAvailability", "aria-live", "nzpos.co.nz")
- `src/components/signup/ProvisioningScreen.tsx` — FOUND (confirmed contains "retryProvisioning", "admin/dashboard")
- `src/components/signup/VerifyEmailCard.tsx` — FOUND (confirmed contains "resendVerification", "Check your email", "30")
- `src/app/signup/page.tsx` — FOUND
- `src/app/signup/provisioning/page.tsx` — FOUND
- `src/app/signup/verify-email/page.tsx` — FOUND
- Commit `b066492` — FOUND
- Commit `79f4732` — FOUND
- Human QA verification — APPROVED: all three screens verified working with no console errors

## Next Phase Readiness

- Complete merchant self-serve signup flow is live end-to-end (Phase 13 complete)
- Phase 14 (billing/add-ons) can proceed — auth pipeline is in place, store provisioning creates the store record needed for billing attachment
- `AuthCard` pattern is available for any future auth-adjacent screens (password reset, account settings, etc.)
- Transactional email provider (Resend) still needed for production — currently using Inbucket (local dev only)

---
*Phase: 13-merchant-self-serve-signup*
*Completed: 2026-04-03*
