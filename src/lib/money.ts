export function formatNZD(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = abs % 100
  const formatted = `$${dollars.toLocaleString('en-NZ')}.${String(remainder).padStart(2, '0')}`
  return cents < 0 ? `-${formatted}` : formatted
}
