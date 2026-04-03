import { headers } from 'next/headers'
import { CartProvider } from '@/contexts/CartContext'
import { StorefrontHeader } from '@/components/store/StorefrontHeader'
import { CartDrawer } from '@/components/store/CartDrawer'
import { VerificationBanner } from '@/components/store/VerificationBanner'
import StripeTestModeBanner from '@/components/StripeTestModeBanner'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Shop | NZPOS',
  description: 'Browse our products online',
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isCustomer = user?.app_metadata?.role === 'customer'
  const customer = isCustomer && user ? {
    name: (user.user_metadata?.name as string | undefined) ?? null,
    email: user.email!,
    emailVerified: !!user.email_confirmed_at,
  } : null

  // Fetch merchant branding via x-store-id header (injected by middleware for tenant routes)
  const headersList = await headers()
  const storeId = headersList.get('x-store-id')

  let branding: { storeName: string | null; logoUrl: string | null; primaryColor: string | null } | null = null

  if (storeId) {
    const { data: store } = await supabase
      .from('stores')
      .select('name, logo_url, primary_color')
      .eq('id', storeId)
      .single()

    if (store) {
      branding = {
        storeName: store.name,
        logoUrl: store.logo_url,
        primaryColor: store.primary_color,
      }
    }
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-bg">
        <StripeTestModeBanner />
        <StorefrontHeader customer={customer} branding={branding} />
        {customer && !customer.emailVerified && (
          <VerificationBanner email={customer.email} />
        )}
        <CartDrawer />
        <main className="mx-auto max-w-[1200px] px-6 lg:px-8">
          {children}
        </main>
        <footer className="bg-surface border-t border-border py-8 mt-12">
          <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center text-sm text-navy/60">
            <p>Powered by NZPOS</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
