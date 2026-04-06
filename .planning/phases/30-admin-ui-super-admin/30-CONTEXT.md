# Phase 30: Admin UI & Super Admin - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all traces of email notifications from admin billing UI, upgrade prompts, and super admin addon actions. After this phase, the admin experience reflects email as a free built-in feature — no billing cards, upgrade suggestions, or toggle actions reference email_notifications.

</domain>

<decisions>
## Implementation Decisions

### Billing Page (ADMIN-01)
- **D-01:** Remove the email_notifications add-on card from the admin billing page. The page should show exactly 2 add-on cards: Xero and Inventory Management. Standard grid layout adjustment for 2 items.

### Upgrade Prompts (ADMIN-02)
- **D-02:** Update UpgradePrompt component to remove any references to email_notifications. The component should never suggest upgrading to get email features — email is free for all stores.

### Super Admin Actions (ADMIN-03)
- **D-03:** Remove email_notifications from the activateAddon and deactivateAddon server actions. The super admin addon toggle UI should only list Xero and Inventory Management as actionable add-ons.

### Test Updates (TEST-01)
- **D-04:** Update all admin/super-admin test files that reference email_notifications to reflect it as a free feature. Fix broken references and ensure tests assert email is absent from add-on lists.

### Claude's Discretion
- Grid layout adjustment when going from 3 to 2 add-on cards (2-column vs centered, etc.)
- Whether to remove email_notifications from PlanOverrideRow or just hide it
- Test assertion style (negative assertions for absence vs. positive-only)
- Order of operations across plans

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Admin Billing UI
- `src/app/admin/billing/BillingClient.tsx` — Billing page rendering add-on cards
- `src/app/admin/billing/page.tsx` — Billing page server component
- `src/components/admin/billing/AddOnCard.tsx` — Individual add-on card component
- `src/components/admin/billing/UpgradePrompt.tsx` — Upgrade prompt component

### Super Admin
- `src/actions/super-admin/activateAddon.ts` — Activate addon server action
- `src/actions/super-admin/deactivateAddon.ts` — Deactivate addon server action
- `src/components/super-admin/PlanOverrideRow.tsx` — Plan override UI row
- `src/app/super-admin/tenants/[id]/page.tsx` — Tenant detail page

### Add-on Config (modified in Phase 29)
- `src/config/addons.ts` — Central add-on config (Phase 29 already removed email from backend types)

### Tests
- `src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` — UpgradePrompt tests
- `src/actions/super-admin/__tests__/activateAddon.test.ts` — Activate addon tests
- `src/actions/super-admin/__tests__/deactivateAddon.test.ts` — Deactivate addon tests

### Prior Phase Context
- `.planning/phases/29-backend-billing-cleanup/29-CONTEXT.md` — Backend cleanup decisions (JWT claim removed, Stripe config cleaned, has_email_notifications column kept always-true)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AddOnCard` component: renders individual add-on cards with status, pricing, and action buttons
- `UpgradePrompt` component: shows upgrade suggestions throughout admin
- `activateAddon` / `deactivateAddon`: server actions that toggle add-on state for a store

### Established Patterns
- Add-on cards rendered from an array/config — removing email entry from the data source should cascade
- UpgradePrompt may reference email_notifications in conditional logic or copy text
- Super admin addon actions likely use a union type or enum that Phase 29 already narrowed

### Integration Points
- `src/config/addons.ts` is the single source of truth for add-on metadata — Phase 29 removed email from backend types, but UI-facing arrays/display config may still reference it
- Admin billing page pulls from addons config to render cards
- Super admin tenant detail page shows addon override controls

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward cleanup following Phase 29 backend changes. Apply the same removal pattern to UI that Phase 29 applied to backend.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-admin-ui-super-admin*
*Context gathered: 2026-04-06*
