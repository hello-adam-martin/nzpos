/**
 * NZ GST calculation — per-line on discounted amounts.
 *
 * D-09 specifies: gstCents = Math.round(discountedPriceCents * qty * 3 / 23)
 * This implementation uses the equivalent formula on the already-computed line total:
 *   gstCents = Math.round(lineTotal * 3 / 23)
 * These are mathematically identical because lineTotal = discountedPriceCents * qty.
 * The 3/23 ratio is derived from: GST rate 15% means tax = price * 15/115 = price * 3/23.
 */

/**
 * Extracts GST from a GST-inclusive amount using the IRD 3/23 method.
 *
 * @param inclusiveCents - GST-inclusive amount in cents
 * @returns GST component in cents, rounded to nearest cent
 */
export function gstFromInclusiveCents(inclusiveCents: number): number {
  return Math.round(inclusiveCents * 3 / 23)
}

/**
 * Calculates line item totals with GST for a single order line.
 *
 * @param unitPriceCents - Unit price in cents (GST-inclusive)
 * @param qty - Quantity ordered
 * @param discountCents - Total discount applied to the line in cents (default 0)
 * @returns Object with lineTotal, gst, and excl (GST-exclusive) amounts, all in cents
 */
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

/**
 * Sums per-line GST amounts for an order total.
 *
 * @param lineGSTs - Array of per-line GST amounts in cents
 * @returns Total GST in cents
 */
export function calcOrderGST(lineGSTs: number[]): number {
  return lineGSTs.reduce((sum, g) => sum + g, 0)
}
