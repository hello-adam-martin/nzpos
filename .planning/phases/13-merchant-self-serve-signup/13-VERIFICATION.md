---
phase: 13-merchant-self-serve-signup
verified: 2026-04-03T14:13:00Z
status: human_needed
score: 5/5 must-haves verified (all automated checks pass; one item requires human end-to-end test)
human_verification:
  - test: "Complete signup flow end-to-end: form -> provisioning -> email verify -> dashboard"
    expected: "New merchant can sign up, receive a verification email, click it, and land on their store's admin dashboard at {slug}.{domain}/admin/dashboard"
    why_human: "The full PKCE callback + subdomain redirect chain requires a running local dev environment (npm run dev + supabase start + Inbucket). Cannot be verified with static code analysis alone."
---

# Phase 13: Merchant Self-Serve Signup Verification Report

**Phase Goal:** A merchant can visit the signup page, enter their email and store slug, and land on a working admin dashboard within minutes
**Verified:** 2026-04-03T14:13:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria from ROADMAP.md

The phase has 5 success criteria from the roadmap. All 5 are verified at the code level.

| # | Success Criterion | Status | Evidence |
|---|------------------|--------|----------|
| 1 | New merchant completes signup and is redirected to working admin dashboard | ✓ VERIFIED | ownerSignup calls provision_store RPC, returns `{ success: true, slug }`, SignupForm navigates to /signup/provisioning, ProvisioningScreen redirects to `{slug}.{rootDomain}/admin/dashboard` |
| 2 | If provisioning fails mid-flight, merchant sees "provisioning failed — retry" screen | ✓ VERIFIED | ownerSignup deletes orphaned auth user and returns `{ error: { _form: [...] } }`; SignupForm would redirect with `status=failed`; ProvisioningScreen renders failure state with retryProvisioning wired to retry button |
| 3 | Merchant cannot access dashboard until email is verified | ✓ VERIFIED | middleware.ts checks `email_confirmed_at != null` in the `/admin` branch, redirects unverified users to `{rootDomain}/signup/verify-email`; confirmed by 2 passing middleware tests |
| 4 | Reserved slug returns validation error before any DB write | ✓ VERIFIED | OwnerSignupSchema uses SlugSchema which calls validateSlug; Zod parse fails before signUp is called; ownerSignup test confirms `mockSignUp` not called for reserved slugs |
| 5 | Second store from same verified email is blocked | ✓ VERIFIED | ownerSignup returns `{ error: { email: ['An account already exists for this email.'] } }` on Supabase "User already registered" error, before RPC is called |

**Score:** 5/5 success criteria verified at code level

---

### Observable Truths (derived from plans)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | provision_store RPC creates store + staff + store_plans atomically and rolls back on failure | ✓ VERIFIED | `supabase/migrations/017_provision_store_rpc.sql` — single function with DECLARE/BEGIN/INSERT×3/RETURN; EXCEPTION block raises SLUG_TAKEN or PROVISION_FAILED; all within one PL/pgSQL transaction |
| 2 | Reserved slugs are rejected by validateSlug() | ✓ VERIFIED | `src/lib/slugValidation.ts` — RESERVED_SLUGS has 26 entries including all required 8 (admin, www, api, app, signup, login, support, billing); 24 passing tests confirm all rejection cases |
| 3 | Rate limiter blocks after 5 attempts from the same IP within 1 hour | ✓ VERIFIED | `src/lib/signupRateLimit.ts` — WINDOW_MS=3600000, MAX_ATTEMPTS=5; 5 passing tests including window-expiry and cross-IP isolation |
| 4 | ownerSignup creates auth user then calls provision_store RPC and deletes auth user if RPC fails | ✓ VERIFIED | `src/actions/auth/ownerSignup.ts` line 62-78 — calls `admin.rpc('provision_store', {...})`, on failure calls `admin.auth.admin.deleteUser(authData.user.id)`; 11 tests confirm all paths |
| 5 | Middleware redirects unverified users on /admin to /signup/verify-email on root domain | ✓ VERIFIED | `src/middleware.ts` lines 71-79 — `email_confirmed_at != null` check inside `pathname.startsWith('/admin')` block; 4 middleware tests confirm correct behavior |
| 6 | Auth callback exchanges PKCE code, looks up store slug, and redirects to {slug}.{domain}/admin/dashboard | ✓ VERIFIED | `src/app/api/auth/callback/route.ts` — `exchangeCodeForSession`, then `admin.from('stores').select('slug').eq('owner_auth_id', data.user.id).single()`, constructs subdomain redirect |
| 7 | Merchant can fill 4 fields and submit the signup form | ✓ VERIFIED | `src/components/signup/SignupForm.tsx` — email, password, storeName, SlugInput fields; action={formAction} wired to ownerSignup via useActionState |
| 8 | Slug auto-populates from store name and live availability check shows green/red indicator | ✓ VERIFIED | SignupForm.tsx `handleStoreNameBlur` calls `slugify()`; SlugInput.tsx fires `checkSlugAvailability` via 400ms debounce with green/red SVG indicators and aria-live |

