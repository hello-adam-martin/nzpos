# Phase 24: Staff RBAC Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 24-Staff RBAC Foundation
**Areas discussed:** Manager admin access, Staff list UI & actions, Permission enforcement, Role change UX

---

## Manager Admin Access

### Q1: Should managers access the admin panel, or only process refunds from the POS?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin panel (read-only) | Managers can see /admin dashboard, orders, reports, and process refunds from admin. Products, staff, settings, billing are hidden. | ✓ |
| POS-only + refund button | Managers never see /admin. Refund action is available on the POS order lookup screen. | |
| Admin panel (full nav, blocked actions) | Managers see all sidebar links but get permission errors on restricted pages. | |

**User's choice:** Admin panel (read-only)
**Notes:** Matches STAFF-06 requirement naturally. Filtered sidebar, not blocked actions.

### Q2: How should managers navigate to /admin after PIN login?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-redirect after PIN login | Managers see a 'Go to Admin' button on POS screen, like owners do. | ✓ |
| Separate admin login for managers | Email/password to access admin. PIN is POS-only. | |
| PIN login lands on admin directly | Manager PIN login goes straight to /admin. | |

**User's choice:** Auto-redirect after PIN login
**Notes:** No separate auth system needed. PIN login is sufficient for manager admin access.

### Q3: What happens if a manager visits a restricted admin route via URL?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /admin/dashboard | Silent redirect to allowed landing page. No error message. | ✓ |
| 403 permission page | Styled 'You don't have permission' page with link back. | |
| Redirect to /pos | Send back to POS. | |

**User's choice:** Redirect to /admin/dashboard
**Notes:** Clean UX, no error noise.

---

## Staff List UI & Actions

### Q1: How should the staff list page be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Table with inline actions | Staff table with name, role, status. Row actions for edit/deactivate/reset PIN. | ✓ |
| Card grid | Cards with avatar placeholder, name, role badge, status. | |
| Table + detail page | Table list, clicking row navigates to /admin/staff/[id] detail page. | |

**User's choice:** Table with inline actions
**Notes:** Consistent with existing products/orders table pattern.

### Q2: How should adding a new staff member work?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal form | Click 'Add Staff' → modal with name + role. PIN auto-generated and shown in success modal. | ✓ |
| Inline row | New empty row at top of table. | |
| Separate page | Navigate to /admin/staff/new. | |

**User's choice:** Modal form
**Notes:** Simple, no page navigation needed.

### Q3: How should generated PINs be displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal with copy button | Large text PIN, copy button, warning it won't show again. | ✓ |
| Inline reveal with timer | PIN shown in table row for 30 seconds. | |
| Modal with print option | PIN modal with print button for paper slip. | |

**User's choice:** Modal with copy button
**Notes:** None.

### Q4: Auto-generated PIN only, or allow custom?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generated only | Random 4-digit PIN. Prevents weak PINs. | |
| Owner chooses PIN | Owner types a 4-digit PIN. Risk of weak/duplicates. | |
| Auto-generated with manual override | Default auto, toggle for manual entry. | ✓ |

**User's choice:** Auto-generated with manual override
**Notes:** Needs basic validation — no 0000, no duplicates within the store.

---

## Permission Enforcement

### Q1: How should restricted Server Actions respond to unauthorized roles?

| Option | Description | Selected |
|--------|-------------|----------|
| Throw unauthorized error | Typed error (INSUFFICIENT_ROLE). Defense-in-depth alongside UI hiding. | ✓ |
| Return error result | { success: false, error: 'insufficient_permissions' }. Softer. | |
| Silent no-op | Action does nothing, returns success. Hides problems. | |

**User's choice:** Throw unauthorized error
**Notes:** Consistent with existing RLS pattern.

### Q2: Should the Staff role have any admin access?

| Option | Description | Selected |
|--------|-------------|----------|
| POS-only | Staff can only use POS. No admin access. Current behavior. | ✓ |
| Minimal admin (view-only orders) | Staff can see their own recent orders. | |
| You decide | Claude's discretion. | |

**User's choice:** POS-only
**Notes:** Three-tier model confirmed: Owner (full admin), Manager (filtered admin + POS), Staff (POS only).

---

## Role Change UX

### Q1: Confirmation step when changing role?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation modal | "Change [Name] from X to Y? They will be logged out." Confirm/Cancel. | ✓ |
| Inline save with toast | Dropdown saves immediately. Toast notification. | |
| You decide | Claude's discretion. | |

**User's choice:** Confirmation modal
**Notes:** Prevents accidental role changes.

### Q2: Deactivation confirmation?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation modal | "Deactivate [Name]? They will be immediately logged out." Prominent warning. | ✓ |
| Toggle with undo toast | Toggle flips immediately. 5-second undo toast. | |
| Same as role change | Use whatever pattern decided for role changes. | |

**User's choice:** Confirmation modal
**Notes:** Separate confirmation with prominent warning since deactivation blocks the staff member's work.

---

## Claude's Discretion

- Table column widths and responsive breakpoints
- Loading skeleton patterns
- Error toast styling
- Exact confirmation modal wording

## Deferred Ideas

None — discussion stayed within phase scope.
