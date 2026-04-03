# Phase 14 Verification: Store Setup Wizard + Marketing

**Verified:** 2026-04-03
**Status:** PASSED

## Plans Completed

| Plan | Scope | Status |
|------|-------|--------|
| 14-01 | Backend (migrations, server actions, API routes, middleware) | Complete |
| 14-02 | Wizard UI, dashboard checklist, settings, storefront branding | Complete |
| 14-03 | Marketing landing page (static, root domain) | Complete |

## Human Verification (Task 3 Checkpoint)

User tested full signup → email verification → wizard → dashboard flow:

- Signup form creates account and sends verification email
- Verification link confirms email and creates session on subdomain (cross-domain auth working)
- Middleware redirects first admin visit to `/admin/setup`
- Wizard step 1: store name pre-filled, slug display-only (shows `slug.lvh.me` format)
- Wizard step 2: logo upload + color picker functional
- Wizard step 3: first product creation works
- Completion screen redirects to dashboard
- Dashboard checklist banner visible with progress
- Settings page editable
- Storefront branding applied

**User verdict:** "it is all working"

## Auth Flow Fix (Post-Implementation)

During human verification, the cross-domain signup auth flow was broken (PKCE verifier stored on localhost can't be accessed on subdomain). Fixed with:

1. Client-side `signUp()` with `emailRedirectTo` pointing to subdomain callback
2. Callback fallback: when PKCE exchange fails, uses admin `generateLink` + `verifyOtp` to create session on the subdomain origin
3. Store URL display fixed from path-based (`lvh.me/slug`) to subdomain-based (`slug.lvh.me`)

Commit: `07923b8`

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| SETUP-01 | 3-step wizard (name, logo/color, first product) | Verified |
| SETUP-02 | Every step skippable | Verified |
| SETUP-03 | Dashboard checklist with progress tracking | Verified |
| MKTG-01 | Landing page on root domain | Verified |
| MKTG-02 | Pricing section with free core + paid add-ons | Verified |