---

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `supabase/migrations/017_provision_store_rpc.sql` | ✓ VERIFIED | Exists, 46 lines; contains SECURITY DEFINER, all 3 INSERTs, GRANT/REVOKE, SLUG_TAKEN/PROVISION_FAILED exceptions |
| `src/lib/slugValidation.ts` | ✓ VERIFIED | Exists, 112 lines; exports RESERVED_SLUGS, SLUG_REGEX, validateSlug, slugify, SlugSchema |
| `src/lib/signupRateLimit.ts` | ✓ VERIFIED | Exists, 51 lines; exports checkRateLimit, resetRateLimit; WINDOW_MS=3600000, MAX_ATTEMPTS=5 |
| `src/lib/slugValidation.test.ts` | ✓ VERIFIED | Exists, 133 lines; 24 tests, all passing |
| `src/lib/signupRateLimit.test.ts` | ✓ VERIFIED | Exists, 68 lines; 5 tests including window-expiry mock, all passing |
| `src/actions/auth/ownerSignup.ts` | ✓ VERIFIED | Exists, 84 lines; 'use server', Zod schema, rate limit, signUp, provision_store RPC, deleteUser on failure, refreshSession |
| `src/actions/auth/checkSlugAvailability.ts` | ✓ VERIFIED | Exists, 33 lines; 'use server', validateSlug + DB maybeSingle |
| `src/actions/auth/retryProvisioning.ts` | ✓ VERIFIED | Exists, 74 lines; 'use server', idempotent RPC re-run with existing-store check |
| `src/actions/auth/resendVerification.ts` | ✓ VERIFIED | Exists; emailRedirectTo points to `/api/auth/callback` |
| `src/app/api/auth/callback/route.ts` | ✓ VERIFIED | Exists, 46 lines; GET handler, exchangeCodeForSession, owner_auth_id lookup, subdomain redirect |
| `src/middleware.ts` | ✓ VERIFIED | email_confirmed_at gate at lines 71-79, inside `/admin` branch only |
| `src/actions/auth/__tests__/ownerSignup.test.ts` | ✓ VERIFIED | Exists, 202 lines; 11 tests all passing; uses vi.hoisted() mocks |
| `src/middleware.test.ts` | ✓ VERIFIED | Exists, 175 lines; 4 tests all passing |
| `src/components/signup/AuthCard.tsx` | ✓ VERIFIED | Exists; max-w-sm, min-h-screen, color-bg |
| `src/components/signup/SignupForm.tsx` | ✓ VERIFIED | Exists; 'use client', ownerSignup, slugify, SlugInput, "Create my store", /signup/provisioning navigation |
| `src/components/signup/SlugInput.tsx` | ✓ VERIFIED | Exists; 'use client', checkSlugAvailability, 400ms debounce (setTimeout), aria-live="polite", nzpos.co.nz preview, color-success, color-error |
| `src/components/signup/ProvisioningScreen.tsx` | ✓ VERIFIED | Exists; 'use client', retryProvisioning, step animation, admin/dashboard redirect, "Retry provisioning" button |
| `src/components/signup/ProvisioningStepList.tsx` | ✓ VERIFIED | Exists; role="list", aria-current="step", "Creating your account", "Provisioning your store", "Preparing your dashboard", animate-spin |
| `src/components/signup/VerifyEmailCard.tsx` | ✓ VERIFIED | Exists; 'use client', resendVerification, "Check your email", "Resend verification email", "Wrong email? Sign out", 30-second cooldown |
| `src/app/signup/page.tsx` | ✓ VERIFIED | Exists; AuthCard, SignupForm, "Start your free store" heading |
| `src/app/signup/provisioning/page.tsx` | ✓ VERIFIED | Exists; ProvisioningScreen with searchParams |
| `src/app/signup/verify-email/page.tsx` | ✓ VERIFIED | Exists; AuthCard, VerifyEmailCard |
| `supabase/config.toml` | ✓ VERIFIED | enable_confirmations = true (line 211, in [auth] section; second occurrence on line 246 is in [auth.sms] — correct) |
| `src/types/database.ts` | ✓ VERIFIED | Contains provision_store at line 950 |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| ownerSignup.ts | provision_store RPC | `admin.rpc('provision_store', ...)` | ✓ WIRED | Line 62 of ownerSignup.ts |
| ownerSignup.ts | signupRateLimit.ts | `checkRateLimit(ip)` | ✓ WIRED | Lines 22-25 of ownerSignup.ts |
| ownerSignup.ts | slugValidation.ts | `SlugSchema` in OwnerSignupSchema | ✓ WIRED | Line 13 of ownerSignup.ts |
| middleware.ts | email_confirmed_at | `user.email_confirmed_at != null` | ✓ WIRED | Lines 71-79 of middleware.ts; inside pathname.startsWith('/admin') block |
| auth/callback/route.ts | stores table | `admin.from('stores').select('slug').eq('owner_auth_id', ...)` | ✓ WIRED | Lines 32-36 of callback/route.ts |
| SignupForm.tsx | ownerSignup.ts | useActionState wrapping ownerSignup | ✓ WIRED | Lines 26-32 of SignupForm.tsx |
| SlugInput.tsx | checkSlugAvailability.ts | 400ms debounce in useEffect | ✓ WIRED | Lines 38-42 of SlugInput.tsx |
| ProvisioningScreen.tsx | retryProvisioning.ts | useActionState + form action | ✓ WIRED | Lines 34-37, 133 of ProvisioningScreen.tsx |
| VerifyEmailCard.tsx | resendVerification.ts | `resendVerification(formData)` in handleResend | ✓ WIRED | Lines 42 of VerifyEmailCard.tsx |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| SignupForm.tsx | `state` (action result) | ownerSignup Server Action | Yes — Zod validation + Supabase signUp + RPC call | ✓ FLOWING |
| SlugInput.tsx | `status` / `reason` | checkSlugAvailability Server Action | Yes — validateSlug() + DB maybeSingle | ✓ FLOWING |
| ProvisioningScreen.tsx | `slug` prop | URL searchParam from /signup/provisioning?slug= | Yes — set by SignupForm after successful ownerSignup | ✓ FLOWING |
| VerifyEmailCard.tsx | `email` prop | URL searchParam on /signup/verify-email?email= | Yes — set by middleware redirect after email_confirmed_at check | ✓ FLOWING |

