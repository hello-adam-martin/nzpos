'use client'

interface Props {
  value: string
  onChange: (color: string) => void
}

const SWATCHES = [
  { hex: '#1E293B', name: 'Navy' },
  { hex: '#0F766E', name: 'Teal' },
  { hex: '#0369A1', name: 'Ocean blue' },
  { hex: '#4F46E5', name: 'Indigo' },
  { hex: '#7C3AED', name: 'Violet' },
  { hex: '#BE185D', name: 'Rose' },
  { hex: '#15803D', name: 'Forest green' },
  { hex: '#B45309', name: 'Warm amber' },
]

/**
 * BrandColorPicker — 8 curated color swatches with amber selection ring.
 * Amber outline-ring on selected swatch.
 */
export function BrandColorPicker({ value, onChange }: Props) {
  return (
    <div className="mb-[var(--space-md)]">
      <label className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-sm)]">
        Brand Colour
      </label>

      <div className="flex flex-wrap gap-1">
        {SWATCHES.map((swatch) => {
          const isSelected = value.toLowerCase() === swatch.hex.toLowerCase()
          return (
            <button
              key={swatch.hex}
              type="button"
              aria-label={swatch.name}
              aria-pressed={isSelected}
              onClick={() => onChange(swatch.hex)}
              className="w-10 h-10 rounded-full transition-all duration-100 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-amber)]"
              style={{
                backgroundColor: swatch.hex,
                outline: isSelected ? '3px solid var(--color-amber)' : '3px solid transparent',
                outlineOffset: '2px',
              }}
            />
          )
        })}
      </div>

      <p className="mt-[var(--space-sm)] font-sans text-sm text-[var(--color-text-muted)]">
        This colour appears on your storefront header.
      </p>
    </div>
  )
}
