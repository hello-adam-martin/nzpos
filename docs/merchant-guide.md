# Getting Started with NZPOS

Welcome to NZPOS. This guide walks you through everything you need to go from a brand-new account to ringing up your first in-store sale and accepting your first online order — no technical experience needed.

---

## Welcome

NZPOS gives your business a point-of-sale system for your counter and an online store for your customers, all sharing one inventory. When you sell something in-store, the stock count drops for online customers too. Prices include GST, and NZPOS calculates the tax portion automatically for every sale.

This guide covers: creating your account, setting up your store, adding a product, completing a POS sale, accepting an online order, and understanding how GST works in NZPOS.

---

## Creating Your Account

1. Visit the NZPOS website at your store's root domain (e.g. `nzpos.co.nz`).
2. Click **Start your free trial** or **Sign up**.
3. Enter your business name, email address, and a password. Your business name becomes your store's URL slug (e.g. "My Shop" becomes `my-shop.nzpos.co.nz`).
4. Check your email inbox for a verification link from NZPOS. Click the link before trying to log in — the admin dashboard won't open until your email is verified.
5. After clicking the link, you'll be redirected to your store dashboard and taken straight to the setup wizard.

**You'll see:** Your new store dashboard at `your-store-name.nzpos.co.nz/admin`.

---

## Setting Up Your Store

The first time you log in, NZPOS automatically takes you through a short setup wizard. You can complete each step now or skip it and come back later.

### Step 1 — Name Your Store

Enter your store's display name. This is the name that appears on your storefront and on customer receipts. Your store URL was set when you signed up and cannot be changed later.

Click **Save & Continue** to save, or **Skip for now** to move on.

**You'll see:** A tick next to Step 1 in the progress indicator at the top.

### Step 2 — Logo and Brand Colour

Upload your logo (PNG, JPG, or WebP) and choose a brand colour. Your logo appears on your public storefront and on email receipts. The brand colour tints the storefront header.

Click **Save & Continue**, or **Skip for now** if you don't have these ready yet.

**You'll see:** A tick next to Step 2 in the progress indicator.

### Step 3 — Add Your First Product

Add a product to get started. Enter a product name, price (GST-inclusive), category, and an optional image. None of these fields are required — you can click **Skip — go to dashboard** and add products later from the admin panel.

Click **Add Product & Finish** to save and complete the wizard.

**You'll see:** A brief completion screen, then you'll be taken to your admin dashboard automatically.

> **Tip:** The wizard only appears once. After it completes (or you skip all steps), you'll always land directly on the admin dashboard when you log in.

---

## Adding Your First Product

If you skipped the wizard's product step, or you want to add more products, head to the admin panel.

1. In your admin dashboard, go to **Products** in the left menu.
2. Click **New Product** (or the **Add Product** button).
3. Fill in the required fields:
   - **Product Name** — what your customers will see
   - **Price** — enter the GST-inclusive price (the amount the customer pays), e.g. `23.00`
   - **Stock Quantity** — how many units you currently have
4. Optionally fill in: category, description, SKU/barcode, and a product image.
5. Click **Save**.

**You'll see:** Your product now appears in your product list and on your online store at `your-store-name.nzpos.co.nz`.

> **Important:** Always enter the price your customer will pay (GST-inclusive). NZPOS works out the GST component for you — you don't need to enter a pre-GST price.

---

## Your First POS Sale

The POS (point of sale) is what you use at your counter to ring up in-store purchases.

1. Open `your-store-name.nzpos.co.nz/pos` on your iPad or any browser.
2. Log in with your staff PIN. Staff PINs are set up in **Admin > Staff**. If you haven't created a staff member yet, do that first (your owner account has a separate admin login — the POS uses PIN-based logins for staff).
3. You'll see your product grid. Tap or click a product to add it to the cart on the right.
4. To apply a discount, tap the line item in the cart and enter a dollar amount discount.
5. When the cart is ready, tap **Complete Sale**.
6. Choose the payment method:
   - **Cash** — enter the amount tendered. NZPOS shows change due.
   - **EFTPOS** — process the amount on your standalone EFTPOS terminal as normal, then tap **Confirm Payment** in NZPOS once the terminal approves. NZPOS records the sale but does not communicate with the terminal directly.
