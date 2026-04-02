'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Keyboard, X } from 'lucide-react'
import { lookupBarcode } from '@/actions/products/lookupBarcode'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

type BarcodeScannerSheetProps = {
  onProductFound: (product: ProductRow) => void
  onClose: (hadError: boolean) => void
  /** AudioContext created by caller on user-gesture tap — passed to enable iOS beep */
  audioContext?: AudioContext | null
}

type ScanState = 'idle' | 'scanning' | 'match' | 'no_match' | 'denied'

export function BarcodeScannerSheet({ onProductFound, onClose, audioContext }: BarcodeScannerSheetProps) {
  const viewfinderRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const scanLockRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(audioContext ?? null)
  const hadErrorRef = useRef(false)

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Beep using Web Audio API
  // ---------------------------------------------------------------------------

  function playBeep() {
    try {
      const ctx = audioCtxRef.current
      if (!ctx) return
      // Resume if suspended (iOS Safari requirement)
      void ctx.resume().then(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
      })
    } catch {
      // Beep is non-critical — swallow errors
    }
  }

  // ---------------------------------------------------------------------------
  // Barcode detection handler
  // ---------------------------------------------------------------------------

  const handleBarcodeDetected = useCallback(async (code: string) => {
    if (scanLockRef.current) return

    // Validate: EAN-13 = 13 digits, UPC-A = 12 digits
    const isValid = /^\d{12,13}$/.test(code)
    if (!isValid) return

    scanLockRef.current = true
    setScanState('scanning')

    try {
      // Beep and haptic feedback on detection
      playBeep()
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(80)
      }

      const result = await lookupBarcode(code)

      if ('product' in result && result.product) {
        // Match — flash green, add product, scanner stays open (batch mode D-02)
        setScanState('match')
        onProductFound(result.product)
        setTimeout(() => setScanState('idle'), 300)
      } else {
        // No match — show error pill, then close after 1500ms (D-05, D-06)
        hadErrorRef.current = true
        setScanState('no_match')
        setTimeout(() => {
          onClose(true)
        }, 1500)
      }
    } catch {
      hadErrorRef.current = true
      setScanState('no_match')
      setTimeout(() => {
        onClose(true)
      }, 1500)
    } finally {
      // Unlock after 200ms minimum gap between scans
      setTimeout(() => {
        scanLockRef.current = false
      }, 200)
    }
  }, [onProductFound, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Quagga2 initialization
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!viewfinderRef.current) return
    if (initializedRef.current) return

    initializedRef.current = true

    // Dynamic import to ensure SSR safety (this component is always loaded with ssr: false)
    import('@ericblade/quagga2').then(({ default: Quagga }) => {
      if (!viewfinderRef.current || !initializedRef.current) return

      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: viewfinderRef.current,
            constraints: {
              facingMode: 'environment',
              width: { min: 640 },
              height: { min: 480 },
            },
          },
          decoder: {
            readers: ['ean_reader', 'upc_reader'],
          },
          locate: true,
        },
        (err: Error | null) => {
          if (err) {
            // Camera permission denied or unavailable
            if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
              setScanState('denied')
            } else {
              setScanState('denied')
            }
            return
          }
          Quagga.start()
          setScanState('idle')
        }
      )

      Quagga.onDetected((result: { codeResult: { code: string | null } }) => {
        const code = result.codeResult.code
        if (code) {
          void handleBarcodeDetected(code)
        }
      })
    }).catch(() => {
      setScanState('denied')
    })

    return () => {
      import('@ericblade/quagga2').then(({ default: Quagga }) => {
        Quagga.offDetected()
        Quagga.stop()
      }).catch(() => {})
      initializedRef.current = false
    }
  }, [handleBarcodeDetected])

  // ---------------------------------------------------------------------------
  // Focus management
  // ---------------------------------------------------------------------------

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  // Focus trap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose(hadErrorRef.current)
        return
      }
      if (e.key !== 'Tab') return

      const container = document.getElementById('barcode-scanner-dialog')
      if (!container) return

      const focusable = container.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ---------------------------------------------------------------------------
  // Manual barcode entry
  // ---------------------------------------------------------------------------

  async function handleManualSubmit() {
    const trimmed = manualInput.trim()
    if (!trimmed) return
    setManualInput('')
    await handleBarcodeDetected(trimmed)
  }

  function handleManualKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleManualSubmit()
    }
  }

  // Toggle manual mode and focus input
  function toggleManualMode() {
    setManualMode((prev) => {
      if (!prev) {
        setTimeout(() => manualInputRef.current?.focus(), 50)
      }
      return !prev
    })
  }

  // ---------------------------------------------------------------------------
  // Computed styles
  // ---------------------------------------------------------------------------

  const viewfinderBorderClass =
    scanState === 'match'
      ? 'border-success'
      : scanState === 'no_match'
      ? 'border-error'
      : scanState === 'denied'
      ? 'border-error'
      : 'border-white/30'

  return (
    <div
      id="barcode-scanner-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scanner"
      className="fixed inset-0 z-50 bg-navy-dark/90 flex flex-col items-center justify-between px-4 py-6 animate-[fadeIn_150ms_ease-out]"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <h2 className="text-xl font-bold text-white">
          {scanState === 'denied' ? 'Camera unavailable' : 'Point camera at barcode'}
        </h2>
        <button
          type="button"
          onClick={toggleManualMode}
          aria-label="Toggle manual barcode entry"
          aria-pressed={manualMode}
          className="text-white/60 hover:text-white transition-colors p-2 cursor-pointer"
        >
          <Keyboard size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Camera permission denied state */}
      {scanState === 'denied' ? (
        <div className="flex-1 flex items-center justify-center w-full max-w-md">
          <p className="text-white/70 text-center text-base leading-relaxed">
            Camera access denied. Use the search bar to find products.
          </p>
        </div>
      ) : (
        /* Viewfinder */
        <div className="w-full max-w-md flex-1 flex flex-col gap-3 mt-4">
          <div
            ref={viewfinderRef}
            className={[
              'relative w-full rounded-lg overflow-hidden border-2 transition-colors duration-150 bg-black',
              'min-h-[280px]',
              viewfinderBorderClass,
            ].join(' ')}
            style={{ minHeight: '280px' }}
          >
            {/* Scan line animation (respects prefers-reduced-motion) */}
            <div
              aria-hidden="true"
              className="
                absolute inset-x-0 h-[2px] bg-amber/60 top-0
                motion-safe:animate-[scanLine_1200ms_linear_infinite]
              "
            />
          </div>

          {/* Status pill */}
          <div
            aria-live="assertive"
            aria-atomic="true"
            className="h-8 flex items-center justify-center"
          >
            {scanState === 'scanning' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white/70">
                Scanning...
              </span>
            )}
            {scanState === 'no_match' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-error text-white">
                Barcode not found
              </span>
            )}
          </div>

          {/* Manual entry */}
          {manualMode && (
            <div className="flex gap-2 mt-1">
              <input
                ref={manualInputRef}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleManualKeyDown}
                placeholder="Enter barcode digits"
                aria-label="Manual barcode entry"
                className="flex-1 h-11 px-3 rounded-md border border-border bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber/60 text-base"
              />
              <button
                type="button"
                onClick={() => void handleManualSubmit()}
                className="h-11 px-4 rounded-md bg-amber text-navy-dark font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}

      {/* Close Scanner button */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={() => onClose(hadErrorRef.current)}
        className="w-full max-w-md min-h-[56px] mt-4 rounded-lg border border-white/20 text-white text-base font-medium hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        <X size={16} aria-hidden="true" />
        Close Scanner
      </button>

      {/* Scan line keyframe CSS */}
      <style>{`
        @keyframes scanLine {
          from { transform: translateY(0); }
          to { transform: translateY(280px); }
        }
      `}</style>
    </div>
  )
}
