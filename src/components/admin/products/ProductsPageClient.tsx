'use client'
import { useState } from 'react'
import ProductSearchBar from './ProductSearchBar'
import ProductFilterBar, { type StockStatus, type ActiveStatus } from './ProductFilterBar'
import ProductDataTable, { type ProductWithCategory } from './ProductDataTable'
import CategorySidebarPanel from '@/components/admin/categories/CategorySidebarPanel'
import ProductFormDrawer from './ProductFormDrawer'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface ProductsPageClientProps {
  products: ProductWithCategory[]
  categories: Category[]
}

export default function ProductsPageClient({ products, categories }: ProductsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [stockStatus, setStockStatus] = useState<StockStatus>('all')
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null)

  // Build product counts per category for sidebar
  const productCounts: Record<string, number> = {}
  for (const p of products) {
    if (p.category_id) {
      productCounts[p.category_id] = (productCounts[p.category_id] ?? 0) + 1
    }
  }

  function handleFilterChange(filters: {
    categoryId: string | null
    stockStatus: StockStatus
    activeStatus: ActiveStatus
  }) {
    setStockStatus(filters.stockStatus)
    setActiveStatus(filters.activeStatus)
  }

  function handleProductSelect(product: ProductWithCategory) {
    setSelectedProduct(product)
    setDrawerOpen(true)
  }

  function handleAddProduct() {
    setSelectedProduct(null)
    setDrawerOpen(true)
  }

  function handleDrawerClose() {
    setDrawerOpen(false)
    setSelectedProduct(null)
  }

  return (
    <div className="flex gap-0 flex-1 min-h-0">
      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold font-display text-text">Products</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {}}
              className="px-4 py-2 text-sm font-semibold font-sans border border-amber text-amber rounded-[var(--radius-md)] hover:bg-amber/10 transition-colors disabled:opacity-40"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleAddProduct}
              className="px-4 py-2 text-sm font-semibold font-sans bg-amber text-white rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors"
            >
              Add Product
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col gap-3">
          <ProductSearchBar onSearchChange={setSearchQuery} />
          <ProductFilterBar
            categories={categories}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Data table */}
        <ProductDataTable
          products={products}
          searchQuery={searchQuery}
          selectedCategoryId={selectedCategoryId}
          stockStatus={stockStatus}
          activeStatus={activeStatus}
          onProductSelect={handleProductSelect}
        />
      </div>

      {/* Category sidebar — right side */}
      <div className="ml-4 flex-shrink-0">
        <CategorySidebarPanel
          initialCategories={categories}
          productCounts={productCounts}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={setSelectedCategoryId}
        />
      </div>

      {/* Product form drawer */}
      {drawerOpen && (
        <ProductFormDrawer
          product={selectedProduct}
          categories={categories}
          onClose={handleDrawerClose}
        />
      )}
    </div>
  )
}
