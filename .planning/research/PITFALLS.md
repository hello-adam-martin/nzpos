# Pitfalls Research: v8.0 Add-On Catalog Expansion

**Domain:** Adding new paid add-ons (loyalty, analytics, CRM, gift cards) to an existing multi-tenant SaaS POS. Integrating with the proven requireFeature() gating pattern, Stripe per-add-on subscriptions, Supabase RLS store_id isolation, and NZ-specific compliance requirements (GST, Privacy Act 2020 + 2025 amendments, Fair Trading Act 2024 gift card law).
**Researched:** 2026-04-06
**Confidence:** HIGH for NZ gift card law and Privacy Act requirements (confirmed against official NZ legislation). HIGH for Stripe webhook idempotency risks (confirmed against Stripe official docs and practitioner reports). HIGH for gift card accounting pitfalls (confirmed against accounting best practice sources). MEDIUM for loyalty program regulatory risks (confirmed against NZ FMA guidance + Privacy Act + practitioner experience). MEDIUM for scope creep patterns (practitioner experience + post-mortems).

---

## Critical Pitfalls

### Pitfall 1: Gift Card Sales Recorded as Revenue Instead of Deferred Liability

**What goes wrong:**
A gift card sale is not revenue — it is a liability. When a customer purchases a $100 gift card, the store owes $100 of goods or services. Revenue is only recognised when the card is redeemed. If the POS records the gift card purchase as a completed sale in the `orders` table with a payment, the merchant's Xero integration syncs it as taxable revenue immediately. The merchant overstates income and GST payable. If the card is partially redeemed or never redeemed, the accounting is corrupted from day one.

**Why it happens:**
Gift card issuance looks like a payment event in the POS flow: money changes hands, a receipt is generated, stock does not decrement. Developers model it as a "sale with no product" or "prepaid credit" and route it through the existing sale completion path. The existing `complete_pos_sale` and `complete_online_sale` RPCs are not designed to distinguish deferred revenue from recognised revenue.

**How to avoid:**
Gift cards require a separate data model entirely:
- `gift_cards` table with columns: `id`, `store_id`, `code` (unique), `initial_balance_cents` (integer), `current_balance_cents` (integer), `issued_at`, `expires_at`, `voided_at`
- `gift_card_transactions` table: `id`, `gift_card_id`, `store_id`, `order_id` (nullable), `delta_cents` (negative for redemption, positive for top-up), `type` (ISSUED / REDEEMED / VOID), `created_at`
- Gift card **issuance** never touches the `orders` table. It writes to `gift_cards` with full balance and logs an ISSUED transaction.
- Gift card **redemption** creates an `orders` entry and deducts from `current_balance_cents` atomically in a SECURITY DEFINER RPC.
- For Xero sync: skip gift card issuance rows entirely. Only sync redemption orders (the point at which goods change hands and GST applies). Add a flag `is_gift_card_issuance BOOLEAN DEFAULT false` to prevent accidental syncing.
- Keep integer cents throughout — no floats, consistent with the existing codebase pattern.

**Warning signs:**
- Gift card purchase appears in the `orders` table as a completed order
- Xero sync includes gift card issuance as a sales invoice
- No `gift_cards` or `gift_card_transactions` table exists
- Gift card balance stored as a float rather than integer cents

**Phase to address:**
Gift card add-on phase, first schema design step. The data model must be correct before any UI is built. Add an explicit note to Xero sync exclusion logic before the phase ships.

---

### Pitfall 2: NZ Fair Trading Act 2024 — Gift Cards Must Have 3-Year Minimum Expiry (Effective 16 March 2026)

**What goes wrong:**
The platform ships a gift card add-on with a configurable expiry (e.g., defaulting to 12 months "for simplicity"). From 16 March 2026, this is **illegal** under the Fair Trading (Gift Card Expiry) Amendment Act 2024. Any gift card sold to a consumer must be valid for at least 3 years from the date of sale. Merchants using the platform's gift card add-on are exposed to Commerce Commission infringement notices of up to $1,000 per offence and prosecution fines up to $30,000.

