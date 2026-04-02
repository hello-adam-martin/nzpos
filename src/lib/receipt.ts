/**
 * Receipt data types and factory function for Phase 8 checkout speed.
 *
 * ReceiptData is the single source of truth for sale receipt display and storage.
 * All fields are serialisable to JSON (for orders.receipt_data JSONB column).
 * Per D-09 and D-13: includes store contact/compliance fields and staff name.
 */

import type { CartItem } from '@/lib/cart'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReceiptLineItem = {
  productId: string
  productName: string
  quantity: number
  unitPriceCents: number
  discountCents: number
  lineTotalCents: number
  gstCents: number
}

export type ReceiptData = {
  orderId: string
  storeName: string
  storeAddress: string
  storePhone: string
  gstNumber: string           // NZ GST registration number
  completedAt: string         // ISO timestamp
  staffName: string
  items: ReceiptLineItem[]
  subtotalCents: number
  gstCents: number
  totalCents: number
  paymentMethod: 'eftpos' | 'cash' | 'split' | 'online'
  cashTenderedCents?: number
  changeDueCents?: number
  customerEmail?: string      // captured on receipt, email sent in Phase 9
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export type BuildReceiptDataParams = {
  orderId: string
  store: {
    name: string
    address: string | null
    phone: string | null
    gst_number: string | null
  }
  staffName: string
  items: CartItem[]
  totals: {
    subtotalCents: number
    gstCents: number
    totalCents: number
  }
  paymentMethod: 'eftpos' | 'cash' | 'split' | 'online'
  cashTenderedCents?: number
  changeDueCents?: number
  customerEmail?: string
}

/**
 * Construct a complete ReceiptData from order + store + staff inputs.
 *
 * Maps CartItem[] to ReceiptLineItem[]. Null store fields default to ''.
 * Sets completedAt to the current ISO timestamp.
 */
export function buildReceiptData(params: BuildReceiptDataParams): ReceiptData {
  const {
    orderId,
    store,
    staffName,
    items,
    totals,
    paymentMethod,
    cashTenderedCents,
    changeDueCents,
    customerEmail,
  } = params

  const receiptItems: ReceiptLineItem[] = items.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents,
    lineTotalCents: item.lineTotalCents,
    gstCents: item.gstCents,
  }))

  const receipt: ReceiptData = {
    orderId,
    storeName: store.name,
    storeAddress: store.address ?? '',
    storePhone: store.phone ?? '',
    gstNumber: store.gst_number ?? '',
    completedAt: new Date().toISOString(),
    staffName,
    items: receiptItems,
    subtotalCents: totals.subtotalCents,
    gstCents: totals.gstCents,
    totalCents: totals.totalCents,
    paymentMethod,
  }

  if (cashTenderedCents !== undefined) {
    receipt.cashTenderedCents = cashTenderedCents
  }
  if (changeDueCents !== undefined) {
    receipt.changeDueCents = changeDueCents
  }
  if (customerEmail !== undefined) {
    receipt.customerEmail = customerEmail
  }

  return receipt
}
