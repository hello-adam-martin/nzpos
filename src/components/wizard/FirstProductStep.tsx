'use client'

import { useRef, useState } from 'react'
import { WizardStepCard } from './WizardStepCard'
import { saveProductStep } from '@/actions/setup/saveProductStep'
import { dismissWizard } from '@/actions/setup/dismissWizard'

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
  onSave: () => void
  onSkip: () => void
}

/**
 * FirstProductStep — wizard step 3.
 * Optional product creation: name, price (NZD), category, image.
 * "Add Product & Finish" saves and dismisses wizard. "Skip" dismisses without saving.
 */
export function FirstProductStep({ categories, onSave, onSkip }: Props) {
  const [productName, setProductName] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const uploadProductImage = async (file: File) => {
    setIsUploadingImage(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch('/api/products/image', { method: 'POST', body: formData })
      const data = await res.json() as { url?: string; error?: string }
      if (res.ok && data.url) {
        setImageUrl(data.url)
      }
    } catch {
      // Silently fail — image is optional
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    // Parse price string to cents
    const priceCents = priceStr
      ? Math.round(parseFloat(priceStr) * 100)
      : undefined

    const input: Parameters<typeof saveProductStep>[0] = {}
    if (productName.trim()) input.name = productName.trim()
    if (priceCents !== undefined && !isNaN(priceCents)) input.priceCents = priceCents
    if (categoryId) input.categoryId = categoryId
    if (imageUrl) input.imageUrl = imageUrl

    const productResult = await saveProductStep(input)
    if ('error' in productResult) {
      setIsSaving(false)
      setError(productResult.error)
      return
    }

    const dismissResult = await dismissWizard()
    setIsSaving(false)

    if ('error' in dismissResult) {
      setError(dismissResult.error)
      return
    }

    onSave()
  }

  const handleSkip = async () => {
    setIsSaving(true)
    // Mark step complete (no product data) then dismiss
    await saveProductStep({})
    await dismissWizard()
    setIsSaving(false)
    onSkip()
  }

  return (
    <WizardStepCard title="Add your first product">
      {/* Product Name */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="product-name"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Product Name
        </label>
        <input
          id="product-name"
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="e.g. Ceramic mug"
          maxLength={200}
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
      </div>

      {/* Price */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="product-price"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Price
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm text-[var(--color-text-muted)]">
            $
          </span>
          <input
            id="product-price"
            type="text"
            inputMode="decimal"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 pl-7 pr-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
          />
        </div>
        <p className="mt-1 font-sans text-sm text-[var(--color-text-muted)]">Price includes GST.</p>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="mb-[var(--space-md)]">
          <label
            htmlFor="product-category"
            className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
          >
            Category
          </label>
          <select
            id="product-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Product Image — compact upload */}
      <div className="mb-[var(--space-lg)]">
        <label className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]">
          Product Image
        </label>
        <input
          ref={imageInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadProductImage(file)
            e.target.value = ''
          }}
        />
        <div className="flex items-center gap-[var(--space-md)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Product preview"
              className="w-16 h-16 object-cover rounded-md border border-[var(--color-border)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center">
              {isUploadingImage ? (
                <svg
                  className="w-5 h-5 text-[var(--color-text-muted)] animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-[var(--color-text-light)]"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="font-sans text-sm text-[var(--color-navy)] hover:underline"
          >
            {imageUrl ? 'Change image' : 'Add image'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Add Product & Finish'}
      </button>

      {/* Skip CTA */}
      <div className="mt-[var(--space-sm)] text-center">
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSaving}
          className="font-sans text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150 disabled:opacity-60"
        >
          Skip — go to dashboard
        </button>
      </div>
    </WizardStepCard>
  )
}
