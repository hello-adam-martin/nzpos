'use client'

import { useState, useEffect } from 'react'
import { parseCSVText, type ParsedCSV } from '@/lib/csv/parseCSV'
import { validateImportRows, type ColumnMapping, type ValidatedRow } from '@/lib/csv/validateRows'
import { buildInitialMapping } from './ColumnMapperStep'
import { importProducts } from '@/actions/products/importProducts'
import { CSVUploadStep } from './CSVUploadStep'
import { ColumnMapperStep } from './ColumnMapperStep'
import { ImportPreviewTable } from './ImportPreviewTable'

type Step = 'upload' | 'map' | 'preview' | 'committing' | 'done'

const STEP_LABELS = ['Upload', 'Map Columns', 'Review & Import'] as const
const STEP_KEYS: Array<Exclude<Step, 'committing' | 'done'>> = ['upload', 'map', 'preview']

function stepIndex(step: Step): number {
  const idx = STEP_KEYS.indexOf(step as 'upload' | 'map' | 'preview')
  if (step === 'committing' || step === 'done') return 2
  return idx
}

interface CSVImportFlowProps {
  onClose: () => void
}

export function CSVImportFlow({ onClose }: CSVImportFlowProps) {
  const [step, setStep] = useState<Step>('upload')

  // Inter-step state — all lifted to avoid reset on navigation
  const [csvText, setCsvText] = useState<string | null>(null)
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([])
  const [importResult, setImportResult] = useState<{
    imported: number
    errors: Array<{ row: number; message: string }>
  } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Build initial column mapping when headers change (step 1 -> step 2)
  useEffect(() => {
    if (parsedCSV?.headers && step === 'map') {
      setColumnMapping((prev) => {
        // Only auto-populate if mapping is empty (don't reset on back navigation)
        if (Object.keys(prev).length === 0) {
          return buildInitialMapping(parsedCSV.headers)
        }
        return prev
      })
    }
  }, [parsedCSV, step])

  function handleParsed(text: string, parsed: ParsedCSV) {
    setCsvText(text)
    setParsedCSV(parsed)
  }

  function handleAdvanceToMap() {
    if (!parsedCSV || parsedCSV.rows.length === 0) return
    if (Object.keys(columnMapping).length === 0) {
      setColumnMapping(buildInitialMapping(parsedCSV.headers))
    }
    setStep('map')
  }

  function handleAdvanceToPreview() {
    if (!parsedCSV || !columnMapping.name || !columnMapping.price) return
    // Validate rows with empty existingSKUs and existingCategories
    // (Server Action handles actual DB state; preview uses in-memory validation)
    const validated = validateImportRows(
      parsedCSV.rows,
      columnMapping,
      new Set<string>(),
      new Map<string, string>()
    )
    setValidatedRows(validated)
    setStep('preview')
  }

  async function handleCommit() {
    const newRows = validatedRows.filter((r) => r.status === 'new' && r.productData)
    if (newRows.length === 0) return

    setStep('committing')
    setImportError(null)

    try {
      const result = await importProducts(newRows.map((r) => r.productData!))

      if ('error' in result) {
        setImportError(result.error)
        setStep('preview')
        return
      }

      setImportResult({ imported: result.imported, errors: result.errors })
      setStep('done')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed. Please try again.')
      setStep('preview')
    }
  }

  const currentStepIndex = stepIndex(step)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E4] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1E293B]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Import Products from CSV
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-0 border-b border-[#E7E5E4] px-6 py-4">
            {STEP_LABELS.map((label, idx) => {
              const isActive = idx === currentStepIndex
              const isCompleted = idx < currentStepIndex

              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                        isCompleted
                          ? 'bg-[#1E293B] text-white'
                          : isActive
                          ? 'border-2 border-[#1E293B] bg-white text-[#1E293B]'
                          : 'border border-[#E7E5E4] bg-white text-[#A8A29E]',
                      ].join(' ')}
                    >
                      {isCompleted ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={[
                        'mt-1 text-xs font-medium',
                        isActive ? 'text-[#1E293B] underline underline-offset-2' : isCompleted ? 'text-[#1E293B]' : 'text-[#A8A29E]',
                      ].join(' ')}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div
                      className={[
                        'mx-3 mb-5 h-px w-16',
                        idx < currentStepIndex ? 'bg-[#1E293B]' : 'bg-[#E7E5E4]',
                      ].join(' ')}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Step content */}
        <div className="p-6">
          {step === 'upload' && (
            <CSVUploadStep
              onParsed={handleParsed}
              onNext={handleAdvanceToMap}
              parsedCSV={parsedCSV}
              csvText={csvText}
            />
          )}

          {step === 'map' && parsedCSV && (
            <ColumnMapperStep
              headers={parsedCSV.headers}
              columnMapping={columnMapping}
              onMappingChange={setColumnMapping}
              onNext={handleAdvanceToPreview}
              onBack={() => setStep('upload')}
            />
          )}

          {(step === 'preview' || step === 'committing') && (
            <>
              {importError && (
                <div className="mb-4 rounded-lg border border-[#DC2626]/30 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                  {importError}
                </div>
              )}
              <ImportPreviewTable
                validatedRows={validatedRows}
                onCommit={handleCommit}
                isCommitting={step === 'committing'}
                onBack={() => setStep('map')}
              />
            </>
          )}

          {step === 'done' && importResult && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  Import complete
                </p>
                <p className="mt-1 text-sm text-[#78716C]">
                  {importResult.imported} product{importResult.imported !== 1 ? 's' : ''} added to your catalog.
                </p>
                {importResult.errors.length > 0 && (
                  <p className="mt-1 text-sm text-[#DC2626]">
                    {importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} failed to import.
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg bg-[#1E293B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#334155]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
