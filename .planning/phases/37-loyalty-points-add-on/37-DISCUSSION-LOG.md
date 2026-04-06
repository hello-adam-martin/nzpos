# Phase 37: Loyalty Points Add-On - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 37-loyalty-points-add-on
**Areas discussed:** POS customer lookup, Points earn & redeem mechanics, Privacy enrollment flow, Admin loyalty settings

---

## POS Customer Lookup

### Lookup Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Before payment | After cart is built, before tapping Pay. A small 'Add Customer' button appears near the cart summary. Non-blocking — staff can skip and proceed to payment. | ✓ |
| At start of sale | Customer identified first, then items added. Every sale starts with 'Anonymous' or a named customer. | |
| After payment | Customer attached after sale completes. Points earned retroactively. | |

**User's choice:** Before payment (Recommended)
**Notes:** Non-blocking flow preserves the existing fast-checkout experience.

### Search UX

| Option | Description | Selected |
|--------|-------------|----------|
| Type-ahead search | Staff types name or email, results appear as they type. Like existing admin customer search. | ✓ |
| Phone number lookup | Customer gives phone number, staff types it for lookup. | |
| Both name/email + phone | Search accepts name, email, or phone. More flexible but requires phone in records. | |

**User's choice:** Type-ahead search (Recommended)
**Notes:** Matches existing admin customer search pattern.

### Customer Not Found

| Option | Description | Selected |
|--------|-------------|----------|
| Proceed without loyalty | Show 'No match found' and continue as anonymous. | |
| Quick-add customer inline | Create new customer (name + email) from POS lookup. | |
| Both options | 'No match found' with 'Create new customer' button. Staff chooses. | ✓ |

**User's choice:** Both options
**Notes:** Gives staff flexibility to add new customers or skip.

### Balance Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Show balance + available discount | After lookup, show 'Jane: 450 pts ($4.50 available)'. Staff can offer to redeem. | ✓ |
| Show balance only | Show 'Jane: 450 pts' without dollar conversion. | |
| Minimal — name only | Just confirm customer attached, balance only on redemption. | |

**User's choice:** Show balance + available discount (Recommended)
**Notes:** Proactive display enables staff to mention loyalty benefit to customer.

---

## Points Earn & Redeem Mechanics

### Default Earn Rate

| Option | Description | Selected |
|--------|-------------|----------|
| 1 point per $1 spent | Simple mental model. Merchant configurable. | |
| 10 points per $1 spent | Bigger numbers feel rewarding. Common in NZ. | |
| No default — merchant must set | Force merchant to choose during setup. | ✓ |

**User's choice:** No default — merchant must set
**Notes:** Prevents accidental points accumulation at wrong rate.

### Redemption Rate

| Option | Description | Selected |
|--------|-------------|----------|
| Merchant-set rate | Merchant configures e.g. '100 points = $1 discount'. Independent from earn rate. | ✓ |
| Fixed 1:1 with earn rate | Points value tied to earn rate. Simpler but less control. | |
| Tiered redemption | Different values at thresholds. More complex. | |

**User's choice:** Merchant-set rate (Recommended)
**Notes:** Independent earn and redeem rates give merchants margin control.

### Minimum Redemption

| Option | Description | Selected |
|--------|-------------|----------|
| No minimum | Any points balance can be redeemed. | ✓ |
| Merchant-configurable minimum | Merchant sets threshold before redemption available. | |
| Fixed minimum of 100 points | Platform-wide minimum. | |

**User's choice:** No minimum (Recommended)
**Notes:** Simplest for both merchant and customer.

### Earn Basis

| Option | Description | Selected |
|--------|-------------|----------|
| Net amount paid | Points earned on what customer actually paid. Excludes discounts, gift cards, loyalty redemptions. | ✓ |
| Full sale total before discounts | Points on pre-discount total. Simpler but earns on money not spent. | |
| You decide | Claude picks based on NZ retail norms. | |

**User's choice:** Net amount paid (Recommended)
**Notes:** Prevents points-on-points loops and is the fair approach.

---

## Privacy Enrollment Flow

### Enrollment Method

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic for online accounts | Existing accounts auto-enroll with privacy notice on first login after loyalty activates. POS customers added via quick-add. | ✓ |
| Explicit opt-in everywhere | Both online and POS customers must actively choose to join. | |
| Online auto, POS opt-in | Online auto-enrolled, POS customers explicitly opted in by staff. | |

**User's choice:** Automatic for online accounts (Recommended)
**Notes:** Reduces friction for existing online customers.

### Privacy Notice Location (Online)

| Option | Description | Selected |
|--------|-------------|----------|
| Banner on account page | One-time dismissible banner with points info and learn more link. | ✓ |
| Separate consent page | Redirect to dedicated privacy consent page. | |
| In-checkout notice | Small notice during checkout. No separate consent step. | |

**User's choice:** Banner on account page (Recommended)
**Notes:** Non-intrusive, one-time, satisfies IPP 3A notification requirement.

### POS Privacy Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Staff confirms verbal consent | Quick-add form includes checkbox 'Customer has been informed about loyalty data collection'. Must be checked. | ✓ |
| Email notice sent after | Privacy notice emailed, opt-out via link. | |
| You decide | Claude picks most NZ-compliant approach. | |

**User's choice:** Staff confirms verbal consent (Recommended)
**Notes:** Checkbox creates an auditable record of consent per IPP 3A.

---

## Admin Loyalty Settings

### Settings Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single settings card | One card with earn rate, redeem rate, pause toggle. Follows Store Settings pattern. | ✓ |
| Tabbed settings | Separate tabs for Earn Rules, Redeem Rules, General. | |
| Inline on customer list page | Settings above customer loyalty list. | |

**User's choice:** Single settings card (Recommended)
**Notes:** Compact, follows existing settings patterns.

### Customer Loyalty View

| Option | Description | Selected |
|--------|-------------|----------|
| Column on existing customer list | Add 'Points' column to admin customer table. Click to detail with transaction history. | ✓ |
| Separate loyalty members list | Dedicated page under Add-ons > Loyalty. | |
| Both views | Points column on main list + dedicated loyalty page with analytics. | |

**User's choice:** Column on existing customer list (Recommended)
**Notes:** Reuses existing CustomerDataTable, no new page needed for list view.

### Setup Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — setup required | After subscribing, merchant must save earn/redeem rates before points accumulate. | ✓ |
| No — start immediately with defaults | Points accumulate at default rates immediately. | |
| You decide | Claude picks based on no-default earn rate decision. | |

**User's choice:** Yes — setup required (Recommended)
**Notes:** Aligns with D-06 (no default earn rate). Prevents accidental earning.

---

## Claude's Discretion

- DB schema design (tables, columns, indexes, RLS)
- Points rounding strategy
- POS customer lookup sheet/modal UI design
- Points redemption UX at POS and online checkout
- Customer account page points balance layout
- Error handling UX
- Points earning timing (on completion vs after refund window)

## Deferred Ideas

None — discussion stayed within phase scope