---

### Behavioral Spot-Checks

Tests were run directly against the compiled modules:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| validateSlug rejects reserved slugs | `npm run test src/lib/slugValidation.test.ts` | 24/24 pass | ✓ PASS |
| checkRateLimit blocks after 5 attempts | `npm run test src/lib/signupRateLimit.test.ts` | 5/5 pass | ✓ PASS |
| ownerSignup validates, rate-limits, calls RPC, cleans up orphans | `npm run test src/actions/auth/__tests__/ownerSignup.test.ts` | 11/11 pass | ✓ PASS |
| Middleware email gate redirects unverified users | `npm run test src/middleware.test.ts` | 4/4 pass | ✓ PASS |
| End-to-end PKCE callback + subdomain redirect | Not runnable without live server | Cannot verify statically | ? SKIP — see Human Verification |

---

### Requirements Coverage

All 5 requirement IDs appear in the plan frontmatter and have been cross-referenced against REQUIREMENTS.md.

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| SIGNUP-01 | 13-02, 13-03 | Merchant can sign up with email and password and get a provisioned store automatically | ✓ SATISFIED | ownerSignup creates auth user + calls provision_store RPC; SignupForm submits form and navigates to provisioning screen |
| SIGNUP-02 | 13-01, 13-02 | Store provisioning is atomic (auth user + store + staff + store_plans in one transaction) | ✓ SATISFIED | 017_provision_store_rpc.sql: single PL/pgSQL function, all 3 INSERTs in one BEGIN block, EXCEPTION rolls back on failure; auth user deletion on RPC failure prevents orphan state |
| SIGNUP-03 | 13-01, 13-02, 13-03 | Merchant must verify email before accessing the dashboard | ✓ SATISFIED | enable_confirmations=true in config.toml; middleware email_confirmed_at gate on /admin; /signup/verify-email page; resendVerification action |
| SIGNUP-04 | 13-01 | Reserved slugs (admin, www, api, app, etc.) are blocked during signup | ✓ SATISFIED | RESERVED_SLUGS (26 entries), validateSlug(), SlugSchema; all rejection cases tested |
| SIGNUP-05 | 13-01, 13-02 | Signup is rate-limited (1 store per verified email, throttled requests) | ✓ SATISFIED | checkRateLimit (5/hour per IP) called before any DB write in ownerSignup; "already registered" check enforces 1-store-per-email |

