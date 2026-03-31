'use client'

import type { ColumnMapping } from '@/lib/csv/validateRows'

interface ProductField {
  key: keyof ColumnMapping
  label: string
  required: boolean
}

const PRODUCT_FIELDS: ProductField[] = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'price', label: 'Price', required: true },
  { key: 'sku', label: 'SKU', required: false },
  { key: 'barcode', label: 'Barcode', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'stock_quantity', label: 'Stock Quantity', required: false },
  { key: 'reorder_threshold', label: 'Reorder Threshold', required: false },
]

// Fuzzy pre-fill: maps CSV header keywords to product fields
function fuzzyMatch(header: string): keyof ColumnMapping | null {
  const lower = header.toLowerCase()
  if (lower.includes('name')) return 'name'
  if (lower.includes('price')) return 'price'
  if (lower.includes('sku')) return 'sku'
  if (lower.includes('barcode')) return 'barcode'
  if (lower.includes('category') || lower.includes('cat')) return 'category'
  if (lower.includes('stock') || lower.includes('qty') || lower.includes('quantity')) return 'stock_quantity'
  if (lower.includes('reorder') || lower.includes('threshold')) return 'reorder_threshold'
  return null
}

export function buildInitialMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  // Track which fields have been auto-mapped to avoid duplicate assignments
  const usedFields = new Set<keyof ColumnMapping>()

  for (const header of headers) {
    const field = fuzzyMatch(header)
    if (field && !usedFields.has(field)) {
      mapping[field] = header
      usedFields.add(field)
    }
  }
  return mapping
}

interface ColumnMapperStepProps {
  headers: string[]
  columnMapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
  onNext: () => void
  onBack: () => void
}

export function ColumnMapperStep({
  headers,
  columnMapping,
  onMappingChange,
  onNext,
  onBack,
}: ColumnMapperStepProps) {
  const requiredMapped =
    !!columnMapping.name && columnMapping.name !== '' &&
    !!columnMapping.price && columnMapping.price !== ''

  function handleSelectChange(field: keyof ColumnMapping, value: string) {
    onMappingChange({ ...columnMapping, [field]: value === '' ? undefined : value })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Map your columns
      </h3>
      <p className="text-sm text-[#78716C]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Match each product field to the corresponding column in your CSV. Fields marked with <span className="text-[#DC2626]">*</span> are required.
      </p>

      <div className="overflow-hidden rounded-lg border border-[#E7E5E4]">
        <table className="w-full text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <thead>
            <tr className="bg-[#1E293B] text-white">
              <th className="px-4 py-3 text-left font-semibold">Product field</th>
              <th className="px-4 py-3 text-left font-semibold">Your CSV column</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_FIELDS.map((field, i) => (
              <tr
                key={field.key}
                className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F5F4]'}
              >
                <td className="px-4 py-3 font-medium text-[#1C1917]">
                  {field.label}
                  {field.required && <span className="ml-1 text-[#DC2626]">*</span>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={columnMapping[field.key] ?? ''}
                    onChange={(e) => handleSelectChange(field.key, e.target.value)}
                    className="w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-sm text-[#1C1917] focus:border-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                  >
                    <option value="">-- Not mapped --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-[#E7E5E4] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#F5F5F4]"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!requiredMapped}
          className="rounded-lg bg-[#1E293B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
