'use client'
import { useState, useRef, useEffect } from 'react'
import { updateCategory } from '@/actions/categories/updateCategory'

interface CategoryInlineEditorProps {
  id: string
  initialName: string
  onClose: () => void
  onSaved: (newName: string) => void
}

export default function CategoryInlineEditor({
  id,
  initialName,
  onClose,
  onSaved,
}: CategoryInlineEditorProps) {
  const [name, setName] = useState(initialName)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  async function handleConfirm() {
    if (!name.trim()) {
      setError('This field is required.')
      return
    }
    setIsPending(true)
    setError(null)
    const result = await updateCategory({ id, name: name.trim() })
    setIsPending(false)
    if (result?.error) {
      const msgs = Object.values(result.error).flat()
      setError(msgs[0] ?? 'Failed to save')
    } else {
      onSaved(name.trim())
      onClose()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="flex-1 text-sm font-sans px-2 py-1 rounded-[var(--radius-sm)] border border-border focus:outline-none focus:ring-2 focus:ring-navy bg-card text-text disabled:opacity-50"
          aria-label="Edit category name"
        />
        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] bg-navy text-white hover:bg-navy-light disabled:opacity-50 transition-colors"
          aria-label="Confirm rename"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        {/* Cancel button */}
        <button
          onClick={onClose}
          disabled={isPending}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-muted hover:text-text hover:bg-surface disabled:opacity-50 transition-colors"
          aria-label="Cancel rename"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="text-xs text-error font-sans">{error}</p>
      )}
    </div>
  )
}
