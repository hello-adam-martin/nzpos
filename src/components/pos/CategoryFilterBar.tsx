import type { Database } from '@/types/database'

type CategoryRow = Database['public']['Tables']['categories']['Row']

type CategoryFilterBarProps = {
  categories: CategoryRow[]
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

export function CategoryFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterBarProps) {
  return (
    <div className="bg-surface border-b border-border shrink-0">
      <div className="flex overflow-x-auto gap-2 px-4 py-2 scrollbar-hide">
        {/* "All" pill */}
        <button
          onClick={() => onSelectCategory(null)}
          className={[
            'min-h-[44px] px-4 rounded-full text-sm font-normal whitespace-nowrap shrink-0 cursor-pointer',
            selectedCategory === null
              ? 'bg-navy text-white'
              : 'bg-card text-navy border border-border',
          ].join(' ')}
        >
          All
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={[
              'min-h-[44px] px-4 rounded-full text-sm font-normal whitespace-nowrap shrink-0 cursor-pointer',
              selectedCategory === category.id
                ? 'bg-navy text-white'
                : 'bg-card text-navy border border-border',
            ].join(' ')}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}
