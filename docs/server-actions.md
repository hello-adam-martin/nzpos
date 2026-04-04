# Server Action Reference

NZPOS has 48 Server Actions organized in `src/actions/{domain}/`. All follow a consistent pattern: `'use server'` directive, `server-only` import, Zod input validation, auth check, database operation, and `{ success, error?, data? }` response.

## Common Pattern

```typescript
'use server'
import 'server-only'

export async function actionName(input: unknown) {
  const auth = await resolveAuth()
  if (!auth) return { success: false, error: 'Not authenticated' }

  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createSupabaseAdminClient()
  // ... database operation
  return { success: true, data: result }
}
```

**Auth helpers used:**

| Helper | Where defined | Who it resolves |
|--------|--------------|-----------------|
| `resolveAuth()` | `src/lib/resolveAuth.ts` | Owner (Supabase JWT) or staff (PIN JWT) — either role |
| `resolveStaffAuth()` | `src/lib/resolveAuth.ts` | Staff PIN JWT only (from `staff_session` cookie) |
| `supabase.auth.getUser()` | Supabase SSR | Owner Supabase session |
| `user.app_metadata?.is_super_admin` | Supabase JWT claim | Super admin flag |
| *(none)* | — | Public — no auth check |

**Return shape:** Always `{ success: true, data? }` or `{ success: false, error: string }`. Some actions return `{ error: FieldErrors }` (field-level errors from Zod flatten).

---

## Action Inventory

### Auth

Source: `src/actions/auth/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `ownerSignup` | public | `{ email: string, password: string(min8), storeName: string(max100), slug: SlugSchema }` via FormData | Validates rate limit, creates Supabase Auth user, calls `provision_store` RPC, sets `app_metadata` with role + store_id |
| `ownerSignin` | public | `{ email: string, password: string }` via FormData | Signs in owner via Supabase Auth password flow, redirects super admins to `/super-admin/tenants` |
| `signOut` | owner | *(none)* | Signs out Supabase session, clears `staff_session` cookie, redirects to `/login` |
| `changePassword` | owner | `{ password: string(min8), confirmPassword: string }` via FormData | Updates owner password via Supabase Auth; validates passwords match |
| `updateEmail` | owner | `{ email: string }` via FormData | Updates owner email via Supabase Auth; sends verification to new address |
| `updateProfile` | customer | `{ name?: string, email_receipts?: 'on'\|'off', marketing_emails?: 'on'\|'off' }` via FormData | Updates customer display name and email preferences in `customers` table |
| `resetPassword` | public | `{ email: string }` via FormData | Sends password reset email via Supabase Auth |
| `resendVerification` | public | `{ email: string }` via FormData | Resends signup verification email via Supabase Auth |
| `provisionStore` | public | `{ userId: uuid, email: string, storeName: string(max100), slug: SlugSchema }` via FormData | Rate-limited; calls `provision_store` RPC (service_role), sets `app_metadata` with role + store_id; does NOT auto-confirm email |
| `retryProvisioning` | public | `{ storeName: string(max100), slug: SlugSchema }` via FormData | Idempotent retry of `provision_store` for authenticated user with failed initial provisioning |
| `checkSlugAvailability` | public | `slug: string` (min1, max63, lowercase alphanumeric + hyphens) | Checks slug format, reserved words, and DB uniqueness; returns `{ available: boolean, reason? }` |
| `verifyStaffPin` | public | `{ storeId: uuid, staffId: uuid, pin: string(4 digits) }` | IP rate-limited (20/5min via `check_rate_limit` RPC); verifies bcrypt PIN hash, enforces 10-attempt lockout, issues 8h HS256 JWT stored in `staff_session` HttpOnly cookie |
| `customerSignup` | public | `{ email: string, password: string(min8) }` via FormData | Creates Supabase Auth user, inserts `customers` row, calls `link_customer_orders` RPC to match past orders by email |
| `customerSignin` | public | `{ email: string, password: string }` via FormData | Signs in customer via Supabase Auth; supports `return_to` redirect |
| `customerSignOut` | customer | *(none)* | Signs out customer Supabase session, redirects to `/` |

---

### Orders

Source: `src/actions/orders/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `completeSale` | staff/owner (PIN JWT) | `CreateOrderSchema`: `{ channel: 'pos'\|'online', status: enum, items: CartItem[], subtotal_cents: int, gst_cents: int, total_cents: int, discount_cents?: int, payment_method?: 'eftpos'\|'cash'\|'stripe'\|'split', cash_tendered_cents?: int, customer_email?: string, notes?: string }` | Validates cart, decrements stock atomically via `complete_pos_sale` RPC (service_role), creates order record, builds receipt data |
| `createCheckoutSession` | public | `{ items: [{ productId: uuid, quantity: int }], promoId?: uuid, promoDiscountCents?: int, promoDiscountType?: 'percentage'\|'fixed' }` | Creates Stripe Checkout session for online storefront; validates stock; returns `{ url }` |
| `processRefund` | owner | `RefundSchema`: `{ orderId: uuid, reason: 'customer_request'\|'damaged'\|'wrong_item'\|'other', restoreStock: boolean }` | Full refund via Stripe refund API, optionally restores stock via `restore_stock` RPC |
| `processPartialRefund` | owner | `PartialRefundSchema`: `{ orderId: uuid, reason: enum, items: [{ orderItemId: uuid, quantityToRefund: int }] }` | Partial item-level refund via Stripe, partial stock restore, logs to Xero as credit note if connected |
| `updateOrderStatus` | staff/owner (PIN JWT) | `{ orderId: uuid, newStatus: 'pending_pickup'\|'ready'\|'collected' }` | Updates click-and-collect order status; restricted to click-and-collect statuses only |
| `sendPosReceipt` | staff/owner (PIN JWT) | `{ orderId: uuid, email: string }` | Sends POS receipt email via Resend with order details, GST breakdown, and store info |

