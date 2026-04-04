# Phase 23: Feature Gating + POS/Storefront Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 23-feature-gating-pos-storefront-integration
**Areas discussed:** Gating UX, Billing activation, Stock badge behavior, Super admin override

---

## Gating UX

### Upgrade wall behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade wall page | Show page shell with centered upgrade CTA card, links to billing | ✓ |
| Redirect to billing | Instantly redirect to /admin/billing with toast | |
| Hide nav item entirely | Don't show Inventory sidebar link until subscribed | |

**User's choice:** Upgrade wall page
**Notes:** Matches existing add-on card pattern in billing page

### Server Action gating response

| Option | Description | Selected |
|--------|-------------|----------|
| Feature required error | Return { error, upgradeUrl } matching requireFeature pattern | ✓ |
| Generic unauthorized | Return generic 403-style error with no upgrade hint | |

**User's choice:** Feature required error
**Notes:** Consistent with existing requireFeature pattern

### POS hints for non-subscribed stores

| Option | Description | Selected |
|--------|-------------|----------|
| No hints — clean POS | No stock badges or inventory references at all | ✓ |
| Subtle upgrade hint | Small 'Track stock' link in POS settings or grid header | |

**User's choice:** No hints — clean POS
**Notes:** Consistent with Phase 21 decision D-12

### Storefront stock info for non-subscribed stores

| Option | Description | Selected |
|--------|-------------|----------|
| No stock info | No badges, no sold-out states, all products purchasable | ✓ |
| Show stock if data exists | Show stock_quantity data even without add-on | |

**User's choice:** No stock info
**Notes:** Consistent with Phase 21 decision D-13

---

## Billing Activation

### Post-checkout experience

| Option | Description | Selected |
|--------|-------------|----------|
| Return to billing with success toast | Redirect to /admin/billing?success=inventory, toast confirmation | ✓ |
| Return to inventory page | Redirect straight to /admin/inventory | |
| Success interstitial | Dedicated success page with CTA to inventory | |

**User's choice:** Return to billing with success toast
**Notes:** None

### Webhook race condition handling

| Option | Description | Selected |
|--------|-------------|----------|
| Show billing page, feature appears on refresh | Current DB state shown, refresh picks up webhook | ✓ |
| Poll for activation | Client-side polling every 2s until has_inventory flips | |
| Optimistic activation | Trust Stripe redirect param, show as active immediately | |

**User's choice:** Show billing page, feature appears on refresh
**Notes:** Simple approach, no polling complexity

---

## Stock Badge Behavior

### Low-stock threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Per-product (existing field) | Use existing reorder_threshold field, default 5 | ✓ |
| Store-wide setting | Single threshold for all products in store settings | |
| Both | Store-wide default with per-product override | |

**User's choice:** Per-product (existing field)
**Notes:** Field already exists in schema

### Deactivation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Badges disappear immediately | All stock UI gone when has_inventory flips false, data stays in DB | ✓ |
| Grace period | Keep badges visible for 7 days after cancellation | |
| Keep badges, block management | Show stock data but block adjustments/stocktakes | |

**User's choice:** Badges disappear immediately
**Notes:** None

### POS owner override for out-of-stock

| Option | Description | Selected |
|--------|-------------|----------|
| Owner can override | Owners can add out-of-stock items with warning, staff cannot | ✓ |
| No overrides | Out-of-stock blocks everyone, must adjust stock first | |

**User's choice:** Owner can override
**Notes:** Covers receiving-then-selling scenarios

---

## Super Admin Override

### Override UI

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle switch on tenant page | On/off toggle in add-ons section, matches existing pattern | ✓ |
| Dedicated form | Separate form with reason field and confirmation step | |

**User's choice:** Toggle switch on tenant page
**Notes:** Matches xero/email/custom_domain override pattern

### Override + Stripe interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe subscription takes precedence | Override is a floor not ceiling, both flags can be true | ✓ |
| Stripe replaces override | Subscription clears manual override flag | |

**User's choice:** Stripe subscription takes precedence
**Notes:** Override as floor — if Stripe cancels, manual override keeps inventory active

### Override audit

| Option | Description | Selected |
|--------|-------------|----------|
| Existing pattern is sufficient | has_inventory_manual_override column tracks state, no extra table | ✓ |
| Log to audit table | Separate audit table with who/when/before/after | |

**User's choice:** Existing pattern is sufficient
**Notes:** Sufficient for v1

---

## Claude's Discretion

- Exact upgrade wall page layout and copy
- Toast notification implementation details
- Owner override UX in POS (warning dialog vs inline warning)

## Deferred Ideas

None — discussion stayed within phase scope