**Why it happens:**
Developers often default to short expiry periods (12 months) because it reduces outstanding liability on the merchant's balance sheet. The law change (effective the same month as this milestone) is recent and not widely known in developer communities.

**How to avoid:**
- Hard-code a 3-year minimum expiry in the `gift_cards` schema: check constraint `expires_at >= issued_at + INTERVAL '3 years'`.
- In the UI, let merchants choose "3 years" or "No expiry" — never allow less than 3 years.
- Display the expiry date prominently on digital gift card receipts/emails (prominently is the statutory requirement).
- Add the wording "This gift card is redeemable for 3 years from the date of purchase" to all gift card receipt templates.
- Document NZ legal requirements in the merchant-facing gift card setup UI with a reference to the Commerce Commission guidance.

**Warning signs:**
- Configurable expiry field allows values under 3 years
- Default expiry is 12 months
- No expiry date displayed on gift card confirmation email/receipt
- No check constraint on `expires_at` in the database schema

**Phase to address:**
Gift card add-on phase, schema and receipt template steps. The compliance requirement is non-negotiable and cannot be retrofitted as a "nice to have."

---

### Pitfall 3: Loyalty Points Create an Undisclosed Financial Liability and GST Complexity

**What goes wrong:**
Every loyalty point issued is a promise to deliver future goods or services. At scale, unredeemed points accumulate as a hidden liability on the merchant's books. More critically: if loyalty points can be exchanged for goods, IRD may treat the point issuance as a supply event requiring GST accounting at the point of issuance (not just at redemption). The merchant's Xero integration will not account for this correctly unless explicitly designed to do so. Additionally, if points are transferable or have monetary value, the NZ Financial Markets Authority may deem the program a stored-value scheme requiring FSPR registration.

**Why it happens:**
Loyalty programs feel like simple "discount with extra steps" features. Developers treat points as non-monetary counters. The GST implications are non-obvious: Inland Revenue's April 2025 interpretation guidance specifically addressed loyalty points and trade rebates and found them taxable in circumstances most developers would not anticipate.

**How to avoid:**
- Design loyalty as a **points-only discount** system (no cash-out, no transfer, no secondary market). This keeps it below financial regulation thresholds.
- Points represent discount eligibility, not stored value. State this clearly in program T&Cs.
- Points are NOT taxable at issuance when they represent a contingent discount — only at redemption when goods change hands. Document this distinction for Xero sync: redemption discounts reduce the order total (already handled by promo code mechanics), not a separate supply event.
- Never allow points-to-cash conversion. This is the line that triggers stored-value financial regulation.
- For the NZ Privacy Act: collecting purchase history to award points is indirect personal data collection. Notify customers at the point of signup what data is collected and how it is used (see Pitfall 7).
- Keep point values simple: integer points, no fractional balances, no expiry below 12 months without merchant explicit configuration (no statutory minimum for loyalty points — but very short expiry periods face Fair Trading Act "misleading" risk).

**Warning signs:**
- Points can be redeemed for cash or store credit equivalent to cash
- Points are transferable between customers
- No T&Cs displayed at loyalty sign-up
- Xero sync counts point issuance as a sales event
- Points have monetary value stated in dollar terms (e.g., "100 points = $1")

**Phase to address:**
Loyalty program add-on phase, T&C and data model design. Flag for merchant accountant review in the add-on onboarding flow.

---

### Pitfall 4: Stripe Webhook Duplicate Events Cause Double Feature Activation or Double Deactivation

