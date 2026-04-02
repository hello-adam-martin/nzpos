'use client'

import { ScanBarcode } from 'lucide-react'

type BarcodeScannerButtonProps = {
  onScanOpen: () => void
  disabled?: boolean
}

export function BarcodeScannerButton({ onScanOpen, disabled = false }: BarcodeScannerButtonProps) {
  return (
    <button
      type="button"
      onClick={onScanOpen}
      disabled={disabled}
      aria-label="Scan barcode to add product"
      className={[
        'flex items-center gap-1.5 border border-border rounded-md px-3 py-2 text-sm font-medium text-white',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-white/10 transition-colors cursor-pointer',
      ].join(' ')}
    >
      <ScanBarcode size={16} aria-hidden="true" />
      <span>Scan</span>
    </button>
  )
}
