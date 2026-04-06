// Add-on configuration: centralized metadata, Price IDs, and feature flag mappings.
// Price IDs are loaded from environment variables (D-02: never hardcode Price IDs).

export type SubscriptionFeature = 'xero' | 'custom_domain' | 'inventory' | 'gift_cards'

interface FeatureFlags {
  has_xero: boolean
  has_custom_domain: boolean
  has_inventory: boolean
  has_gift_cards: boolean
}

// Map: feature name -> Stripe Price ID (from env vars)
export const PRICE_ID_MAP: Record<SubscriptionFeature, string> = {
  xero: process.env.STRIPE_PRICE_XERO!,
  custom_domain: process.env.STRIPE_PRICE_CUSTOM_DOMAIN!,
  inventory: process.env.STRIPE_PRICE_INVENTORY ?? '',
  gift_cards: process.env.STRIPE_PRICE_GIFT_CARDS ?? '',
}

// Reverse map: Stripe Price ID -> store_plans column name (for webhook handler)
export const PRICE_TO_FEATURE: Record<string, keyof FeatureFlags> = {
  [process.env.STRIPE_PRICE_XERO!]: 'has_xero',
  [process.env.STRIPE_PRICE_CUSTOM_DOMAIN!]: 'has_custom_domain',
  ...(process.env.STRIPE_PRICE_INVENTORY
    ? { [process.env.STRIPE_PRICE_INVENTORY]: 'has_inventory' }
    : {}),
  ...(process.env.STRIPE_PRICE_GIFT_CARDS
    ? { [process.env.STRIPE_PRICE_GIFT_CARDS]: 'has_gift_cards' as const }
    : {}),
}

// Map: feature name -> store_plans boolean column name
export const FEATURE_TO_COLUMN: Record<SubscriptionFeature, keyof FeatureFlags> = {
  xero: 'has_xero',
  custom_domain: 'has_custom_domain',
  inventory: 'has_inventory',
  gift_cards: 'has_gift_cards',
}

// Add-on display metadata for UI rendering
export const ADDONS = [
  {
    feature: 'xero' as SubscriptionFeature,
    name: 'Xero Accounting',
    benefitLine: 'Sync your daily sales to Xero automatically — no manual data entry.',
    gatedHeadline: 'Xero sync requires an upgrade',
    gatedBody: 'Connect your Xero account and sync sales automatically. No manual data entry.',
  },
  {
    feature: 'custom_domain' as SubscriptionFeature,
    name: 'Custom Domain',
    benefitLine: 'Use your own domain (e.g. shop.yourbrand.co.nz) instead of your NZPOS subdomain.',
    gatedHeadline: 'Custom domains require an upgrade',
    gatedBody: 'Use your own domain for a fully branded storefront experience.',
  },
  {
    feature: 'inventory' as SubscriptionFeature,
    name: 'Inventory Management',
    benefitLine: 'Track stock levels, run stocktakes, and get low-stock alerts.',
    gatedHeadline: 'Inventory management requires an upgrade',
    gatedBody: 'Track stock quantities, adjust inventory, and run stocktakes with variance reporting.',
  },
  {
    feature: 'gift_cards' as SubscriptionFeature,
    name: 'Gift Cards',
    benefitLine: 'Sell digital gift cards in-store and online. Compliant with NZ Fair Trading Act 2024.',
    gatedHeadline: 'Gift cards require an upgrade',
    gatedBody: 'Sell digital gift cards in-store and online with NZ Fair Trading Act compliance.',
  },
] as const