REQUIREMENTS.md traceability table lists all 5 SIGNUP-xx requirements mapped to Phase 13 with status Complete. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/components/signup/ProvisioningScreen.tsx | 56-72 | Step animation on mount is a UX affordance — provisioning already completed server-side | ℹ️ Info | Intentional design decision per plan spec; not a stub. The slug param in the URL signals success. |

No blockers or warnings found. The "animation as affordance" pattern is explicitly documented in 13-03-SUMMARY.md and the plan spec.

---

### TypeScript Compilation

`npx tsc --noEmit` reports 2 pre-existing errors from other phases:
- `src/actions/orders/completeSale.ts:107` — pre-existing `receipt_data` type mismatch (Phase 8)
- `src/lib/__tests__/schema.test.ts:29,41` — pre-existing `slug`/`has_xero` type narrowing issue (Phase 12)

Zero new TypeScript errors introduced by Phase 13 code.

---

### Human Verification Required

#### 1. End-to-End Signup Flow (blocking for full pass)

**Test:** Start local dev environment (`npm run dev` + `npx supabase start`), then:
1. Visit `http://lvh.me:3000/signup`
2. Fill in email, password, store name; verify slug auto-populates on blur
3. Type `admin` in slug field — verify red X and "reserved" message appears
4. Type a valid unique slug — verify green checkmark and "is available" message
5. Submit the form — verify "Creating your store..." spinner, then redirect to `/signup/provisioning`
6. Verify 3 animated steps appear and complete
7. Verify redirect to `{slug}.lvh.me:3000/admin/dashboard` triggers the email verification gate
8. Visit `http://127.0.0.1:54324` (Inbucket), find verification email, click the link
9. Verify landing on `{slug}.lvh.me:3000/admin/dashboard` fully authenticated

**Expected:** All steps work without error; dashboard is functional for the new store.

**Why human:** The PKCE callback route (`/api/auth/callback`) requires a real Supabase session and a live Next.js server to exchange the PKCE code. The subdomain redirect (`NextResponse.redirect` to `{slug}.lvh.me:3000/admin/dashboard`) requires a browser that follows the redirect to a different subdomain. Cannot be verified with grep or unit tests.

---

### Gaps Summary

No gaps found. All automated verification checks pass:
- 29/29 unit tests for slug validation and rate limiter
- 11/11 unit tests for ownerSignup Server Action
- 4/4 unit tests for middleware email verification gate
- All 22 phase artifacts exist and are substantive (no stubs, no placeholders)
- All 9 key links verified (wired, not orphaned)
- All 5 data flows traced to real sources
- All 5 requirements (SIGNUP-01 through SIGNUP-05) satisfied with implementation evidence
- TypeScript errors are pre-existing from prior phases (0 new errors)

The single human_needed item is the end-to-end PKCE callback flow, which requires a running local dev environment. This is not a gap in the implementation — it is a limitation of static verification.

---

_Verified: 2026-04-03T14:13:00Z_
_Verifier: Claude (gsd-verifier)_
