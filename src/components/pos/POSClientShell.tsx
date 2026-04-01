'use client'

import { useReducer, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cartReducer, initialCartState } from '@/lib/cart'
import type { Database } from '@/types/database'
import { POSTopBar } from './POSTopBar'
import { CategoryFilterBar } from './CategoryFilterBar'
import { ProductGrid } from './ProductGrid'
import { CartPanel } from './CartPanel'

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']

type POSClientShellProps = {
  products: ProductRow[]
  categories: CategoryRow[]
  staffName: string
  staffRole: 'owner' | 'staff'
  storeName: string
}

export function POSClientShell({
  products,
  categories,
  staffName,
  staffRole,
  storeName,
}: POSClientShellProps) {
  const [cart, dispatch] = useReducer(cartReducer, initialCartState)
  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Stock refresh on page focus (D-14, POS-08)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router])

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === null || product.category_id === selectedCategory
    const lowerSearch = search.toLowerCase()
    const matchesSearch =
      search === '' ||
      product.name.toLowerCase().includes(lowerSearch) ||
      (product.sku?.toLowerCase().includes(lowerSearch) ?? false)
    return matchesCategory && matchesSearch
  })

  function handleLogout() {
    router.push('/pos/login')
  }

  return (
    <div className="grid grid-cols-[1fr_400px] h-full">
      {/* Left panel: products */}
      <div className="flex flex-col h-full overflow-hidden">
        <POSTopBar
          storeName={storeName}
          staffName={staffName}
          onLogout={handleLogout}
        />
        <CategoryFilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="flex-1 overflow-y-auto">
          <ProductGrid
            products={filteredProducts}
            cart={cart}
            onAddToCart={(product) => dispatch({ type: 'ADD_PRODUCT', product })}
            staffRole={staffRole}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
      </div>

      {/* Right panel: cart */}
      <CartPanel
        cart={cart}
        dispatch={dispatch}
        staffRole={staffRole}
        onOpenDiscount={() => {}}
      />
    </div>
  )
}