**What goes wrong:**
Stripe explicitly documents that webhooks may be delivered more than once. For add-on activation (`customer.subscription.created`, `invoice.paid`), a duplicate event activates the add-on, then a second activation attempt writes a duplicate record or toggles the feature gate off-then-on. For deactivation (`customer.subscription.deleted`), a duplicate event correctly deactivates, then re-deactivates an already-inactive add-on — harmless unless the deactivation flow triggers a merchant notification email, which fires twice.

**Why it happens:**
The existing webhook handler for Xero and Inventory add-ons may not have been stress-tested for duplicate delivery. The new add-ons will use the same webhook handler pattern (`/api/stripe/webhook`) and inherit any non-idempotent behaviour. At low tenant counts, duplicates are rare. As tenant count grows, "occasional duplicates" becomes "regular duplicates."

**How to avoid:**
- Store processed Stripe event IDs in a `stripe_processed_events` table: `(event_id TEXT PRIMARY KEY, processed_at TIMESTAMP)`.
- At the start of every webhook handler, check if `event_id` is already in the table. If yes, return 200 immediately — do not process.
- Wrap the event-ID insert and the feature activation/deactivation in a single DB transaction. If the transaction commits, the event was processed exactly once.
- Review the existing webhook handler to confirm idempotency is already in place. If not, add it before adding new add-on event handling.
- For email side effects (merchant notification on activation/deactivation), send emails only after the DB transaction commits successfully — never in the webhook handler directly.

**Warning signs:**
- No `stripe_processed_events` table or equivalent in the schema
- Webhook handler processes `customer.subscription.created` without checking if subscription is already active in the DB
- Merchant receives two "Your add-on has been activated" emails after subscribing
- Webhook handler sends emails or calls external APIs synchronously before returning 200

**Phase to address:**
Any new add-on billing phase, as the first task before wiring up Stripe events. Audit the existing handler first.

---

### Pitfall 5: Feature Gate Bypass — New Add-On Tables Lack RLS Policies

**What goes wrong:**
The `requireFeature()` pattern correctly gates the Server Action layer. But when a new add-on creates new Postgres tables (e.g., `loyalty_points`, `loyalty_transactions`, `gift_cards`), those tables are not automatically covered by existing RLS policies. If a developer forgets to add `store_id`-filtered RLS policies to the new tables, a tenant can read another tenant's loyalty balances or gift card codes via a crafted Supabase client query (direct REST/RPC call bypassing Next.js middleware).

**Why it happens:**
New tables start with RLS disabled by default in Postgres. The developer focuses on the feature logic and the `requireFeature()` guard in Server Actions. The Supabase RLS policy migration is a separate step that is easy to defer or forget. The existing tables are correctly protected but new tables in new migrations start unprotected.

**How to avoid:**
- Every new table migration must include: `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` followed by RLS policies for all required operations.
- Standard policy pattern for all add-on tables: SELECT/INSERT/UPDATE/DELETE allowed only where `store_id = (SELECT store_id FROM store_members WHERE user_id = auth.uid())` or use the existing JWT custom claim path.
- Add a CI check or test that queries each new table with a cross-tenant user and asserts zero rows returned.
- Use a checklist in the phase plan: "New table added → RLS enabled → SELECT policy → INSERT policy → UPDATE policy (if applicable) → DELETE policy (if applicable) → test cross-tenant isolation."

**Warning signs:**
- New migration file lacks `ENABLE ROW LEVEL SECURITY` for new tables
- No RLS policies in the migration for new tables
- A Supabase client query without store_id filter returns rows from all tenants

**Phase to address:**
Every add-on phase with a new table. This must be in the acceptance criteria for every schema migration in the milestone.

---

### Pitfall 6: Analytics Add-On Reports Metrics Across Tenants Instead of Per-Tenant

**What goes wrong:**
An advanced analytics add-on queries aggregated sales data. A developer writing a "top products" query forgets the `store_id` filter and the query aggregates across all tenants. The merchant sees every product sold across all merchants on the platform — including competitor product names and sales volumes. This is a data breach under the NZ Privacy Act 2020.

