'use client'

import { useRef, useState } from 'react'
import { parseCSVText, type ParsedCSV } from '@/lib/csv/parseCSV'

interface CSVUploadStepProps {
  onParsed: (csvText: string, parsedCSV: ParsedCSV) => void
  onNext: () => void
  parsedCSV: ParsedCSV | null
  csvText: string | null
}

export function CSVUploadStep({ onParsed, onNext, parsedCSV, csvText }: CSVUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) {
        setError('Could not read file.')
        return
      }
      try {
        const parsed = parseCSVText(text)
        onParsed(text, parsed)
      } catch {
        setError('Failed to parse CSV. Please check the file format.')
      }
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Upload your CSV file
      </h3>

      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E7E5E4] bg-[#F5F5F4] p-8 text-center"
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Upload CSV file"
        />
        <svg
          className="mb-3 h-10 w-10 text-[#78716C]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm font-medium text-[#1C1917]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Click to choose a CSV file
        </p>
        <p className="mt-1 text-sm text-[#78716C]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Only .csv files are accepted
        </p>
      </div>

      {error && (
        <p className="text-sm text-[#DC2626]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {error}
        </p>
      )}

      {parsedCSV && (
        <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
          <p className="text-sm font-semibold text-[#1E293B]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {fileName ?? 'File uploaded'}
          </p>
          <p className="mt-1 text-sm text-[#78716C]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {parsedCSV.rows.length} row{parsedCSV.rows.length !== 1 ? 's' : ''} found &middot; {parsedCSV.headers.length} column{parsedCSV.headers.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!parsedCSV || parsedCSV.rows.length === 0}
          className="rounded-lg bg-[#1E293B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
