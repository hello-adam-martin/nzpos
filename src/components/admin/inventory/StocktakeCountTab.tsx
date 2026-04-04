'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { updateStocktakeLine } from '@/actions/inventory/updateStocktakeLine'
import { lookupBarcode } from '@/actions/products/lookupBarcode'
import { ScanBarcode } from 'lucide-react'

const BarcodeScannerSheet = dynamic(
  () => import('@/components/pos/BarcodeScannerSheet').then((m) => m.BarcodeScannerSheet),
  { ssr: false }
)

type StocktakeLine = {
  id: string
  product_id: string
  system_snapshot_quantity: number
  counted_quantity: number | null
  products: {
    name: string
    sku: string | null
    barcode: string | null
  } | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface StocktakeCountTabProps {
  lines: StocktakeLine[]
  sessionStatus: string
}

export function StocktakeCountTab({ lines, sessionStatus }: StocktakeCountTabProps) {
  const [counts, setCounts] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {}
    for (const line of lines) {
      initial[line.id] = line.counted_quantity
    }
    return initial
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [notInStocktake, setNotInStocktake] = useState(false)

  const [, startTransition] = useTransition()
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInProgress = sessionStatus === 'in_progress'

  const debouncedSave = useCallback(
    (lineId: string, value: number | null) => {
      if (debounceTimers.current[lineId]) {
        clearTimeout(debounceTimers.current[lineId])
      }
      debounceTimers.current[lineId] = setTimeout(() => {
        setSaveState('saving')
        startTransition(async () => {
          const result = await updateStocktakeLine({ line_id: lineId, counted_quantity: value })
          if ('error' in result) {
            setSaveState('error')
          } else {
            setSaveState('saved')
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
            savedTimerRef.current = setTimeout(() => {
              setSaveState('idle')
            }, 2000)
          }
        })
      }, 800)
    },
    []
  )

  function handleCountChange(lineId: string, rawValue: string) {
    if (!isInProgress) return
    const value = rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10))
    if (rawValue !== '' && isNaN(value as number)) return
    setCounts((prev) => ({ ...prev, [lineId]: value }))
    debouncedSave(lineId, value)
  }

  // Barcode scan handler
  const handleProductFound = useCallback(
    async (product: { id: string; name: string; barcode: string | null } & Record<string, unknown>) => {
      setScannerOpen(false)
      const matchingLine = lines.find((l) => l.product_id === product.id)
      if (!matchingLine) {
        setNotInStocktake(true)
        setTimeout(() => setNotInStocktake(false), 3000)
        return
      }

      setHighlightedProductId(product.id)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => setHighlightedProductId(null), 2000)

      // Scroll to and focus the row input
      const input = inputRefs.current.get(product.id)
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
        input.focus()
      }
    },
    [lines]
  )

  // Lookup barcode and find product in lines
  async function handleBarcodeFromScanner(barcodeProduct: { id: string; name: string; barcode: string | null } & Record<string, unknown>) {
    await handleProductFound(barcodeProduct)
  }

  // Filter lines by search query
  const filteredLines = lines.filter((line) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const name = line.products?.name?.toLowerCase() ?? ''
    const sku = line.products?.sku?.toLowerCase() ?? ''
    const barcode = line.products?.barcode?.toLowerCase() ?? ''
    return name.includes(q) || sku.includes(q) || barcode.includes(q)
  })

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer)
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  return (
    <div className="space-y-[var(--space-md)]">
      {/* Search bar and save indicator */}
      <div className="flex items-center gap-[var(--space-md)]">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full border border-border rounded-md px-[var(--space-md)] py-[var(--space-sm)] text-sm font-body text-text placeholder:text-muted bg-card focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
        </div>

        {/* Barcode scanner button */}
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          disabled={!isInProgress}
          aria-label="Scan barcode to find product"
          className={[
            'flex items-center gap-1.5 border border-border rounded-md px-3 py-2 text-sm font-medium font-body bg-navy text-white',
            !isInProgress ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 transition-opacity cursor-pointer',
          ].join(' ')}
        >
          <ScanBarcode size={16} aria-hidden="true" />
          <span>Scan</span>
        </button>

        {/* Save indicator */}
        <div className="min-w-[120px] text-right">
          {saveState === 'saving' && (
            <span className="text-sm font-body text-muted">
              Saving
              <span className="inline-block animate-[ellipsis_1.2s_steps(4,end)_infinite]">...</span>
            </span>
          )}
          {saveState === 'saved' && (
            <span className="text-sm font-body text-muted transition-opacity duration-150 ease-in">
              Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-sm font-body text-error">
              Save failed — check connection
            </span>
          )}
        </div>
      </div>

      {/* Not in stocktake message */}
      {notInStocktake && (
        <div className="text-sm text-warning font-body bg-warning/10 border border-warning rounded-md px-[var(--space-md)] py-[var(--space-sm)]">
          Product not in this stocktake
        </div>
      )}

      {/* Count table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white text-sm font-bold font-body">
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Product</th>
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">SKU</th>
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Barcode</th>
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Counted Qty</th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-[var(--space-md)] py-[var(--space-2xl)] text-center text-sm text-muted font-body">
                  {searchQuery ? 'No products match your search.' : 'No products in this stocktake.'}
                </td>
              </tr>
            ) : (
              filteredLines.map((line, i) => {
                const isHighlighted = highlightedProductId === line.product_id
                return (
                  <tr
                    key={line.id}
                    id={`stocktake-row-${line.product_id}`}
                    className={[
                      i % 2 === 0 ? 'bg-card' : 'bg-surface',
                      isHighlighted
                        ? 'bg-amber/10 border-l-4 border-amber transition-colors duration-150 ease-out'
                        : 'border-l-4 border-transparent transition-colors duration-150 ease-out',
                    ].join(' ')}
                  >
                    <td className="px-[var(--space-md)] py-[var(--space-sm)] text-text font-body">
                      {line.products?.name ?? 'Unknown product'}
                    </td>
                    <td className="px-[var(--space-md)] py-[var(--space-sm)] font-mono text-muted">
                      {line.products?.sku ?? '—'}
                    </td>
                    <td className="px-[var(--space-md)] py-[var(--space-sm)] font-mono text-muted">
                      {line.products?.barcode ?? '—'}
                    </td>
                    <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                      <input
                        ref={(el) => {
                          if (el) {
                            inputRefs.current.set(line.product_id, el)
                          } else {
                            inputRefs.current.delete(line.product_id)
                          }
                        }}
                        type="number"
                        min="0"
                        value={counts[line.id] === null || counts[line.id] === undefined ? '' : counts[line.id]!}
                        onChange={(e) => handleCountChange(line.id, e.target.value)}
                        disabled={!isInProgress}
                        placeholder="—"
                        aria-label={`Counted quantity for ${line.products?.name ?? 'product'}`}
                        className={[
                          'w-16 text-center font-mono text-base border border-border rounded-md px-2 py-1',
                          'focus:outline-none focus:ring-2 focus:ring-navy/30',
                          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          !isInProgress ? 'bg-surface text-muted cursor-not-allowed' : 'bg-card',
                        ].join(' ')}
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Barcode scanner overlay */}
      {scannerOpen && (
        <BarcodeScannerSheet
          onProductFound={(product) => void handleBarcodeFromScanner(product as { id: string; name: string; barcode: string | null } & Record<string, unknown>)}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <style>{`
        @keyframes ellipsis {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
      `}</style>
    </div>
  )
}
