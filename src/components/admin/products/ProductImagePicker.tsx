'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'

interface ProductImagePickerProps {
  initialImageUrl?: string | null
  onImageUrl: (url: string | null) => void
}

export default function ProductImagePicker({
  initialImageUrl,
  onImageUrl,
}: ProductImagePickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Client-side size validation: 10MB max
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10MB.')
      return
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    // Upload
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/products/image', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError('Upload failed. Check your connection and try again.')
        setPreviewUrl(initialImageUrl ?? null)
        onImageUrl(null)
      } else {
        setPreviewUrl(json.url)
        onImageUrl(json.url)
      }
    } catch {
      setError('Upload failed. Check your connection and try again.')
      setPreviewUrl(initialImageUrl ?? null)
      onImageUrl(null)
    } finally {
      setIsUploading(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold font-sans text-text">Product Image</label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose product image"
      />

      {/* Picker area */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className={[
          'w-[200px] h-[200px] rounded-[var(--radius-md)] border-2 border-dashed border-border',
          'flex flex-col items-center justify-center gap-2 overflow-hidden',
          'bg-surface hover:bg-surface/80 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'relative',
        ].join(' ')}
        aria-label="Click to choose a photo"
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Product image preview"
            width={200}
            height={200}
            className="object-cover w-full h-full absolute inset-0"
            unoptimized={previewUrl.startsWith('blob:')}
          />
        ) : (
          <>
            {/* Placeholder navy silhouette */}
            <svg
              className="w-10 h-10 text-navy/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-sm font-sans text-text-muted text-center px-3">
              Click to choose a photo
            </span>
          </>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-navy animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </button>

      {/* Upload progress bar */}
      {isUploading && (
        <div className="w-[200px] h-1 bg-surface rounded-full overflow-hidden">
          <div className="h-full bg-navy animate-pulse rounded-full" style={{ width: '60%' }} />
        </div>
      )}

      {/* Helper text */}
      <p className="text-sm font-sans text-text-muted">
        JPEG, PNG or WebP. Any size — we&apos;ll resize it for you.
      </p>

      {/* Error */}
      {error && (
        <p className="text-sm font-sans text-error">{error}</p>
      )}
    </div>
  )
}
