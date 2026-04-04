/**
 * Formats a cent amount as a NZD currency string (e.g. 1099 → "$10.99").
 * Handles negative values with a leading minus sign.
 *
 * @param cents - Amount in cents (integer)
 * @returns Formatted NZD string with dollar sign and two decimal places
 */
export function formatNZD(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = abs % 100
  const formatted = `$${dollars.toLocaleString('en-NZ')}.${String(remainder).padStart(2, '0')}`
  return cents < 0 ? `-${formatted}` : formatted
}

/**
 * Parses a user-entered price string (e.g. "$12.99", "12.99", "1,299.00") to cents.
 * Strips dollar signs, commas, and whitespace before parsing.
 *
 * @param raw - Raw price string from user input or CSV import
 * @returns Amount in cents (integer), or null if the input is invalid or negative
 */
export function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '').trim()
  if (cleaned === '') return null
  const float = parseFloat(cleaned)
  if (isNaN(float) || float < 0) return null
  return Math.round(float * 100)
}
