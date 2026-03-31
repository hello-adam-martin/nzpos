'use client'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { deleteCategory } from '@/actions/categories/deleteCategory'
import CategoryInlineEditor from './CategoryInlineEditor'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface CategoryRowProps {
  category: Category
  productCount: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDeleted: (id: string) => void
  onRenamed: (id: string, newName: string) => void
}

export default function CategoryRow({
  category,
  productCount,
  isSelected,
  onSelect,
  onDeleted,
  onRenamed,
}: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeletePending, setIsDeletePending] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
  }

  async function handleDeleteConfirm() {
    setIsDeletePending(true)
    setDeleteError(null)
    const result = await deleteCategory({ id: category.id })
    setIsDeletePending(false)
    if (result?.error) {
      const msgs = Object.values(result.error).flat()
      setDeleteError(msgs[0] ?? 'Failed to delete')
    } else {
      setShowDeleteConfirm(false)
      onDeleted(category.id)
    }
  }

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[48px] px-2 py-2 flex items-center"
      >
        <CategoryInlineEditor
          id={category.id}
          initialName={category.name}
          onClose={() => setIsEditing(false)}
          onSaved={(newName) => onRenamed(category.id, newName)}
        />
      </div>
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={[
          'min-h-[48px] flex items-center gap-1 px-2 rounded-[var(--radius-md)] group cursor-pointer transition-colors duration-100',
          isDragging ? 'shadow-sm' : '',
          isSelected ? 'bg-navy text-white' : 'hover:bg-surface text-text',
        ].join(' ')}
        onClick={() => onSelect(category.id)}
      >
        {/* Drag handle — 44x44px touch target */}
        <button
          {...attributes}
          {...listeners}
          className="w-11 h-11 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing text-text-light hover:text-text-muted rounded-[var(--radius-sm)] transition-colors"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          tabIndex={0}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          </svg>
        </button>

        {/* Category name */}
        <span className="flex-1 text-sm font-semibold font-sans truncate">
          {category.name}
        </span>

        {/* Product count badge */}
        <span
          className={[
            'text-xs font-sans px-1.5 py-0.5 rounded-full flex-shrink-0',
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-surface text-text-muted',
          ].join(' ')}
        >
          {productCount}
        </span>

        {/* Edit icon */}
        <button
          className={[
            'w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
            isSelected
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-text-muted hover:text-text hover:bg-surface',
          ].join(' ')}
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          aria-label={`Edit ${category.name}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Delete icon */}
        <button
          className={[
            'w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-error hover:bg-error/10 disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
          onClick={(e) => {
            e.stopPropagation()
            if (productCount === 0) setShowDeleteConfirm(true)
          }}
          disabled={productCount > 0}
          title={productCount > 0 ? 'Move or remove all products from this category first.' : `Delete ${category.name}`}
          aria-label={`Delete ${category.name}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-card rounded-[var(--radius-lg)] p-6 max-w-sm w-full mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-text mb-2">
              Delete {category.name}?
            </h3>
            <p className="text-sm font-sans text-text-muted mb-4">
              This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-error mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletePending}
                className="px-4 py-2 text-sm font-semibold font-sans rounded-[var(--radius-md)] border border-border text-text hover:bg-surface transition-colors disabled:opacity-50"
              >
                Keep Category
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeletePending}
                className="px-4 py-2 text-sm font-semibold font-sans rounded-[var(--radius-md)] bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {isDeletePending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
