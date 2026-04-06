# Requirements: NZPOS v6.0

**Defined:** 2026-04-06
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v6.0 Requirements

Requirements for Free Email Notifications milestone. Move email notifications from paid add-on to free tier.

### Backend & Feature Gating

- [x] **GATE-01**: Email sending works for all stores without feature gate check
- [x] **GATE-02**: Auth hook always sets email_notifications JWT claim to true
- [x] **GATE-03**: All existing stores have email notifications enabled via migration
- [x] **GATE-04**: New stores provisioned with email notifications enabled by default

### Billing & Stripe

- [x] **BILL-01**: Email notifications removed from ADDONS config and Stripe price mappings
- [x] **BILL-02**: Email notifications removed from subscription checkout session creation
- [x] **BILL-03**: Stripe billing webhook no longer toggles email_notifications feature flag

### Admin UI

- [x] **ADMIN-01**: Admin billing page shows only Xero and Inventory add-on cards
- [x] **ADMIN-02**: UpgradePrompt component no longer references email_notifications
- [x] **ADMIN-03**: Super admin activate/deactivate addon actions no longer include email_notifications

### Marketing Pages

- [ ] **MKT-01**: Landing pricing section shows only 2 add-on cards (Xero, Inventory)
- [ ] **MKT-02**: /add-ons/email-notifications detail page removed
- [ ] **MKT-03**: Add-ons hub page shows only 2 add-ons
- [ ] **MKT-04**: Free tier checklist on landing pricing includes "Email notifications"
- [ ] **MKT-05**: Add-on grid updated to 2-column layout on landing and hub pages

### Tests

- [x] **TEST-01**: All test files updated to reflect email notifications as free (no gating)

## Traceability

| REQ | Phase | Plan | Status |
|-----|-------|------|--------|
| GATE-01 | Phase 29 | — | Pending |
| GATE-02 | Phase 29 | — | Pending |
| GATE-03 | Phase 29 | — | Pending |
| GATE-04 | Phase 29 | — | Pending |
| BILL-01 | Phase 29 | — | Pending |
| BILL-02 | Phase 29 | — | Pending |
| BILL-03 | Phase 29 | — | Pending |
| ADMIN-01 | Phase 30 | — | Pending |
| ADMIN-02 | Phase 30 | — | Pending |
| ADMIN-03 | Phase 30 | — | Pending |
| MKT-01 | Phase 31 | — | Pending |
| MKT-02 | Phase 31 | — | Pending |
| MKT-03 | Phase 31 | — | Pending |
| MKT-04 | Phase 31 | — | Pending |
| MKT-05 | Phase 31 | — | Pending |
| TEST-01 | Phase 30 | — | Pending |

## Future Requirements

None deferred from this milestone.

## Out of Scope

- Removing the `has_email_notifications` column entirely (keep for backwards compatibility, always true)
- Changing Xero or Inventory pricing
- Adding new notification types
- Email template customization
