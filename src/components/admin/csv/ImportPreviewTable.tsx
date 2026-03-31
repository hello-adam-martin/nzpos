'use client'

import { generateErrorCSV } from '@/lib/csv/generateErrorReport'
import type { ValidatedRow } from '@/lib/csv/validateRows'
import { ImportSummaryBar } from './ImportSummaryBar'

interface ImportPreviewTableProps {
  validatedRows: ValidatedRow[]
  onCommit: () => void
  isCommitting: boolean
  onBack: () => void
}

export function ImportPreviewTable({
  validatedRows,
  onCommit,
  isCommitting,
  onBack,
}: ImportPreviewTableProps) {
  const newRows = validatedRows.filter((r) => r.status === 'new')
  const duplicateRows = validatedRows.filter((r) => r.status === 'duplicate')
  const invalidRows = validatedRows.filter((r) => r.status === 'invalid')

  const newCount = newRows.length
  const duplicateCount = duplicateRows.length
  const errorCount = invalidRows.length

  // Show first 10 rows for preview
  const previewRows = validatedRows.slice(0, 10)

  function getRowBg(status: ValidatedRow['status']) {
    switch (status) {
      case 'new':
        return 'bg-emerald-50'
      case 'duplicate':
        return 'bg-amber-50'
      case 'invalid':
        return 'bg-red-50'
    }
  }

  function handleDownloadErrors() {
    const csv = generateErrorCSV(invalidRows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-errors.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Review and import
      </h3>

      <ImportSummaryBar
        newCount={newCount}
        duplicateCount={duplicateCount}
        errorCount={errorCount}
      />

      {/* Preview table */}
      <div className="overflow-hidden rounded-lg border border-[#E7E5E4]">
        <table className="w-full text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <thead>
            <tr className="bg-[#1E293B] text-white">
              <th className="px-3 py-3 text-left font-semibold">Row</th>
              <th className="px-3 py-3 text-left font-semibold">Name</th>
              <th className="px-3 py-3 text-left font-semibold">SKU</th>
              <th className="px-3 py-3 text-left font-semibold">Price</th>
              <th className="px-3 py-3 text-left font-semibold">Status / Error</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.rowIndex} className={getRowBg(row.status)}>
                <td className="px-3 py-3 text-[#78716C]">{row.rowIndex}</td>
                <td className="px-3 py-3 font-medium text-[#1C1917]">
                  {row.productData?.name ?? row.data[Object.keys(row.data)[0]] ?? '—'}
                </td>
                <td className="px-3 py-3 font-mono text-[#78716C]">
                  {row.productData?.sku ?? '—'}
                </td>
                <td className="px-3 py-3 font-mono text-[#1C1917]">
                  {row.productData?.price_cents != null
                    ? `$${(row.productData.price_cents / 100).toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-3 py-3">
                  {row.status === 'new' && (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      New
                    </span>
                  )}
                  {row.status === 'duplicate' && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Row {row.rowIndex}: SKU already exists — will be skipped.
                    </span>
                  )}
                  {row.status === 'invalid' && (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Row {row.rowIndex}: {row.errors.join('; ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {validatedRows.length > 10 && (
        <p className="text-sm text-[#78716C]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Showing first 10 of {validatedRows.length} rows.
        </p>
      )}

      {/* Confirmation text */}
      {newCount > 0 && (
        <p className="text-sm text-[#78716C]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          This will add {newCount} product{newCount !== 1 ? 's' : ''} to your catalog. You cannot undo this action.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-[#E7E5E4] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#F5F5F4]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Back
          </button>

          {errorCount > 0 && (
            <button
              onClick={handleDownloadErrors}
              className="rounded-lg border border-[#E7E5E4] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#F5F5F4]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Download Error Report ({errorCount} row{errorCount !== 1 ? 's' : ''})
            </button>
          )}
        </div>

        <button
          onClick={onCommit}
          disabled={newCount === 0 || isCommitting}
          className="rounded-lg bg-[#1E293B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {isCommitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importing…
            </span>
          ) : (
            `Import ${newCount} Product${newCount !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  )
}
