'use client'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { createCategory } from '@/actions/categories/createCategory'
import { reorderCategories } from '@/actions/categories/reorderCategories'
import CategoryRow from './CategoryRow'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface CategorySidebarPanelProps {
  initialCategories: Category[]
  productCounts?: Record<string, number>
  selectedCategoryId?: string | null
  onCategorySelect?: (id: string | null) => void
}

export default function CategorySidebarPanel({
  initialCategories,
  productCounts = {},
  selectedCategoryId = null,
  onCategorySelect,
}: CategorySidebarPanelProps) {
  const [categories, setCategories] = useState<Category[]>(
    [...initialCategories].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAddPending, setIsAddPending] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)

    // Optimistic update
    setCategories(reordered)

    // Persist new sort_order values
    await reorderCategories({
      categories: reordered.map((cat, index) => ({ id: cat.id, sort_order: index })),
    })
  }

  async function handleAddCategory() {
    if (!newName.trim()) {
      setAddError('This field is required.')
      return
    }
    setIsAddPending(true)
    setAddError(null)
    const result = await createCategory({ name: newName.trim() })
    setIsAddPending(false)
    if (result?.error) {
      const msgs = Object.values(result.error).flat()
      setAddError(msgs[0] ?? 'Failed to create')
    } else if (result?.success && result.category) {
      setCategories((prev) => [...prev, result.category as Category])
      setNewName('')
      setIsAddingNew(false)
    }
  }

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCategory()
    } else if (e.key === 'Escape') {
      setIsAddingNew(false)
      setNewName('')
      setAddError(null)
    }
  }

  function handleDeleted(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    if (selectedCategoryId === id) onCategorySelect?.(null)
  }

  function handleRenamed(id: string, newName: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    )
  }

  return (
    <div className="w-[240px] flex flex-col bg-surface border-r border-border flex-shrink-0">
      {/* Section heading */}
      <div className="px-4 pt-6 pb-3">
        <h2 className="text-xl font-semibold font-sans text-text">Categories</h2>
      </div>

      {/* All categories filter row */}
      <div className="px-2 mb-1">
        <button
          onClick={() => onCategorySelect?.(null)}
          className={[
            'w-full text-left min-h-[48px] px-3 flex items-center text-sm font-semibold font-sans rounded-[var(--radius-md)] transition-colors',
            selectedCategoryId === null
              ? 'bg-navy text-white'
              : 'text-text hover:bg-surface',
          ].join(' ')}
        >
          All products
        </button>
      </div>

      {/* Sortable category list */}
      <div className="flex-1 overflow-y-auto px-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                productCount={productCounts[category.id] ?? 0}
                isSelected={selectedCategoryId === category.id}
                onSelect={(id) => onCategorySelect?.(id)}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {categories.length === 0 && !isAddingNew && (
          <p className="text-sm text-text-muted font-sans px-3 py-2">
            No categories yet. Add one to organise your products.
          </p>
        )}

        {/* Inline new category input */}
        {isAddingNew && (
          <div className="min-h-[48px] px-2 py-2 flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleAddKeyDown}
                autoFocus
                disabled={isAddPending}
                placeholder="Category name"
                className="flex-1 text-sm font-sans px-2 py-1 rounded-[var(--radius-sm)] border border-border focus:outline-none focus:ring-2 focus:ring-navy bg-card text-text disabled:opacity-50"
                aria-label="New category name"
              />
              <button
                onClick={handleAddCategory}
                disabled={isAddPending}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] bg-navy text-white hover:bg-navy-light disabled:opacity-50 transition-colors"
                aria-label="Confirm add category"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false)
                  setNewName('')
                  setAddError(null)
                }}
                disabled={isAddPending}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-muted hover:text-text hover:bg-surface disabled:opacity-50 transition-colors"
                aria-label="Cancel add category"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {addError && (
              <p className="text-xs text-error font-sans">{addError}</p>
            )}
          </div>
        )}
      </div>

      {/* Add category button */}
      {!isAddingNew && (
        <div className="px-4 py-4 border-t border-border">
          <button
            onClick={() => setIsAddingNew(true)}
            className="text-sm font-semibold font-sans text-text-muted hover:text-amber transition-colors"
          >
            + Add Category
          </button>
        </div>
      )}
    </div>
  )
}
