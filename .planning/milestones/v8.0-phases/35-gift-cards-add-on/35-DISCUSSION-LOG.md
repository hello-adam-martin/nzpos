# Phase 35: Gift Cards Add-On - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 35-gift-cards-add-on
**Areas discussed:** Gift card code & delivery, POS redemption flow, Admin management, Storefront purchase UX

---

## Gift Card Code & Delivery

### Code Format

| Option | Description | Selected |
|--------|-------------|----------|
| 16-char alphanumeric with dashes | e.g. ABCD-1234-EFGH-5678 — easy to read aloud, familiar gift card feel | |
| 12-char alphanumeric no dashes | e.g. A3B7K9M2P4X1 — shorter but harder to read/type | |
| 8-digit numeric only | e.g. 4827-1593 — very easy to type on POS numpad | ✓ |

**User's choice:** 8-digit numeric only
**Notes:** Optimized for POS numpad entry. 10M codes per store is sufficient keyspace.

### Email Recipient

| Option | Description | Selected |
|--------|-------------|----------|
| Buyer only | Buyer gets code and forwards/prints it themselves | ✓ |
| Recipient directly | Buyer enters recipient email + optional message | |
| Both buyer and recipient | Two emails per purchase | |

**User's choice:** Buyer only
**Notes:** Simpler — no recipient fields needed at checkout.

### Email Content

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, prominent expiry + balance | NZ Fair Trading Act requires clear expiry disclosure | ✓ |
| You decide | Claude designs email template with NZ compliance | |

**User's choice:** Yes, prominent expiry + balance
**Notes:** Compliance-first approach.

### Purchase Channels

| Option | Description | Selected |
|--------|-------------|----------|
| Both POS and online | Staff can issue at register + available on storefront | ✓ |
| Online storefront only | Gift cards only purchasable through online store | |

**User's choice:** Both POS and online
**Notes:** Covers both walk-in and online buyers.

---

## POS Redemption Flow

### Payment Method Integration

| Option | Description | Selected |
|--------|-------------|----------|
| New payment method alongside EFTPOS/Cash | Add 'Gift Card' as third payment method option | ✓ |
| Pre-checkout discount step | Apply gift card code before choosing EFTPOS/Cash | |
| You decide | Claude designs UX based on existing POS patterns | |

**User's choice:** New payment method alongside EFTPOS/Cash
**Notes:** Gift card is a payment method, not a discount.

### Partial Payment Split

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-split: gift card first, then EFTPOS/Cash for remainder | One smooth flow, no manual split calculation | ✓ |
| Manual split entry | Staff manually enters how much to charge to gift card | |

**User's choice:** Auto-split
**Notes:** Staff enters code, system deducts what it can, prompts for remainder.

### Validation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Show balance + auto-apply | System shows balance/expiry, auto-applies full available amount | ✓ |
| Show balance only, require confirm | Sees balance, must tap 'Apply' | |
| You decide | Claude designs validation/confirmation UX | |

**User's choice:** Show balance + auto-apply
**Notes:** Minimal friction for staff.

### Receipt Display

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — gift card amount, remaining balance, last 4 digits | Standard retail receipt practice | ✓ |
| You decide | Claude decides receipt formatting | |

**User's choice:** Show gift card amount, remaining balance, last 4 digits of code
**Notes:** None.

---

## Admin Management

### List View

| Option | Description | Selected |
|--------|-------------|----------|
| Table with code (masked), balance, status, dates | Follows existing OrderDataTable pattern | ✓ |
| Card-based grid | Visual cards — breaks existing table pattern | |
| You decide | Claude designs following existing patterns | |

**User's choice:** Table view
**Notes:** Consistent with existing admin patterns.

### Void/Disable Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — owner can void with reason | Owner-only, records reason, NZ Fair Trading Act compliant | ✓ |
| No voiding in v1 | Cards only expire naturally | |

**User's choice:** Yes — owner can void with reason
**Notes:** Fraud protection.

### Transaction History

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — timeline of all transactions | Issuance + every redemption with details | ✓ |
| Balance only, no history | Just current balance and status | |

**User's choice:** Transaction history timeline
**Notes:** Essential for dispute resolution and accounting.

### Sidebar Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Under a new 'Add-ons' section | Groups gift cards + future loyalty/COGS | ✓ |
| Top-level sidebar item | Own link like Orders or Products | |
| You decide | Claude decides placement | |

**User's choice:** Under new 'Add-ons' section
**Notes:** Scales well as more add-ons are added.

---

## Storefront Purchase UX

### Denominations

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed denominations set by merchant | e.g. $25, $50, $100 — customer picks from list | ✓ |
| Custom amount entered by customer | Any amount with min/max | |
| Both fixed + custom option | Preset buttons plus custom field | |

**User's choice:** Fixed denominations set by merchant
**Notes:** Simpler checkout, predictable pricing.

### Store Page Location

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /gift-cards page | Separate page linked from storefront nav | ✓ |
| Gift cards as products in catalog | Mixed in with regular items | |
| You decide | Claude decides based on storefront patterns | |

**User's choice:** Dedicated /gift-cards page
**Notes:** Clean separation from physical/service products.

### Online Redemption

| Option | Description | Selected |
|--------|-------------|----------|
| Code entry field on checkout page | Validates, shows balance, applies to order total | ✓ |
| Apply before cart/checkout | Like a promo code, reduces displayed total earlier | |
| You decide | Claude designs online redemption UX | |

**User's choice:** Code entry field on checkout page
**Notes:** Standard approach.

### Full Balance Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — skip Stripe, complete order directly | No Stripe session needed if gift card covers total | ✓ |
| Always go through Stripe | $0 or reduced Stripe session regardless | |

**User's choice:** Skip Stripe, complete order directly
**Notes:** Avoids unnecessary $0 Stripe charges.

---

## Claude's Discretion

- Email template layout and styling
- Gift card DB schema design
- RPC design for atomic operations
- Denomination management UI
- Error handling UX

## Deferred Ideas

None — discussion stayed within phase scope.
