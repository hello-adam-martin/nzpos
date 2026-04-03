# Phase 10: Customer Accounts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 10-customer-accounts
**Areas discussed:** Account creation & login UX, Order history & profile pages, Auth integration & POS blocking, Email verification & password reset

---

## Account Creation & Login UX

### Login/Signup Location

| Option | Description | Selected |
|--------|-------------|----------|
| Header account icon | Small user icon in StorefrontHeader, click opens login/signup. After login, shows account dropdown. | ✓ |
| Dedicated /account page | Separate page with login/signup tabs. Header links to it. | |
| Slide-out drawer | Like the cart drawer, login/signup slides in from the side. | |

**User's choice:** Header account icon
**Notes:** Standard e-commerce pattern, minimal footprint.

### Guest Checkout Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Guest checkout allowed | Customers can buy without account. Post-purchase prompt to create account. | ✓ |
| Account required | Must sign up before completing checkout. | |
| You decide | Claude picks based on best practices. | |

**User's choice:** Guest checkout allowed
**Notes:** Low friction, higher conversion. Offer "Create account to track this order?" after purchase.

### Signup Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password only | Minimal signup. Name collected later in profile. | ✓ |
| Email + password + name | Require full name at signup. | |
| Email + password + name + phone | Also collect phone for future SMS. | |

**User's choice:** Email + password only
**Notes:** Lowest friction signup.

### Social Login

| Option | Description | Selected |
|--------|-------------|----------|
| Email/password only | Supabase email auth only. Simple. | |
| Add Google sign-in | Google OAuth via Supabase. | |
| Defer to v2 | Build email-only now, add social login later if requested. | ✓ |

**User's choice:** Defer to v2
**Notes:** Not critical for supplies store. Revisit based on customer demand.

---

## Order History & Profile Pages

### Order History Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Simple card list | Each order as a card: date, total, status, item count. Click to expand. | ✓ |
| Table layout | Spreadsheet-style with sortable columns. | |
| Timeline view | Chronological timeline with order milestones. | |

**User's choice:** Simple card list
**Notes:** Clean, scannable, mobile-friendly.

### Order Detail Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full line items + receipt | All items, quantities, prices, discounts, GST, payment method, status history. | ✓ |
| Summary only | Just total, date, status, item count. | |
| You decide | Claude picks appropriate detail level. | |

**User's choice:** Full line items + receipt
**Notes:** Mirrors receipt email for consistency.

### Profile Page Content

| Option | Description | Selected |
|--------|-------------|----------|
| Name, email, password change | Basic profile management. | |
| Add phone + address | Also collect phone and address for future delivery. | |
| Add preferences too | Include notification preferences (receipt opt-in, marketing opt-in). | ✓ |

**User's choice:** Add preferences too
**Notes:** CUST-03 explicitly mentions preferences.

### Preference Types

| Option | Description | Selected |
|--------|-------------|----------|
| Email receipt opt-in/out | Single toggle for automatic email receipts. | |
| Email receipt + marketing opt-in | Receipt toggle plus separate marketing email opt-in. | ✓ |
| You decide | Claude picks sensible defaults. | |

**User's choice:** Email receipt + marketing opt-in
**Notes:** Two separate toggles. Prepares for future promotional emails.

---

## Auth Integration & POS Blocking

### Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| New customers table | Separate table. Auth hook checks customers after staff. | ✓ |
| Reuse staff table | Add customer records to staff with role='customer'. | |
| You decide | Claude picks the data model. | |

**User's choice:** New customers table
**Notes:** Clean separation from staff. Dedicated customers table with auth_user_id, store_id, name, email, preferences.

### POS/Admin Blocking

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to storefront home | Silently redirect to '/'. No error. | ✓ |
| Show unauthorized page | Redirect to /unauthorized with message. | |
| You decide | Claude picks blocking behavior. | |

**User's choice:** Redirect to storefront home
**Notes:** No error message — customers just land back on the shop.

### Order Linking

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-link by email | Find past orders matching customer_email, link on account creation. | ✓ |
| Only new orders | Only orders placed while logged in appear in history. | |
| You decide | Claude picks the approach. | |

**User's choice:** Auto-link by email
**Notes:** Instant order history from day one. Uses existing customer_email column.

---

## Email Verification & Password Reset

### Verification Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase built-in email confirm | Native Supabase Auth verification link. Minimal custom code. | ✓ |
| Custom magic link via Resend | Verification through existing Resend infrastructure. | |
| You decide | Claude picks verification approach. | |

**User's choice:** Supabase built-in email confirm
**Notes:** Supabase handles token generation and validation.

### Unverified Customer Access

| Option | Description | Selected |
|--------|-------------|----------|
| Full access, nudge to verify | Can browse, buy, view orders. Persistent "Verify your email" banner. | ✓ |
| Block checkout until verified | Must verify before placing orders. | |
| You decide | Claude picks the approach. | |

**User's choice:** Full access, nudge to verify
**Notes:** Don't lose sales over verification. Banner with resend link.

### Password Reset

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase built-in reset | Native Supabase Auth password reset flow. | ✓ |
| Custom reset via Resend | Custom flow using Resend for email. | |
| You decide | Claude picks reset approach. | |

**User's choice:** Supabase built-in reset
**Notes:** Standard Supabase-managed flow.

---

## Claude's Discretion

- Customer account route structure
- Supabase email template customization
- Account dropdown component design
- Post-purchase account creation prompt UX
- Order linking migration/RPC implementation
- RLS policies for customer data isolation
- Customers table schema details

## Deferred Ideas

- Social login (Google, Apple) — v2
- Phone number and address collection — future delivery feature
- Repeat order button — needs real usage data first
