import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddToCartButton } from '../AddToCartButton'

// AddToCartButton uses useCart from @/contexts/CartContext.
// Mock the CartContext module so tests don't need a full CartProvider tree.
vi.mock('@/contexts/CartContext', () => ({
  useCart: vi.fn(() => ({
    state: { items: [] },
    dispatch: vi.fn(),
    itemCount: 0,
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
    gstCents: 0,
  })),
}))

function makeProduct(overrides: Partial<{
  id: string
  name: string
  price_cents: number
  image_url: string | null
  slug: string | null
  stock_quantity: number
  product_type: string
}> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Product',
    price_cents: 1000,
    image_url: null,
    slug: null,
    stock_quantity: 10,
    product_type: 'physical',
    ...overrides,
  }
}

describe('AddToCartButton', () => {
  describe('sold-out behavior (POS-03)', () => {
    it('renders enabled button when hasInventory is false (no stock gating)', () => {
      const product = makeProduct({ stock_quantity: 0 })
      render(<AddToCartButton product={product} hasInventory={false} />)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(button).not.toHaveTextContent('Sold Out')
    })

    it('renders enabled button when hasInventory is true and product is in stock', () => {
      const product = makeProduct({ stock_quantity: 5 })
      render(<AddToCartButton product={product} hasInventory={true} />)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(button).not.toHaveTextContent('Sold Out')
    })

    it('renders disabled button with "Sold Out" text when hasInventory is true and stock_quantity is 0', () => {
      const product = makeProduct({ stock_quantity: 0 })
      render(<AddToCartButton product={product} hasInventory={true} />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('Sold Out')
    })

    it('renders enabled button for service products even when stock_quantity is 0', () => {
      const product = makeProduct({ stock_quantity: 0, product_type: 'service' })
      render(<AddToCartButton product={product} hasInventory={true} />)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(button).not.toHaveTextContent('Sold Out')
    })
  })
})
