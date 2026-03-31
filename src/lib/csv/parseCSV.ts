import Papa from 'papaparse'

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCSVText(csvText: string): ParsedCSV {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
  }
}
