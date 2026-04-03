# Phase 13: Merchant Self-Serve Signup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 13-merchant-self-serve-signup
**Areas discussed:** Signup flow & UX, Provisioning & error handling, Email verification gate, Rate limiting & reserved slugs

---

## Signup Flow & UX

### Signup Form Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: 3 fields | Email, password, store slug. Store name auto-derived from slug. | |
| Standard: 4 fields | Email, password, store name, store slug. Slug auto-generated from store name with edit option. | ✓ |
| You decide | Claude picks what makes sense for a fast self-serve signup | |

**User's choice:** Standard: 4 fields
**Notes:** None

### Slug Availability Check

| Option | Description | Selected |
|--------|-------------|----------|
| Live check | Debounced API call on keystroke shows green checkmark or 'taken' inline. Standard SaaS pattern. | ✓ |
| Check on submit only | Validates slug when form is submitted. Error message if taken, user re-enters. | |
| You decide | Claude picks the approach | |

**User's choice:** Live check
**Notes:** None

### Signup Page Location

| Option | Description | Selected |
|--------|-------------|----------|
| Root domain /signup | Lives at nzpos.co.nz/signup alongside the marketing page. Already have a placeholder. | ✓ |
| Dedicated subdomain | signup.nzpos.co.nz — separate from store subdomains. | |
| You decide | Claude picks what fits the existing routing | |

**User's choice:** Root domain /signup
**Notes:** None

---

## Provisioning & Error Handling

### Atomicity Approach

| Option | Description | Selected |
|--------|-------------|----------|
| DB transaction via RPC | Single Postgres function (provision_store) that creates store + staff + store_plans in one transaction. Auth user created first, then RPC. If RPC fails, delete auth user. | ✓ |
| Sequential inserts with cleanup | Insert one-by-one with admin client. Manual cleanup on failure. Simpler code, partial states possible. | |
| You decide | Claude picks the atomicity approach | |

**User's choice:** DB transaction via RPC
**Notes:** None

### Loading UX During Provisioning

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to loading page | Redirect to /signup/provisioning with spinner/progress steps. Polls for completion, then redirects to store subdomain. | ✓ |
| Inline loading on form | Button shows spinner, form stays visible. On success, redirect directly. | |
| You decide | Claude picks what works | |

**User's choice:** Redirect to loading page
**Notes:** None

### Retry on Provisioning Failure

| Option | Description | Selected |
|--------|-------------|----------|
| Retry button on error screen | Clear error message with 'Retry provisioning' button. Auth user already exists, retry only re-runs DB provisioning. | ✓ |
| Back to signup form | Redirect back to signup with error. System detects existing auth user and skips auth creation. | |
| You decide | Claude picks the approach | |

**User's choice:** Retry button on error screen
**Notes:** None

---

## Email Verification Gate

### Gate Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Hard gate | Cannot access admin dashboard until email verified. Middleware checks email_confirmed_at. | ✓ |
| Soft gate with nudge | Can access dashboard immediately, persistent banner, locked out after 24-48 hours if not verified. | |
| You decide | Claude picks what fits the requirements | |

**User's choice:** Hard gate
**Notes:** None

### Post-Verification Landing

| Option | Description | Selected |
|--------|-------------|----------|
| Their store's admin dashboard | Verification link redirects to {slug}.domain/admin/dashboard. First real interaction with store. | ✓ |
| Root domain confirmation page | 'Email verified! Your store is ready' page with button to dashboard. | |
| You decide | Claude picks the landing page | |

**User's choice:** Their store's admin dashboard
**Notes:** None

### Verification Screen Contents

| Option | Description | Selected |
|--------|-------------|----------|
| Resend + change email | Shows 'We sent a verification email to {email}' with Resend button and 'Wrong email? Change it' link. | ✓ |
| Resend only | Just a resend button. Typo'd email requires re-signup. | |
| You decide | Claude picks the screen contents | |

**User's choice:** Resend + change email
**Notes:** None

---

## Rate Limiting & Reserved Slugs

### Reserved Slug Management

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded list in code | TypeScript constant array. Checked in slug validation function. Version-controlled. | ✓ |
| Database table | reserved_slugs table in Postgres. More flexible but overkill for a short list. | |
| You decide | Claude picks the approach | |

**User's choice:** Hardcoded list in code
**Notes:** None

### Slug Validation Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Strict: 3-30 chars, lowercase alphanumeric + hyphens | Must start with a letter, no consecutive hyphens, no leading/trailing hyphens. | ✓ |
| Relaxed: 2-50 chars, alphanumeric + hyphens | More permissive — allows shorter and longer slugs. | |
| You decide | Claude picks sensible rules | |

**User's choice:** Strict: 3-30 chars, lowercase alphanumeric + hyphens
**Notes:** None

### Rate Limiting Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action level | Max 5 attempts per IP per hour, 1 store per verified email. In-memory rate limiter. | ✓ |
| Middleware level | Rate limit at Next.js middleware for /signup and /api routes. Broader but more complex. | |
| You decide | Claude picks the rate limiting approach | |

**User's choice:** Server Action level
**Notes:** None

---

## Claude's Discretion

- Exact reserved slug list contents
- Loading page animation/design
- Exact error messages and copy
- Slug availability check debounce timing
- In-memory rate limiter implementation details
- Polling vs SSE for provisioning status
- Verification email template customization

## Deferred Ideas

None — discussion stayed within phase scope.
