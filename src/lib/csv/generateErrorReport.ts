import Papa from 'papaparse'
import type { ValidatedRow } from './validateRows'

export function generateErrorCSV(invalidRows: ValidatedRow[]): string {
  const data = invalidRows.map((row) => ({
    'Row Number': row.rowIndex,
    'Name': row.data['name'] ?? row.productData?.name ?? '',
    'SKU': row.data['sku'] ?? row.productData?.sku ?? '',
    'Error': row.errors.join('; '),
  }))

  return Papa.unparse(data, {
    quotes: true,
    header: true,
  })
}
