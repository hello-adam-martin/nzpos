/**
 * NZ GST calculation — per-line on discounted amounts.
 *
 * D-09 specifies: gstCents = Math.round(discountedPriceCents * qty * 3 / 23)
 * This implementation uses the equivalent formula on the already-computed line total:
 *   gstCents = Math.round(lineTotal * 3 / 23)
 * These are mathematically identical because lineTotal = discountedPriceCents * qty.
 * The 3/23 ratio is derived from: GST rate 15% means tax = price * 15/115 = price * 3/23.
 */

export function gstFromInclusiveCents(inclusiveCents: number): number {
  return Math.round(inclusiveCents * 3 / 23)
}

export function calcLineItem(
  unitPriceCents: number,
  qty: number,
  discountCents: number = 0
): { lineTotal: number; gst: number; excl: number } {
  const lineTotal = unitPriceCents * qty - discountCents
  const gst = gstFromInclusiveCents(lineTotal)
  const excl = lineTotal - gst
  return { lineTotal, gst, excl }
}

export function calcOrderGST(lineGSTs: number[]): number {
  return lineGSTs.reduce((sum, g) => sum + g, 0)
}
