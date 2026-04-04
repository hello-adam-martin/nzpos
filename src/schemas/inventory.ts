import { z } from 'zod'

// ============================================================
// Reason code constants (D-12, D-13, D-14)
// ============================================================

/** Reason codes that users can select when making a manual stock adjustment. */
export const MANUAL_REASON_CODES = [
  'received',
  'damaged',
  'theft_shrinkage',
  'correction',
  'return_to_supplier',
  'other',
] as const

/** Reason codes set automatically by the system (sale, refund, stocktake). */
export const SYSTEM_REASON_CODES = ['sale', 'refund', 'stocktake'] as const

/** Union of all reason codes (manual + system). */
export const ALL_REASON_CODES = [
  ...MANUAL_REASON_CODES,
  ...SYSTEM_REASON_CODES,
] as const

export type ManualReasonCode = (typeof MANUAL_REASON_CODES)[number]
export type SystemReasonCode = (typeof SYSTEM_REASON_CODES)[number]
export type ReasonCode = (typeof ALL_REASON_CODES)[number]

/** Human-readable display labels for each reason code (per UI-SPEC Copywriting). */
export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  received: 'Received stock',
  damaged: 'Damaged',
  theft_shrinkage: 'Theft / shrinkage',
  correction: 'Correction',
  return_to_supplier: 'Return to supplier',
  other: 'Other',
  sale: 'Sale (system)',
  refund: 'Refund (system)',
  stocktake: 'Stocktake (system)',
}

// ============================================================
// Zod schemas
// ============================================================

/**
 * Input schema for a manual stock adjustment.
 * Only manual reason codes are accepted — system codes (sale, refund, stocktake)
 * are set automatically by RPCs and are not user-selectable.
 */
export const AdjustStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity_delta: z.number().int(),
  reason: z.enum(MANUAL_REASON_CODES),
  notes: z.string().max(500).optional(),
})

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>

/**
 * Input schema for creating a stocktake session.
 * When scope is 'category', a category_id must be provided.
 */
export const CreateStocktakeSchema = z
  .object({
    scope: z.enum(['full', 'category']),
    category_id: z.string().uuid().optional(),
  })
  .refine(
    (data) => data.scope !== 'category' || data.category_id != null,
    { message: 'category_id required when scope is category', path: ['category_id'] }
  )

export type CreateStocktakeInput = z.infer<typeof CreateStocktakeSchema>

/**
 * Input schema for updating a counted quantity on a stocktake line.
 * Zero is a valid count (product was fully out of stock at count time).
 * Negative quantities are not valid.
 */
export const UpdateStocktakeLineSchema = z.object({
  line_id: z.string().uuid(),
  counted_quantity: z.number().int().min(0),
})

export type UpdateStocktakeLineInput = z.infer<typeof UpdateStocktakeLineSchema>