**Why it happens:**
Analytics queries are often written in raw SQL or complex Supabase `.rpc()` calls where the developer is focused on the aggregation logic. The `store_id` filter is a "business logic concern" that feels separate from the analytics problem being solved. When using the Supabase admin client (service role) for complex queries, RLS does not enforce the filter automatically.

**How to avoid:**
- All analytics queries must use the standard Supabase server client (with the store session context), not the admin client. RLS provides the store_id filter automatically.
- For complex aggregation queries (WINDOW functions, CTEs), use SECURITY DEFINER RPCs that accept `p_store_id` as a parameter and include an explicit `WHERE store_id = p_store_id` in every subquery.
- Add a cross-tenant isolation integration test specifically for analytics queries: call every analytics RPC with Store A's credentials and assert that Store B's data never appears in any result set.
- In the super-admin panel, cross-tenant analytics are intentional — but must be clearly routed through super-admin-only Server Actions and never exposed to tenant-level routes.

**Warning signs:**
- Analytics RPC does not accept `p_store_id` parameter
- Analytics Server Action uses admin client
- Analytics result set includes products/orders not belonging to the requesting tenant
- No cross-tenant isolation test for analytics queries

**Phase to address:**
Analytics add-on phase, for every new RPC written. Cross-tenant isolation test in acceptance criteria.

---

### Pitfall 7: NZ Privacy Act 2020 + 2025 Amendment — CRM and Loyalty Data Collection Without Proper Notice

