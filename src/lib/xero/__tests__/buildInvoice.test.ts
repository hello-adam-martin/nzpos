import { describe, it, expect } from 'vitest'
import { buildDailyInvoice, buildCreditNote } from '../buildInvoice'
import type { DailySalesData, XeroSettings } from '../types'
import { Invoice, CreditNote } from 'xero-node'

const defaultSettings: XeroSettings = {
  cashAccountCode: '200',
  eftposAccountCode: '201',
  onlineAccountCode: '202',
  contactId: 'contact-uuid-123',
}

const defaultSales: DailySalesData = {
  cashTotalCents: 10000,    // $100.00
  eftposTotalCents: 25000,  // $250.00
  onlineTotalCents: 5000,   // $50.00
  dateLabel: '2026-01-15',
}

describe('buildDailyInvoice', () => {
  it('creates an ACCREC invoice type', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.type).toBe(Invoice.TypeEnum.ACCREC)
  })

  it('sets the contact ID from settings', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.contact?.contactID).toBe('contact-uuid-123')
  })

  it('sets date and dueDate to the dateLabel', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.date).toBe('2026-01-15')
    expect(invoice.dueDate).toBe('2026-01-15')
  })

  it('sets invoiceNumber as NZPOS-YYYY-MM-DD format', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.invoiceNumber).toBe('NZPOS-2026-01-15')
  })

  it('sets reference to Daily sales sync', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.reference).toBe('Daily sales sync')
  })

  it('sets status to AUTHORISED', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.status).toBe(Invoice.StatusEnum.AUTHORISED)
  })

  it('sets lineAmountTypes to Inclusive', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    // LineAmountTypes.Inclusive = 'Inclusive' (xero-node enum value)
    expect(invoice.lineAmountTypes).toBe('Inclusive')
  })

  it('creates 3 line items when all payment methods have non-zero amounts', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.lineItems).toHaveLength(3)
  })

  it('converts cents to dollars for line item amounts', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    const cashLine = invoice.lineItems?.find(l => l.description?.includes('Cash'))
    const eftposLine = invoice.lineItems?.find(l => l.description?.includes('EFTPOS'))
    const onlineLine = invoice.lineItems?.find(l => l.description?.includes('Online'))

    expect(cashLine?.unitAmount).toBe(100.00)    // 10000 / 100
    expect(eftposLine?.unitAmount).toBe(250.00)  // 25000 / 100
    expect(onlineLine?.unitAmount).toBe(50.00)   // 5000 / 100
  })

  it('sets taxType to OUTPUT2 on all line items', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    invoice.lineItems?.forEach(item => {
      expect(item.taxType).toBe('OUTPUT2')
    })
  })

  it('uses account codes from settings', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    const cashLine = invoice.lineItems?.find(l => l.description?.includes('Cash'))
    const eftposLine = invoice.lineItems?.find(l => l.description?.includes('EFTPOS'))
    const onlineLine = invoice.lineItems?.find(l => l.description?.includes('Online'))

    expect(cashLine?.accountCode).toBe('200')
    expect(eftposLine?.accountCode).toBe('201')
    expect(onlineLine?.accountCode).toBe('202')
  })

  it('sets quantity to 1 on all line items', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    invoice.lineItems?.forEach(item => {
      expect(item.quantity).toBe(1)
    })
  })

  it('omits line items with zero amount', () => {
    const sales: DailySalesData = {
      cashTotalCents: 10000,
      eftposTotalCents: 0,     // zero — should be omitted
      onlineTotalCents: 5000,
      dateLabel: '2026-01-15',
    }
    const invoice = buildDailyInvoice(sales, defaultSettings)
    expect(invoice.lineItems).toHaveLength(2)
    const hasEftpos = invoice.lineItems?.some(l => l.description?.includes('EFTPOS'))
    expect(hasEftpos).toBe(false)
  })

  it('omits all zero-amount line items when all are zero', () => {
    const sales: DailySalesData = {
      cashTotalCents: 0,
      eftposTotalCents: 0,
      onlineTotalCents: 0,
      dateLabel: '2026-01-15',
    }
    const invoice = buildDailyInvoice(sales, defaultSettings)
    expect(invoice.lineItems).toHaveLength(0)
  })

  it('includes date in line item descriptions', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    // Descriptions should include the date in some readable format
    invoice.lineItems?.forEach(item => {
      expect(item.description).toBeTruthy()
      expect(item.description?.length).toBeGreaterThan(0)
    })
    const cashLine = invoice.lineItems?.find(l => l.description?.includes('Cash'))
    // Should include a date reference like "15 Jan 2026" or similar
    expect(cashLine?.description).toContain('2026')
  })

  it('sets invoiceID when existingInvoiceId is provided', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings, 'existing-id-456')
    expect(invoice.invoiceID).toBe('existing-id-456')
  })

  it('does not set invoiceID when existingInvoiceId is not provided', () => {
    const invoice = buildDailyInvoice(defaultSales, defaultSettings)
    expect(invoice.invoiceID).toBeUndefined()
  })
})

describe('buildCreditNote', () => {
  it('creates an ACCRECCREDIT credit note', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    expect(cn.type).toBe(CreditNote.TypeEnum.ACCRECCREDIT)
  })

  it('sets the contact from settings', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    expect(cn.contact?.contactID).toBe('contact-uuid-123')
  })

  it('sets the date to the dateLabel', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    expect(cn.date).toBe('2026-01-15')
  })

  it('converts refund cents to dollars', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    expect(cn.lineItems?.[0]?.unitAmount).toBe(50.00)
  })

  it('references the original invoice number', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    // Reference or description should link to the original invoice
    const hasRef = cn.reference?.includes('NZPOS-2026-01-15') ||
                   cn.lineItems?.[0]?.description?.includes('NZPOS-2026-01-15')
    expect(hasRef).toBe(true)
  })

  it('sets taxType to OUTPUT2 on line items', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    expect(cn.lineItems?.[0]?.taxType).toBe('OUTPUT2')
  })

  it('sets lineAmountTypes to Inclusive', () => {
    const cn = buildCreditNote(5000, '2026-01-15', defaultSettings, 'NZPOS-2026-01-15')
    expect(cn.lineAmountTypes).toBe('Inclusive')
  })
})
