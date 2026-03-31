export function formatNZD(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = abs % 100
  const formatted = `$${dollars.toLocaleString('en-NZ')}.${String(remainder).padStart(2, '0')}`
  return cents < 0 ? `-${formatted}` : formatted
}

export function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '').trim()
  if (cleaned === '') return null
  const float = parseFloat(cleaned)
  if (isNaN(float) || float < 0) return null
  return Math.round(float * 100)
}
