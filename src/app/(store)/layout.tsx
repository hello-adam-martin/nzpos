import { CartProvider } from '@/contexts/CartContext'
import { StorefrontHeader } from '@/components/store/StorefrontHeader'

export const metadata = {
  title: 'Shop | NZPOS',
  description: 'Browse our products online',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-bg">
        <StorefrontHeader />
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
