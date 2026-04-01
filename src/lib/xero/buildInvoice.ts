import { Invoice, CreditNote, LineAmountTypes } from 'xero-node'
import { format, parse } from 'date-fns'
import type { DailySalesData, XeroSettings } from './types'

/**
 * Builds a Xero ACCREC invoice from daily sales aggregated by payment method.
 *
 * Key rules (per plan spec and research):
 * - Amounts are in dollars (NOT cents) — Xero API uses dollars
 * - taxType: 'OUTPUT2' for NZ GST on income
 * - lineAmountTypes: Inclusive — amounts include GST; Xero computes the breakdown
 * - Zero-amount line items are omitted
 * - If existingInvoiceId is provided, sets invoiceID for upsert (D-10)
 */
export function buildDailyInvoice(
  sales: DailySalesData,
  settings: XeroSettings,
  existingInvoiceId?: string
): Invoice {
  // Parse dateLabel to get a Date object for description formatting
  const saleDate = parse(sales.dateLabel, 'yyyy-MM-dd', new Date())
  const dateDisplay = format(saleDate, 'dd MMM yyyy') // e.g. "15 Jan 2026"

  const lineItems: Invoice['lineItems'] = []

  if (sales.cashTotalCents > 0) {
    lineItems.push({
      description: `Cash Sales — ${dateDisplay}`,
      quantity: 1,
      unitAmount: sales.cashTotalCents / 100,
      accountCode: settings.cashAccountCode,
      taxType: 'OUTPUT2',
    })
  }

  if (sales.eftposTotalCents > 0) {
    lineItems.push({
      description: `EFTPOS Sales — ${dateDisplay}`,
      quantity: 1,
      unitAmount: sales.eftposTotalCents / 100,
      accountCode: settings.eftposAccountCode,
      taxType: 'OUTPUT2',
    })
  }

  if (sales.onlineTotalCents > 0) {
    lineItems.push({
      description: `Online (Stripe) Sales — ${dateDisplay}`,
      quantity: 1,
      unitAmount: sales.onlineTotalCents / 100,
      accountCode: settings.onlineAccountCode,
      taxType: 'OUTPUT2',
    })
  }

  const invoice: Invoice = {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID: settings.contactId },
    date: sales.dateLabel,
    dueDate: sales.dateLabel,
    invoiceNumber: `NZPOS-${sales.dateLabel}`,
    reference: 'Daily sales sync',
    status: Invoice.StatusEnum.AUTHORISED,
    lineAmountTypes: LineAmountTypes.Inclusive as unknown as Invoice['lineAmountTypes'],
    lineItems,
  }

  if (existingInvoiceId) {
    invoice.invoiceID = existingInvoiceId
  }

  return invoice
}

/**
 * Builds a Xero ACCRECCREDIT credit note for a refund.
 * References the original invoice by invoice number (D-04).
 */
export function buildCreditNote(
  refundCents: number,
  dateLabel: string,
  settings: XeroSettings,
  originalInvoiceNumber: string
): CreditNote {
  const saleDate = parse(dateLabel, 'yyyy-MM-dd', new Date())
  const dateDisplay = format(saleDate, 'dd MMM yyyy')

  return {
    type: CreditNote.TypeEnum.ACCRECCREDIT,
    contact: { contactID: settings.contactId },
    date: dateLabel,
    reference: `Refund for ${originalInvoiceNumber}`,
    lineAmountTypes: LineAmountTypes.Inclusive as unknown as CreditNote['lineAmountTypes'],
    lineItems: [
      {
        description: `Refund — ${dateDisplay} (${originalInvoiceNumber})`,
        quantity: 1,
        unitAmount: refundCents / 100,
        accountCode: settings.cashAccountCode,
        taxType: 'OUTPUT2',
      },
    ],
  }
}