---

### Products

Source: `src/actions/products/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `createProduct` | owner | `CreateProductSchema`: `{ name: string, sku?: string, barcode?: string, price_cents: int, category_id?: uuid, stock_quantity?: int, reorder_threshold?: int, image_url?: string }` via FormData | Creates product; accepts `price_dollars` as alternative to `price_cents` (auto-converts); enforces SKU uniqueness |
| `updateProduct` | owner | `UpdateProductSchema`: same fields as create, all optional, plus `id: uuid` as path param | Partial update of product fields; accepts `price_dollars` or `price_cents`; enforces SKU uniqueness |
| `deactivateProduct` | owner | `id: string(uuid)` (direct param) | Soft-deletes product by setting `is_active=false`; product remains in historical orders |
| `importProducts` | owner | `{ rows: ImportRowSchema[] }` where each row has `{ name: string, sku?: string, barcode?: string, price_cents: int, stock_quantity?: int, reorder_threshold?: int, category_name?: string, category_id?: uuid }` | Bulk imports up to 1,000 products in chunks of 100; auto-creates categories that don't exist |
| `lookupBarcode` | staff/owner | `barcode: string` (digits only, max 20 chars) | Looks up active product by barcode for POS scanner; returns full product record |

---

### Categories

Source: `src/actions/categories/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `createCategory` | owner | `CreateCategorySchema`: `{ name: string }` | Creates product category; auto-assigns next `sort_order` |
| `updateCategory` | owner | `UpdateCategorySchema`: `{ id: string, name: string }` | Updates category name |
| `deleteCategory` | owner | `DeleteCategorySchema`: `{ id: string }` | Guards against deletion if products exist in category; hard-deletes if empty |
| `reorderCategories` | owner | `ReorderCategoriesSchema`: `{ categories: [{ id: string, sort_order: number }] }` | Batch-updates `sort_order` for drag-and-drop reordering |

---

### Billing

Source: `src/actions/billing/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `createSubscriptionCheckoutSession` | owner | `feature: 'xero'\|'email_notifications'\|'custom_domain'` (direct param, validated by Zod enum) | Creates Stripe Checkout session for add-on subscription; 14-day trial; reuses existing Stripe customer if available; returns `{ url }` |
| `createBillingPortalSession` | owner | *(none)* | Creates Stripe Billing Portal session for self-service subscription management; returns `{ url }` |

---

### Super Admin

Source: `src/actions/super-admin/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `suspendTenant` | super-admin | `{ storeId: uuid, reason: string(max500) }` via FormData | Sets `store.is_active=false`, invalidates tenant cache, writes audit log to `super_admin_actions` |
| `unsuspendTenant` | super-admin | `{ storeId: uuid, reason?: string(max500) }` via FormData | Sets `store.is_active=true`, writes audit log |
| `activateAddon` | super-admin | `{ storeId: uuid, feature: 'xero'\|'email_notifications'\|'custom_domain' }` via FormData | Sets `store_plans.{column}=true` and `{column}_manual_override=true`; blocks if already active via Stripe |
| `deactivateAddon` | super-admin | `{ storeId: uuid, feature: 'xero'\|'email_notifications'\|'custom_domain' }` via FormData | Clears `store_plans.{column}` and `{column}_manual_override`; only works on manually-comped add-ons (not Stripe-managed) |

