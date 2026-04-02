import 'server-only'

export default function StripeTestModeBanner() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const isTestMode = stripeKey?.startsWith('sk_test_') ?? false

  if (!isTestMode) {
    return null
  }

  return (
    <div className="w-full px-4 py-2 bg-warning/10 border border-warning text-warning text-sm font-semibold text-center">
      Test mode active. Payments are simulated. No real charges will occur.
    </div>
  )
}
