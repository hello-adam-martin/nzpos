import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock next/link as a simple anchor tag
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import { ReceiptScreen } from '../ReceiptScreen'
import type { ReceiptData } from '@/lib/receipt'

const mockReceipt: ReceiptData = {
  orderId: 'test-order-123',
  storeName: 'Demo Store',
  storeAddress: '123 Demo St',
  storePhone: '09 000 0000',
  gstNumber: '123-456-789',
  completedAt: '2026-04-06T00:00:00.000Z',
  staffName: 'Demo Staff',
  items: [
    {
      productId: 'p1',
      productName: 'Widget',
      quantity: 1,
      unitPriceCents: 1000,
      discountCents: 0,
      lineTotalCents: 1000,
      gstCents: 130,
    },
  ],
  subtotalCents: 1000,
  gstCents: 130,
  totalCents: 1000,
  paymentMethod: 'eftpos',
}

describe('ReceiptScreen demo mode CTA', () => {
  it('Test 1: renders signup CTA with link to /signup when demoMode=true', () => {
    render(<ReceiptScreen receiptData={mockReceipt} demoMode={true} />)
    const signupLink = screen.getByRole('link', { name: /create your free store/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('Test 2: renders dismiss button that calls onNewSale when demoMode=true', () => {
    const mockOnNewSale = vi.fn()
    render(<ReceiptScreen receiptData={mockReceipt} demoMode={true} onNewSale={mockOnNewSale} />)
    const dismissButton = screen.getByRole('button', { name: /start a new sale/i })
    expect(dismissButton).toBeInTheDocument()
    fireEvent.click(dismissButton)
    expect(mockOnNewSale).toHaveBeenCalledTimes(1)
  })

  it('Test 3: does not render signup CTA when demoMode is false/undefined', () => {
    render(<ReceiptScreen receiptData={mockReceipt} demoMode={false} />)
    const signupLink = screen.queryByRole('link', { name: /create your free store/i })
    expect(signupLink).not.toBeInTheDocument()
    // Also check no /signup href exists
    const allLinks = screen.queryAllByRole('link')
    const signupLinks = allLinks.filter((l) => l.getAttribute('href') === '/signup')
    expect(signupLinks).toHaveLength(0)
  })

  it('Test 4: renders CTA section even when onNewSale is not provided (demoMode=true)', () => {
    render(<ReceiptScreen receiptData={mockReceipt} demoMode={true} />)
    const signupLink = screen.getByRole('link', { name: /create your free store/i })
    expect(signupLink).toBeInTheDocument()
    // No dismiss button since onNewSale not provided
    const dismissButton = screen.queryByRole('button', { name: /start a new sale/i })
    expect(dismissButton).not.toBeInTheDocument()
  })
})