---

### Setup

Source: `src/actions/setup/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `saveStoreNameStep` | owner | `{ storeName: string(min1, max100) }` | Wizard step 1: saves store name, sets bit 0 in `setup_completed_steps` bitmask |
| `saveLogoStep` | owner | `{ logoUrl: string(url)\|null, primaryColor: string(#RRGGBB)\|null }` | Wizard step 2: uploads logo URL and primary color, sets bit 1 in `setup_completed_steps` bitmask |
| `saveProductStep` | owner | `{ name?: string, priceCents?: int, categoryId?: uuid, imageUrl?: string(url) }` | Wizard step 3: optionally creates first product, sets bit 2 in `setup_completed_steps` bitmask |
| `dismissWizard` | owner | *(none)* | Sets `store.setup_wizard_dismissed=true`; hides wizard UI permanently |
| `updateBranding` | owner | `{ storeName: string(min1, max100), logoUrl: string(url)\|null, primaryColor: string(#RRGGBB)\|null }` | Updates store name, logo, and primary brand color post-wizard (from settings page) |

---

### Xero

Source: `src/actions/xero/`

All Xero actions require `requireFeature('xero', { requireDbCheck: true })` — the DB check is mandatory for mutations (not JWT-only fast path).

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `triggerManualSync` | owner + xero feature | *(none)* | Manually triggers Xero accounting sync via `executeManualSync(storeId)`; requires Xero add-on subscription |
| `saveXeroSettings` | owner + xero feature | `XeroAccountCodesSchema`: `{ cashAccountCode: string, eftposAccountCode: string, onlineAccountCode: string }` | Saves Xero account code mappings for cash, EFTPOS, and online payment channels |
| `disconnectXero` | owner + xero feature | *(none)* | Revokes Xero OAuth token (best effort), deletes tokens from Supabase Vault, sets `xero_connections.status='disconnected'` |

---

### Promos

Source: `src/actions/promos/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `createPromoCode` | owner | `CreatePromoCodeSchema`: `{ code: string(max50, uppercased), discount_type: 'percentage'\|'fixed', discount_value: int(min1), min_order_cents: int, max_uses?: int, expires_at?: datetime }` | Creates promotional discount code; enforces unique constraint on `(store_id, code)` |
| `validatePromoCode` | public | `{ code: string(max50), cartTotalCents: int }` | Validates promo code at storefront checkout; IP rate-limited (10/min via `check_rate_limit` RPC); checks expiry, max uses, and minimum order; returns `{ discountCents, discountType }` |

---

### Cash Sessions

Source: `src/actions/cash-sessions/`

| Name | Auth | Input Schema | Description |
|------|------|--------------|-------------|
| `openCashSession` | staff/owner | `{ openingFloatCents: int(min0) }` | Opens cash drawer session with opening float; guards against double-open (checks for existing open session) |
| `closeCashSession` | staff/owner | `{ sessionId: uuid, closingCashCents: int(min0), notes?: string(max500) }` | Closes cash session; calculates expected cash (float + cash sales), records variance, returns `{ expectedCashCents, varianceCents }` |

---

## Maintenance

This inventory reflects 48 actions as of Phase 19. To verify the current count:

```bash
find src/actions -name "*.ts" ! -path "*__tests__*" ! -name "*.test.ts" -type f | wc -l
```

If the count has changed, update this document.

**Domain breakdown:** Auth (15) + Orders (6) + Products (5) + Categories (4) + Billing (2) + Super Admin (4) + Setup (5) + Xero (3) + Promos (2) + Cash Sessions (2) = **48 total**