7. The sale is complete. You can print or display a receipt for the customer.

**You'll see:** The sale appears immediately in **Admin > Reports**, and the stock count for each product sold drops by the quantity sold.

> **Tip:** The POS requires an internet connection. If the connection drops mid-sale, wait until it's restored before completing — this keeps your stock counts accurate.

---

## Your First Online Order

Your online storefront is live from the moment you create your account. Share the URL with customers and they can start ordering straight away.

1. Share your storefront URL: `your-store-name.nzpos.co.nz`.
2. A customer browses your products and adds items to their cart.
3. They click **Checkout**, enter their name and email address.
4. They complete payment through Stripe's secure card payment page (NZPOS never stores card details).
5. After payment, the customer sees an order confirmation on screen. If you have email notifications enabled, they also receive a confirmation email.
6. You receive an email notification: "New order received" (if email notifications are enabled in your add-ons).
7. The order appears in **Admin > Orders** with a status of **Paid**.

**You'll see:** The order listed in Admin > Orders with the amount paid, and the stock count for each ordered product decrements automatically.

> **Tip:** You can test your own storefront by placing an order yourself. Use Stripe's test card `4242 4242 4242 4242` with any future expiry date and any CVC while you're in test mode.

---

## GST and Pricing

All prices in NZPOS include GST. When you enter a price, that's what your customer pays — NZPOS works out the GST component automatically on every sale.

### How GST is calculated

NZPOS uses the IRD-approved method: GST = amount charged × 3 ÷ 23. This is mathematically equivalent to 15% GST on the pre-GST price.

**Example — standard sale, no discount:**

```
Product: Cleaning spray
Price you entered: $23.00 (this is what the customer pays)

NZPOS automatically calculates:
  GST (15%): $3.00
  Price before GST: $20.00

On the receipt, your customer sees:
  Subtotal: $20.00
  GST (15%): $3.00
  Total: $23.00
```

**Example — sale with a discount applied:**

```
Product: Cleaning spray ($23.00)
You apply a $5.00 discount

The customer pays: $18.00
NZPOS calculates GST on the discounted amount:
  GST (15%): $2.35
  Price before GST: $15.65
  Total charged: $18.00

This is correct — IRD requires GST to be calculated on
the amount actually charged, not the original price.
```

### Why discounts reduce the GST amount

When you give a discount, your customer pays less — so the GST you collect is also less. IRD requires that GST be calculated on the actual amount charged, not the pre-discount price. NZPOS handles this automatically. The figures on the receipt will always reflect what was actually paid.

### GST registration

GST applies if your business is registered for GST with Inland Revenue. If you're not yet registered (typically required when your turnover exceeds $60,000 per year), consult your accountant.

> **Disclaimer:** NZPOS calculates GST automatically following IRD guidelines, but this is not tax advice. Consult your accountant for your specific obligations, including whether you are required to register for GST.

---

## Getting Help and Next Steps

You've covered the core workflow — from signup to your first online order. Here's what to explore next:

- **Admin > Reports** — daily sales summaries, GST totals, and end-of-day cash-up
- **Admin > Staff** — add staff members and set their PINs
- **Admin > Orders** — view and manage all online orders
- **Admin > Products** — manage your full product catalogue, categories, and stock levels
- **Add-ons** — email notifications and Xero accounting integration are available as optional add-ons from your billing settings

For more documentation, see the [docs index](README.md). For technical setup (local development, environment variables), see [setup.md](setup.md).

If you have questions not covered here, contact support.
