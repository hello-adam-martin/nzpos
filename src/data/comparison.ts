// Competitor pricing last verified: April 2026
// Sources:
//   Lightspeed:    https://www.lightspeedhq.co.nz/pos/retail/pricing/
//   Shopify POS:   https://www.shopify.co.nz/pos
//   POSbiz:        https://www.posbiz.co.nz/pricing
//   Hike POS:      https://hikeup.com/pricing/
// Update pricingDisclaimerDate in this file if refreshing competitor data.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Competitor {
  name: string
  slug: string
  monthlyPrice: string
  website: string
}

export interface Feature {
  name: string
  category: string
  nzposValue: string | boolean
  competitorValues: Record<string, string | boolean>
  addOnLink?: string
}

export interface FeatureCategory {
  name: string
  slug: string
}

export interface FAQItem {
  question: string
  answer: string
}

// ---------------------------------------------------------------------------
// Pricing disclaimer date (FTA compliance)
// ---------------------------------------------------------------------------

export const pricingDisclaimerDate = 'April 2026'

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export const competitors: Competitor[] = [
  {
    name: 'Lightspeed',
    slug: 'lightspeed',
    monthlyPrice: 'From $119/mo',
    website: 'https://www.lightspeedhq.co.nz/pos/retail/pricing/',
  },
  {
    name: 'Shopify POS',
    slug: 'shopify-pos',
    monthlyPrice: 'From $69/mo + POS Pro $139/mo',
    website: 'https://www.shopify.co.nz/pos',
  },
  {
    name: 'Hike POS',
    slug: 'hike',
    monthlyPrice: 'From $59 USD/mo',
    website: 'https://hikeup.com/pricing/',
  },
  {
    name: 'POSbiz',
    slug: 'posbiz',
    monthlyPrice: 'Custom pricing',
    website: 'https://www.posbiz.co.nz/pricing',
  },
]

// ---------------------------------------------------------------------------
// Feature categories
// ---------------------------------------------------------------------------

export const featureCategories: FeatureCategory[] = [
  { name: 'Core POS', slug: 'core-pos' },
  { name: 'Online Store', slug: 'online-store' },
  { name: 'Inventory & Stock', slug: 'inventory-stock' },
  { name: 'NZ Compliance', slug: 'nz-compliance' },
  { name: 'Add-ons & Extras', slug: 'add-ons-extras' },
  { name: 'Pricing', slug: 'pricing' },
]

// ---------------------------------------------------------------------------
// Features (10-15 across categories)
// ---------------------------------------------------------------------------

export const features: Feature[] = [
  // Core POS
  {
    name: 'iPad POS checkout',
    category: 'core-pos',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': true, posbiz: true },
  },
  {
    name: 'Barcode scanning',
    category: 'core-pos',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': true, posbiz: true },
  },
  {
    name: 'Staff PIN login & roles',
    category: 'core-pos',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': 'POS Pro only', posbiz: true },
  },
  // Online Store
  {
    name: 'Built-in online store',
    category: 'online-store',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: 'Via Shopify', 'shopify-pos': true, posbiz: false },
  },
  {
    name: 'Click-and-collect',
    category: 'online-store',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': true, posbiz: false },
  },
  // Inventory & Stock
  {
    name: 'Real-time inventory sync (POS + online)',
    category: 'inventory-stock',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': true, posbiz: true },
  },
  {
    name: 'Stocktake & adjustments',
    category: 'inventory-stock',
    nzposValue: '$9/mo add-on',
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': 'Shopify plan', posbiz: true },
    addOnLink: '/add-ons/inventory',
  },
  // NZ Compliance
  {
    name: 'GST 15% tax-inclusive pricing',
    category: 'nz-compliance',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': 'Configurable', posbiz: true },
  },
  {
    name: 'EFTPOS terminal support',
    category: 'nz-compliance',
    nzposValue: 'Standalone terminal',
    competitorValues: { hike: 'Third-party', lightspeed: 'Integrated', 'shopify-pos': 'Third-party', posbiz: 'Integrated' },
  },
  // Add-ons & Extras
  {
    name: 'Xero accounting sync',
    category: 'add-ons-extras',
    nzposValue: '$9/mo add-on',
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': 'Third-party app', posbiz: true },
    addOnLink: '/add-ons/xero',
  },
  {
    name: 'Gift cards',
    category: 'add-ons-extras',
    nzposValue: '$14/mo add-on',
    competitorValues: { hike: 'Paid plan', lightspeed: true, 'shopify-pos': true, posbiz: false },
    addOnLink: '/add-ons/gift-cards',
  },
  {
    name: 'Loyalty points',
    category: 'add-ons-extras',
    nzposValue: '$15/mo add-on',
    competitorValues: { hike: 'Paid plan', lightspeed: 'Paid add-on', 'shopify-pos': 'Third-party app', posbiz: false },
    addOnLink: '/add-ons/loyalty-points',
  },
  {
    name: 'Advanced reporting & COGS',
    category: 'add-ons-extras',
    nzposValue: '$9/mo add-on',
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': 'Shopify plan', posbiz: true },
    addOnLink: '/add-ons/advanced-reporting',
  },
  // Pricing
  {
    name: 'Free core POS (no monthly fee)',
    category: 'pricing',
    nzposValue: true,
    competitorValues: { hike: false, lightspeed: false, 'shopify-pos': false, posbiz: false },
  },
  {
    name: 'No transaction fees on POS sales',
    category: 'pricing',
    nzposValue: true,
    competitorValues: { hike: true, lightspeed: true, 'shopify-pos': true, posbiz: true },
  },
]

// ---------------------------------------------------------------------------
// FAQ items (comparison-focused)
// ---------------------------------------------------------------------------

export const faqItems: FAQItem[] = [
  {
    question: 'How does NZPOS pricing compare to Lightspeed or Hike?',
    answer:
      'NZPOS gives you a free core POS with no monthly fee and no transaction fees on in-store sales. You only pay for the add-ons you actually need. Lightspeed starts at $119/month and Hike at $59 USD/month before add-ons.',
  },
  {
    question: 'Is NZPOS suitable for my type of retail store?',
    answer:
      'NZPOS is built for NZ small retailers — supplies stores, gift shops, homeware, specialty retail. If you sell products in-store and want an online presence with one shared inventory, it fits. It is not designed for hospitality or restaurants.',
  },
  {
    question: 'Does NZPOS handle EFTPOS payments?',
    answer:
      'Yes. NZPOS works with your existing standalone EFTPOS terminal. You process the payment on the terminal, then confirm it in the POS. No proprietary card reader required — use whatever terminal your bank provides.',
  },
  {
    question: 'How does NZPOS handle GST compliance?',
    answer:
      'All prices are displayed GST-inclusive at 15%, which is what NZ customers expect. GST is calculated per line item on discounted amounts, exactly how the IRD requires. If you use the Xero add-on, GST breakdowns sync automatically.',
  },
  {
    question: 'Can I switch from my current POS to NZPOS?',
    answer:
      'Yes. You can import your product catalog via CSV, so you do not need to re-enter everything manually. Sign up, import your products, and you can be running the same day.',
  },
  {
    question: 'Does NZPOS work on iPad?',
    answer:
      'NZPOS runs in Safari on iPad — no app store download needed. The POS interface is optimised for touch with large tap targets. You can also use it on any tablet or desktop browser.',
  },
]
