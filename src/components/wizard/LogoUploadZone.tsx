'use client'

import { useRef, useState } from 'react'

interface Props {
  logoUrl: string | null
  onChange: (url: string | null) => void
}

/**
 * LogoUploadZone — drag-drop + click-to-browse logo upload with preview.
 * Uploads to /api/store/logo via POST with FormData.
 * Supports PNG, JPG, SVG. Max 2MB.
 */
export function LogoUploadZone({ logoUrl, onChange }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/store/logo', { method: 'POST', body: formData })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setUploadError(
          data.error ?? 'Upload failed — file may be too large or wrong format. Try again.'
        )
      } else {
        onChange(data.url)
      }
    } catch {
      setUploadError('Upload failed — file may be too large or wrong format. Try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
    // Reset input so re-selecting same file works
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const handleRemove = () => {
    onChange(null)
    setUploadError(null)
  }

  if (logoUrl) {
    return (
      <div className="mb-[var(--space-md)]">
        <div className="flex items-center gap-[var(--space-md)] p-[var(--space-md)] border border-[var(--color-border)] rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo preview"
            className="max-h-[80px] object-contain"
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-[var(--space-md)]">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
        className="sr-only"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Drop zone */}
      <div
        role="button"
        aria-label="Upload logo"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'border-dashed border-2 rounded-lg min-h-[120px] flex flex-col items-center justify-center gap-[var(--space-sm)] cursor-pointer transition-colors duration-150 p-[var(--space-md)]',
          uploadError
            ? 'border-[var(--color-error)]'
            : isDragOver
            ? 'border-[var(--color-navy)] bg-[var(--color-surface)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-navy)]/50',
        ].join(' ')}
      >
        {isUploading ? (
          /* Spinner */
          <svg
            className="w-6 h-6 text-[var(--color-text-muted)] animate-spin"
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
          /* Upload icon */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            className="w-6 h-6 text-[var(--color-text-muted)]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        )}

        <p className="font-sans text-sm text-[var(--color-text)] text-center">
          {isUploading ? 'Uploading...' : 'Drop your logo here, or click to browse'}
        </p>
        <p className="font-sans text-sm text-[var(--color-text-light)] text-center">
          PNG, JPG or SVG — max 2MB
        </p>
      </div>

      {uploadError && (
        <p className="mt-[var(--space-xs)] font-sans text-sm text-[var(--color-error)]" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  )
}