**What goes wrong:**
A CRM or loyalty add-on collects customer purchase history, contact details, and behavioural data. Under the NZ Privacy Act 2020, any organisation collecting personal information must notify the individual of (a) who is collecting it, (b) why it is being collected, (c) who it will be disclosed to, and (d) how they can access or correct it. The 2025 Privacy Amendment Act (IPP 3A, effective 1 May 2026) adds indirect collection notification obligations — if purchase history data is shared between merchant systems (e.g., synced to the merchant's own CRM), the merchant must notify the customer even when data was collected from another source.

**Why it happens:**
Developers treat privacy notices as a "legal concern" separate from technical implementation. The CRM add-on signup flow collects an email, phone, and purchase history — but the privacy notice is missing or buried. Solo developers particularly tend to defer this as "admin" that can be added later.

**How to avoid:**
- Every customer-facing sign-up flow for loyalty or CRM must include a visible privacy notice statement before data is collected: "We collect your [email/phone/purchase history] to [purpose]. You can request access or deletion at any time by contacting [merchant contact]."
- The platform must provide merchants with a configurable privacy notice template — merchants must be able to edit their own store's privacy statement within the add-on settings.
- Do NOT collect any data beyond what is needed for the add-on's stated purpose (data minimisation principle, Privacy Act IPP 1).
- Do NOT share customer data between merchants or use it for platform-wide analytics without explicit consent.
- Provide a customer data deletion workflow: when a customer requests deletion, the add-on must support purging their record from `loyalty_members`, `gift_cards`, and CRM tables — scoped to that store's data.
- The platform operator (as a multi-tenant SaaS) is itself a data processor under the Privacy Act and must have a privacy policy covering its data handling.

**Warning signs:**
- No privacy notice text in the loyalty or CRM signup flow
- No merchant-configurable privacy statement in add-on settings
- Customer data deletion is not handled when a merchant cancels the add-on
- Add-on collects data (e.g., full purchase history) beyond what is needed for its stated purpose
- No mention of Privacy Act compliance in the merchant onboarding for the add-on

**Phase to address:**
CRM and loyalty add-on phases. Privacy notice must be in the acceptance criteria for any customer-facing data collection flow.

---

### Pitfall 8: Loyalty Points Issued But Not Scoped to the Correct Store's Customers

**What goes wrong:**
A customer signs up for loyalty at Store A. Their `loyalty_member_id` is stored without adequate `store_id` scoping. When the same customer later shops at Store B (a different tenant on the same platform), a developer's query inadvertently finds their loyalty record and awards points to the wrong store's program — or worse, exposes Store A's loyalty balance to Store B's admin.

**Why it happens:**
Customer accounts on the platform use a shared `customers` table with `store_id` — but new add-on tables may not inherit this scoping correctly. Loyalty members are often keyed by email, which is not unique across stores. A developer queries `WHERE email = customer_email` without the `store_id` filter.

**How to avoid:**
- `loyalty_members` table must have `store_id` as a non-nullable column with a composite unique constraint: `UNIQUE(store_id, customer_email)`.
- All loyalty lookup queries (earn, redeem, balance check) must filter on both `store_id` AND customer identifier. Never lookup by customer identifier alone.
- RLS policies on loyalty tables enforce `store_id` automatically — test cross-tenant isolation.
- Never reuse a loyalty balance or membership across stores, even if the same customer email exists in both.

**Warning signs:**
- `loyalty_members` table has no `store_id` column
- Loyalty lookup query uses `WHERE email = $1` without `AND store_id = $2`
- No composite unique constraint on `(store_id, customer_email)`

**Phase to address:**
Loyalty program add-on phase, schema design step.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Model gift card sale as a regular order | Reuses existing checkout path | Revenue overstated, GST incorrect, Xero sync corrupted | Never — gift cards require separate data model |
| Set gift card expiry to 12 months by default | Simpler UI | Illegal under NZ Fair Trading Act 2024 (effective Mar 2026) | Never — hard-code 3-year minimum |
| Allow loyalty points-to-cash conversion | Higher perceived value for customers | Triggers NZ financial regulation (FSPR registration, AML obligations) | Never for v1 — defer if ever |
| Skip privacy notice in loyalty signup flow | Faster to ship | Privacy Act breach, OPC investigation risk, merchant liability | Never — privacy notice is a legal requirement |
| Use admin Supabase client for analytics queries | Simpler code, avoid RLS config | Cross-tenant data leak, Privacy Act breach | Super-admin routes only, never tenant analytics |
| No idempotency check on Stripe webhooks | Less schema complexity | Duplicate add-on activations, double notification emails | Never — idempotency is required at any scale |
| Store loyalty point balance as a running total column | Simple to read | Balance can be corrupted by concurrent transactions; no audit trail | Never — use transaction log pattern and compute balance from ledger |
| Add new table without RLS policies | Faster migration | Tenant data isolation broken for new feature's data | Never — RLS must be in same migration as table creation |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe webhooks (add-on activation) | Process `customer.subscription.created` without idempotency check | Store `stripe_processed_events` event IDs; check before processing any event |
| Stripe webhooks (deactivation) | Send merchant notification email inside webhook handler before returning 200 | Return 200 immediately; process side effects (email, DB writes) after response |
| Xero sync (gift cards) | Sync gift card issuance as a sales invoice | Exclude issuance from sync; only sync redemption orders |
| Xero sync (loyalty redemption discount) | Treat loyalty discount as a separate supply event | Loyalty redemption reduces order total; sync as a discounted order, not a separate transaction |
| Supabase RLS (new add-on tables) | Create table without `ENABLE ROW LEVEL SECURITY` | Every new table migration must explicitly enable RLS and add per-store policies |
| Supabase service role client (analytics) | Use admin client for analytics queries to avoid RLS complexity | Use server client with session context; RLS enforces store_id filter automatically |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Computing loyalty point balance by summing `gift_card_transactions` on every request | Slow balance lookup as transaction count grows | Cache running balance in `loyalty_members.point_balance` (updated atomically on each transaction RPC) | ~500+ transactions per customer |
| Fetching full transaction history for analytics on page load | Slow analytics page, timeout on large stores | Materialise aggregated analytics in a snapshot table; update on schedule | ~10,000+ transactions per store |
| Gift card code generation without uniqueness index | Duplicate code collision at scale | Use `gen_random_uuid()` or a collision-resistant code scheme; UNIQUE index on `gift_cards(store_id, code)` | ~50,000+ codes (lower with simple schemes) |
| CRM customer search without index | Slow search across large customer tables | Index on `(store_id, email)` and `(store_id, name)` for text search; use Postgres `ILIKE` with `%` anchored to end only | ~5,000+ customers per store |
| Loyalty point expiry cleanup as a cron job scanning all rows | Full-table scan on `loyalty_points` | Partial index on `expires_at WHERE expires_at IS NOT NULL`; process in batches | ~100,000+ loyalty records |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Gift card code is sequential or predictable (e.g., GC-00001) | Brute-force code guessing allows unauthorized redemption | Use `gen_random_uuid()` or cryptographically random 16-char alphanumeric code; rate-limit redemption attempts per IP |
| Gift card redemption without balance check in RPC | Race condition allows double-spend if two requests arrive simultaneously | Use `SELECT ... FOR UPDATE` or atomic `UPDATE ... WHERE current_balance_cents >= amount_cents RETURNING *` in SECURITY DEFINER RPC |
| Loyalty balance manipulation via direct Supabase client call | Customer can award themselves arbitrary points via crafted REST call | All point earn/redeem operations via SECURITY DEFINER RPCs only — never allow client-side INSERT into `loyalty_transactions` |
| CRM customer data exported without store_id scoping | Export returns all tenant data | Add explicit `store_id` filter to all export queries regardless of RLS; double-check admin client use |
| Analytics data exposed via public RPC | Competitor sees another store's sales data | All analytics RPCs require authenticated session; verify store membership before returning data |
| Gift card void without audit trail | Gift cards voided silently, no record | Every void writes to `gift_card_transactions` with type VOID and `voided_by` user ID |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Loyalty sign-up form collects data without explaining why | Customers decline, low enrollment | "Earn points on every purchase" headline + one-line privacy statement before form |
| Gift card balance shown in "credits" rather than NZD | Confusion about actual value | Always display balance in NZD with GST note ("Balance: $45.00 NZD") |
| Loyalty points with no visible redemption path at POS | Staff doesn't know how to apply points; friction at checkout | Pin redemption mechanic to POS cart — one button "Apply loyalty points" visible when customer has balance |
| Analytics add-on shows raw numbers without context | Merchant cannot interpret trend | Always show comparison period (vs last 30 days / last year) alongside current metric |
| Gift card expiry date buried in email footer | Customer misses it; disputes when card "expires" | Expiry date in bold near the top of gift card email: "Valid until [date]" — required by law |
| CRM customer list shows all customers without search | Slow page load, cognitive overload | Default to empty state + search; never auto-load full customer list |
| Add-on trial without clear upgrade prompt | Merchant uses trial features, confused when they stop working | Never provide "trial" access to a paid add-on without a visible upgrade CTA and clear end date |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Gift card issuance:** Card is issued and code is sent — verify the issuance does NOT create an `orders` row, does NOT sync to Xero as revenue, and balance is stored as integer cents.
- [ ] **Gift card expiry:** Expiry date is stored — verify it is at least 3 years from issuance, displayed prominently in the confirmation email, and the UI does not allow merchants to set a shorter period.
- [ ] **Gift card redemption:** Redemption deducts balance — verify the deduction is atomic (no double-spend possible), a `gift_card_transactions` row is written, and the corresponding order IS synced to Xero.
- [ ] **Loyalty point earn:** Points are awarded on purchase — verify award is scoped to the correct `store_id`, uses a SECURITY DEFINER RPC (not client-side INSERT), and the customer was shown a privacy notice before enrollment.
- [ ] **Loyalty point redemption:** Discount is applied at POS — verify the discount reduces the order total (not a separate transaction), GST is recalculated on the discounted amount (existing per-line GST logic), and the point deduction is atomic.
- [ ] **CRM data collection:** Customer record created — verify privacy notice was shown, only necessary fields are collected, and there is a deletion workflow for customer data requests.
- [ ] **Analytics add-on:** Report renders with correct numbers — verify all queries have `store_id` filter or use authenticated server client with RLS, cross-tenant data never appears, and the admin client is not used in tenant-facing analytics routes.
- [ ] **Stripe webhook idempotency:** Add-on activates on subscription — verify `stripe_processed_events` table exists, duplicate event does not cause double activation, and deactivation is idempotent.
- [ ] **RLS on new tables:** New add-on table is created — verify migration includes `ENABLE ROW LEVEL SECURITY`, SELECT/INSERT/UPDATE/DELETE policies exist, and a cross-tenant isolation test passes.
- [ ] **requireFeature() gate:** Add-on feature is visible in UI — verify both the UI fast-path (JWT claim) and the DB-path in Server Action mutations independently enforce the gate; test direct POST to mutation action without active subscription.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Gift card revenue incorrectly synced to Xero | HIGH | Identify all gift card issuance orders synced to Xero; create Xero credit notes to reverse; rebuild gift card data model; re-run Xero sync from correct data; notify affected merchants |
| Gift card expiry under 3 years (non-compliant) | HIGH | Immediate: update all gift cards in DB to 3-year minimum; update UI to block short expiry; update all email templates; document Commerce Commission notification process if cards were already issued |
| Duplicate Stripe webhook processed twice | MEDIUM | Review activation logs; if double-activated, the state is idempotent (add-on still active); if double-deactivation caused merchant to lose access incorrectly, manually restore via super-admin override; add idempotency check before next deploy |
| Loyalty points awarded without privacy notice | MEDIUM | Retroactively notify enrolled customers of data collection (required under Privacy Act); provide opt-out mechanism; add privacy notice to enrollment flow; consult Privacy Commissioner guidelines on retrospective notification |
| Cross-tenant analytics data leak | HIGH | Immediately take analytics page offline; patch all queries to add store_id filter; audit logs to identify scope of exposure; notify affected merchants under Privacy Act breach notification obligation (within 72 hours if serious harm risk) |
| Gift card double-spend via race condition | HIGH | Identify affected transactions; calculate net balance; void corrupted gift card codes; issue replacement codes; implement atomic balance check in RPC |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Gift card as deferred revenue, not order (Pitfall 1) | Gift card add-on schema phase | Verify `orders` table has zero rows for gift card issuance; Xero sync test excludes issuance |
| Gift card 3-year minimum expiry (NZ law) (Pitfall 2) | Gift card add-on schema + receipt template | DB check constraint; UI blocks < 3 years; email template shows expiry prominently |
| Loyalty points as financial liability (Pitfall 3) | Loyalty add-on design phase | T&Cs in place; no cash-out path; Xero sync excludes issuance events |
| Stripe webhook duplicate event double-activation (Pitfall 4) | Any new add-on billing phase | `stripe_processed_events` table; idempotency integration test |
| New table without RLS policies (Pitfall 5) | Every add-on schema migration | Cross-tenant isolation test per new table; migration checklist |
| Analytics cross-tenant data leak (Pitfall 6) | Analytics add-on RPC phase | Cross-tenant isolation test for every analytics query |
| Privacy Act notice missing from CRM/loyalty (Pitfall 7) | CRM and loyalty add-on UI phase | Privacy notice visible before data collection; deletion workflow tested |
| Loyalty points not scoped to store (Pitfall 8) | Loyalty add-on schema phase | Composite unique constraint; cross-tenant lookup test |

---

## NZ-Specific Compliance Reference

Summary of NZ laws relevant to v8.0 add-ons.

| Law | Relevant Add-On | Key Requirement | Penalty for Non-Compliance |
|-----|-----------------|-----------------|---------------------------|
| Fair Trading (Gift Card Expiry) Amendment Act 2024 (effective 16 March 2026) | Gift Cards | 3-year minimum expiry; expiry date prominently displayed | Up to $30,000 per offence |
| Privacy Act 2020 (IPP 1, IPP 3, IPP 5) | CRM, Loyalty | Collect only what is needed; notify at collection; store securely | Up to $10,000 for breach notification failure |
| Privacy Amendment Act 2025 (IPP 3A, effective 1 May 2026) | CRM, Loyalty | Notify customers when personal data is collected indirectly | Up to $10,000 |
| Fair Trading Act 1986 (misleading conduct) | Loyalty, Gift Cards | Program terms must be clear; changes must be disclosed | Commerce Commission prosecution |
| Financial Markets Conduct Act 2013 | Loyalty (if cash-convertible) | Points convertible to cash may require FSPR registration | FMA enforcement action |
| GST Act 1985 (s 5(11D)) | Gift Cards, Loyalty | GST on redemption, not issuance, for vouchers exchangeable for goods | IRD audit, back-tax, penalties |

---

## Sources

- Fair Trading (Gift Card Expiry) Amendment Act 2024: https://www.legislation.govt.nz/act/public/2024/0035/latest/LMS946059.html
- NZ 1News: Retailers must now honour three-year gift card expiry (16 March 2026): https://www.1news.co.nz/2026/03/16/retailers-must-now-honour-three-year-gift-card-expiry-under-new-law/
- Commerce Commission gift card guidance: https://www.comcom.govt.nz/consumers/dealing-with-typical-situations/gift-cards-and-vouchers/
- Retail NZ gift card guidance: https://retail.kiwi/advice/gift-cards-and-vouchers/
- Privacy Act 2020 Information Privacy Principles: https://www.legislation.govt.nz/act/public/2020/0031/latest/LMS23342.html
- Privacy Amendment Act 2025, IPP 3A (effective 1 May 2026): https://www.privacy.org.nz/resources-and-learning/a-z-topics/ipp3a/
- NZ Privacy Act and CRM (Magnetism Solutions): https://blog.magnetismsolutions.com/blog/johneccles/2020/10/18/crm-and-the-nz-privacy-act-2020
- IRD tax treatment of gift cards (Affinity Accounting, April 2025): https://www.affinityaccounting.co.nz/blog/tax-treatment-of-gift-cards-ird-interpretation
- NZ loyalty points tax debate (TaxTonic): https://taxtonic.co.nz/trade-loyalty-points-the-sleeping-bear-awakes/
- Gift card liability accounting best practices (HubiFi): https://www.hubifi.com/blog/gift-card-liability-accounting
- GAAP accounting for gift cards (GBQ): https://gbq.com/accounting-for-gift-cards/
- Stripe webhook idempotency best practices (Stigg): https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks
- Stripe subscription webhook idempotency guide (DEV Community): https://dev.to/aniefon_umanah_ac5f21311c/building-reliable-stripe-subscriptions-in-nestjs-webhook-idempotency-and-optimistic-locking-3o91
- Multi-tenant POS data isolation (AWS): https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/
- POS loyalty program pitfalls (ConnectPOS): https://www.connectpos.com/first-time-rolling-out-a-pos-loyalty-program-look-out-for-these-common-pitfalls/
- NZ FMA financial services regulation (FSPR): https://www.fma.govt.nz/business/services/offer-information/faqs/
- Loyalty program regulatory impact on small businesses (FasterCapital): https://fastercapital.com/content/Loyalty-program-regulation--How-Loyalty-Program-Regulations-Impact-Startups-and-Small-Businesses.html

---
*Pitfalls research for: v8.0 Add-On Catalog Expansion — loyalty, analytics, CRM, gift cards on existing multi-tenant NZ POS platform*
*Researched: 2026-04-06*
