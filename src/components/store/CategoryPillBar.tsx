'use client'

import { useRouter } from 'next/navigation'

interface CategoryPillBarProps {
  categories: { id: string; name: string; slug: string }[]
  activeCategory: string | null
}

export function CategoryPillBar({ categories, activeCategory }: CategoryPillBarProps) {
  const router = useRouter()

  function handlePillClick(slug: string | null) {
    if (slug === null || slug === activeCategory) {
      router.push('/')
    } else {
      router.push(`/?category=${slug}`)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Filter by category"
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sticky top-16 z-40 bg-bg py-3"
    >
      {/* All pill */}
      <button
        role="radio"
        aria-checked={activeCategory === null}
        onClick={() => handlePillClick(null)}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
          activeCategory === null
            ? 'bg-navy text-white'
            : 'border border-border text-navy hover:bg-surface'
        }`}
      >
        All
      </button>

      {categories.map((category) => {
        const isActive = activeCategory === category.slug
        return (
          <button
            key={category.id}
            role="radio"
            aria-checked={isActive}
            onClick={() => handlePillClick(category.slug)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-navy text-white'
                : 'border border-border text-navy hover:bg-surface'
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
