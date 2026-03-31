'use client'
import { useEffect, useRef, useState } from 'react'
import { createProduct } from '@/actions/products/createProduct'
import { updateProduct } from '@/actions/products/updateProduct'
import { deactivateProduct } from '@/actions/products/deactivateProduct'
import type { ProductWithCategory } from './ProductDataTable'
import ProductImagePicker from './ProductImagePicker'
import PriceInput from './PriceInput'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface ProductFormDrawerProps {
  product: ProductWithCategory | null
  categories: Category[]
  onClose: () => void
}

interface FormErrors {
  name?: string[]
  sku?: string[]
  price_cents?: string[]
  stock_quantity?: string[]
  reorder_threshold?: string[]
  image_url?: string[]
  _form?: string[]
}

export default function ProductFormDrawer({
  product,
  categories,
  onClose,
}: ProductFormDrawerProps) {
  const isEditMode = product !== null

  // Form fields
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null)
  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const [priceCents, setPriceCents] = useState<number | null>(product?.price_cents ?? null)
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? '')
  const [stockQuantity, setStockQuantity] = useState<number>(product?.stock_quantity ?? 0)
  const [reorderThreshold, setReorderThreshold] = useState<number>(product?.reorder_threshold ?? 0)
  const [isActive, setIsActive] = useState<boolean>(product?.is_active ?? true)

  // New category inline
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Dirty state tracking
  const initialValues = useRef({
    imageUrl: product?.image_url ?? null,
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    priceCents: product?.price_cents ?? null,
    categoryId: product?.category_id ?? '',
    stockQuantity: product?.stock_quantity ?? 0,
    reorderThreshold: product?.reorder_threshold ?? 0,
    isActive: product?.is_active ?? true,
  })

  function isDirty(): boolean {
    const init = initialValues.current
    return (
      imageUrl !== init.imageUrl ||
      name !== init.name ||
      sku !== init.sku ||
      barcode !== init.barcode ||
      priceCents !== init.priceCents ||
      categoryId !== init.categoryId ||
      stockQuantity !== init.stockQuantity ||
      reorderThreshold !== init.reorderThreshold ||
      isActive !== init.isActive
    )
  }

  // Keyboard close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  function handleClose() {
    if (isDirty()) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  function handleBackdropClick() {
    handleClose()
  }

  function handleDiscard() {
    setShowDiscardConfirm(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Client-side validation
    const clientErrors: FormErrors = {}
    if (!name.trim()) clientErrors.name = ['This field is required.']
    if (priceCents === null) clientErrors.price_cents = ['Enter a valid price (e.g. 8.99).']
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setIsSaving(true)

    const formData = new FormData()
    formData.set('name', name.trim())
    formData.set('sku', sku.trim())
    formData.set('barcode', barcode.trim())
    formData.set('price_dollars', String(priceCents! / 100))
    if (categoryId) formData.set('category_id', categoryId)
    formData.set('stock_quantity', String(stockQuantity))
    formData.set('reorder_threshold', String(reorderThreshold))
    if (imageUrl) formData.set('image_url', imageUrl)

    let result
    if (isEditMode && product) {
      result = await updateProduct(product.id, formData)
    } else {
      result = await createProduct(formData)
    }

    setIsSaving(false)

    if ('error' in result) {
      setErrors(result.error as FormErrors)
      return
    }

    onClose()
  }

  async function handleDeactivateConfirm() {
    if (!product) return
    setIsDeactivating(true)
    const result = await deactivateProduct(product.id)
    setIsDeactivating(false)
    if ('error' in result) {
      setErrors(result.error as FormErrors)
    } else {
      setShowDeactivateConfirm(false)
      onClose()
    }
  }

  const inputClass = (hasError?: boolean) =>
    [
      'w-full px-3 py-2 text-sm font-sans border border-border rounded-[var(--radius-md)] bg-card text-text',
      'focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-colors',
      'disabled:bg-surface disabled:text-text-muted disabled:cursor-not-allowed',
      hasError ? 'border-error focus:ring-error' : '',
    ].join(' ')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card z-50 flex flex-col shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={isEditMode ? 'Edit Product' : 'Add Product'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-semibold font-sans text-text">
            {isEditMode ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5"
        >
          {/* Image picker */}
          <ProductImagePicker
            initialImageUrl={product?.image_url}
            onImageUrl={setImageUrl}
          />

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="drawer-name" className="text-sm font-semibold font-sans text-text">
              Name <span className="text-error">*</span>
            </label>
            <input
              id="drawer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass(!!errors.name)}
              placeholder="Product name"
              maxLength={200}
            />
            {errors.name && (
              <p className="text-sm font-sans text-error">{errors.name[0]}</p>
            )}
          </div>

          {/* SKU */}
          <div className="flex flex-col gap-1">
            <label htmlFor="drawer-sku" className="text-sm font-semibold font-sans text-text">
              SKU
            </label>
            <input
              id="drawer-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className={[inputClass(!!errors.sku), 'font-mono'].join(' ')}
              placeholder="SKU-001"
              maxLength={50}
              style={{ fontFamily: 'var(--font-mono, "Geist Mono", monospace)' }}
            />
            {errors.sku && (
              <p className="text-sm font-sans text-error">{errors.sku[0]}</p>
            )}
          </div>

          {/* Barcode */}
          <div className="flex flex-col gap-1">
            <label htmlFor="drawer-barcode" className="text-sm font-semibold font-sans text-text">
              Barcode
            </label>
            <input
              id="drawer-barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className={inputClass()}
              placeholder="9400000000000"
              maxLength={50}
            />
          </div>

          {/* Price */}
          <PriceInput
            initialCents={product?.price_cents}
            onPriceChange={setPriceCents}
            error={errors.price_cents?.[0]}
          />

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label htmlFor="drawer-category" className="text-sm font-semibold font-sans text-text">
              Category
            </label>
            {!isAddingCategory ? (
              <select
                id="drawer-category"
                value={categoryId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsAddingCategory(true)
                  } else {
                    setCategoryId(e.target.value)
                  }
                }}
                className={inputClass()}
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="__new__">+ New category</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  autoFocus
                  className={inputClass()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsAddingCategory(false)
                      setNewCategoryName('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false)
                    setNewCategoryName('')
                  }}
                  className="px-3 py-2 text-sm font-sans border border-border rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Stock Quantity */}
          <div className="flex flex-col gap-1">
            <label htmlFor="drawer-stock" className="text-sm font-semibold font-sans text-text">
              Stock Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStockQuantity((v) => Math.max(0, v - 1))}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors"
                aria-label="Decrease stock"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <input
                id="drawer-stock"
                type="number"
                min={0}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className={[inputClass(!!errors.stock_quantity), 'text-center w-24'].join(' ')}
              />
              <button
                type="button"
                onClick={() => setStockQuantity((v) => v + 1)}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors"
                aria-label="Increase stock"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {errors.stock_quantity && (
              <p className="text-sm font-sans text-error">{errors.stock_quantity[0]}</p>
            )}
          </div>

          {/* Reorder Threshold */}
          <div className="flex flex-col gap-1">
            <label htmlFor="drawer-reorder" className="text-sm font-semibold font-sans text-text">
              Reorder Threshold
            </label>
            <input
              id="drawer-reorder"
              type="number"
              min={0}
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass(!!errors.reorder_threshold)}
            />
            <p className="text-sm font-sans text-text-muted">
              Alert when stock falls below this number.
            </p>
            {errors.reorder_threshold && (
              <p className="text-sm font-sans text-error">{errors.reorder_threshold[0]}</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="drawer-active" className="text-sm font-semibold font-sans text-text">
              {isActive ? 'Active' : 'Inactive'}
            </label>
            <button
              type="button"
              id="drawer-active"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={[
                'relative w-11 h-6 rounded-full transition-colors duration-150',
                isActive ? 'bg-navy' : 'bg-border',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-150',
                  isActive ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
              <span className="sr-only">{isActive ? 'Active' : 'Inactive'}</span>
            </button>
          </div>

          {/* Global form error */}
          {errors._form && (
            <p className="text-sm font-sans text-error">{errors._form[0]}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-3 flex-shrink-0">
          {/* Deactivate button — edit mode only */}
          {isEditMode && product?.is_active && (
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              className="text-sm font-semibold font-sans text-error hover:bg-error/10 px-3 py-2 rounded-[var(--radius-md)] transition-colors"
            >
              Deactivate Product
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold font-sans border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="product-form"
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold font-sans bg-navy text-white rounded-[var(--radius-md)] hover:bg-navy-light transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Save Product'
            )}
          </button>
        </div>
      </div>

      {/* Discard confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="bg-card rounded-[var(--radius-lg)] p-6 max-w-sm w-full mx-4 shadow-xl border border-border">
            <p className="text-base font-semibold font-sans text-text mb-4">
              You have unsaved changes. Discard?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm font-semibold font-sans border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 text-sm font-semibold font-sans border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirmation dialog */}
      {showDeactivateConfirm && product && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDeactivateConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-[var(--radius-lg)] p-6 max-w-sm w-full mx-4 shadow-xl border border-border">
            <h3 className="text-xl font-semibold font-sans text-text mb-2">
              Deactivate {product.name}?
            </h3>
            <p className="text-base font-sans text-text-muted mb-6">
              This product will no longer appear in the POS or online store.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-4 py-2 text-sm font-semibold font-sans border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors"
              >
                Keep Product Active
              </button>
              <button
                type="button"
                onClick={handleDeactivateConfirm}
                disabled={isDeactivating}
                className="px-4 py-2 text-sm font-semibold font-sans bg-error text-white rounded-[var(--radius-md)] hover:bg-error/90 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {isDeactivating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deactivating...
                  </>
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
