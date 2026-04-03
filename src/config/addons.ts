// Add-on configuration: centralized metadata, Price IDs, and feature flag mappings.
// Price IDs are loaded from environment variables (D-02: never hardcode Price IDs).

export type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain'

export interface FeatureFlags {
  has_xero: boolean
  has_email_notifications: boolean
  has_custom_domain: boolean
}

// Map: feature name -> Stripe Price ID (from env vars)
export const PRICE_ID_MAP: Record<SubscriptionFeature, string> = {
  xero: process.env.STRIPE_PRICE_XERO!,
  email_notifications: process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS!,
  custom_domain: process.env.STRIPE_PRICE_CUSTOM_DOMAIN!,
}

// Reverse map: Stripe Price ID -> store_plans column name (for webhook handler)
export const PRICE_TO_FEATURE: Record<string, keyof FeatureFlags> = {
  [process.env.STRIPE_PRICE_XERO!]: 'has_xero',
  [process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS!]: 'has_email_notifications',
  [process.env.STRIPE_PRICE_CUSTOM_DOMAIN!]: 'has_custom_domain',
}

// Map: feature name -> store_plans boolean column name
export const FEATURE_TO_COLUMN: Record<SubscriptionFeature, keyof FeatureFlags> = {
  xero: 'has_xero',
  email_notifications: 'has_email_notifications',
  custom_domain: 'has_custom_domain',
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
    feature: 'email_notifications' as SubscriptionFeature,
    name: 'Email Notifications',
    benefitLine: 'Send order confirmations, pickup reminders, and daily summaries automatically.',
    gatedHeadline: 'Email notifications require an upgrade',
    gatedBody: 'Automatically email customers when orders are confirmed, ready, or shipped.',
  },
  {
    feature: 'custom_domain' as SubscriptionFeature,
    name: 'Custom Domain',
    benefitLine: 'Use your own domain (e.g. shop.yourbrand.co.nz) instead of your NZPOS subdomain.',
    gatedHeadline: 'Custom domains require an upgrade',
    gatedBody: 'Use your own domain for a fully branded storefront experience.',
  },
] as const
