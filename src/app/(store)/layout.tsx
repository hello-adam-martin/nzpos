import { CartProvider } from '@/contexts/CartContext'
import { StorefrontHeader } from '@/components/store/StorefrontHeader'
import { CartDrawer } from '@/components/store/CartDrawer'
import StripeTestModeBanner from '@/components/StripeTestModeBanner'

export const metadata = {
  title: 'Shop | NZPOS',
  description: 'Browse our products online',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-bg">
        <StripeTestModeBanner />
        <StorefrontHeader />
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
