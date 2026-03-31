'use client'
import { useId } from 'react'
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
import { reorderCategories } from '@/actions/categories/reorderCategories'
import CategoryRow from './CategoryRow'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface SortableCategoryListProps {
  categories: Category[]
  productCounts: Record<string, number>
  selectedCategoryId: string | null
  onCategorySelect: (id: string | null) => void
  onCategoriesChange: (categories: Category[]) => void
  onDeleted: (id: string) => void
  onRenamed: (id: string, newName: string) => void
}

export default function SortableCategoryList({
  categories,
  productCounts,
  selectedCategoryId,
  onCategorySelect,
  onCategoriesChange,
  onDeleted,
  onRenamed,
}: SortableCategoryListProps) {
  const dndId = useId()
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

    onCategoriesChange(reordered)

    await reorderCategories({
      categories: reordered.map((cat, index) => ({ id: cat.id, sort_order: index })),
    })
  }

  return (
    <DndContext
      id={dndId}
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
            onSelect={(id) => onCategorySelect(id)}
            onDeleted={onDeleted}
            onRenamed={onRenamed}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
