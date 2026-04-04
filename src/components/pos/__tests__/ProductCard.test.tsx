import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from '../ProductCard'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

// ProductCard uses formatNZD from @/lib/money — no external deps to mock.
// It is a pure presentational component with no server-only imports.

function makeProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    store_id: 'store-123',
    name: 'Test Product',
    description: null,
    price_cents: 1000,
    stock_quantity: 10,
    reorder_threshold: 3,
    sku: null,
    barcode: null,
    image_url: null,
    category_id: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    product_type: 'physical',
    slug: null,
    ...overrides,
  } as ProductRow
}

const defaultProps = {
  onAddToCart: vi.fn(),
  isInCart: false,
  cartQuantity: 0,
  staffRole: 'staff' as const,
  hasInventory: true,
}

describe('ProductCard', () => {
  describe('stock badges (POS-01)', () => {
    it('shows no stock badge when hasInventory is false', () => {
      const product = makeProduct({ stock_quantity: 5 })
      render(<ProductCard {...defaultProps} product={product} hasInventory={false} />)
      expect(screen.queryByText(/in stock/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/out of stock/i)).not.toBeInTheDocument()
    })

    it('shows "N in stock" badge for in-stock physical product when hasInventory is true', () => {
      const product = makeProduct({ stock_quantity: 10, reorder_threshold: 3 })
      render(<ProductCard {...defaultProps} product={product} hasInventory={true} />)
      expect(screen.getByText('10 in stock')).toBeInTheDocument()
    })

    it('shows low-stock badge when stock_quantity <= reorder_threshold', () => {
      // reorder_threshold is 3, stock_quantity is 2 — should still show "2 in stock" (low-stock styling only)
      const product = makeProduct({ stock_quantity: 2, reorder_threshold: 3 })
      render(<ProductCard {...defaultProps} product={product} hasInventory={true} />)
      expect(screen.getByText('2 in stock')).toBeInTheDocument()
    })

    it('shows "Out of stock" badge when stock_quantity is 0', () => {
      const product = makeProduct({ stock_quantity: 0 })
      render(
        <ProductCard
          {...defaultProps}
          product={product}
          hasInventory={true}
          staffRole="owner"
        />
      )
      expect(screen.getByText('Out of stock')).toBeInTheDocument()
    })

    it('shows no stock badge for service products even when hasInventory is true', () => {
      const product = makeProduct({ stock_quantity: 5, product_type: 'service' as any })
      render(<ProductCard {...defaultProps} product={product} hasInventory={true} />)
      expect(screen.queryByText(/in stock/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/out of stock/i)).not.toBeInTheDocument()
    })
  })

  describe('out-of-stock behavior (POS-02)', () => {
    it('renders out-of-stock visual state when stock_quantity is 0 and hasInventory is true', () => {
      const product = makeProduct({ stock_quantity: 0 })
      // Staff role causes isDisabled = true when out of stock
      const { container } = render(
        <ProductCard
          {...defaultProps}
          product={product}
          hasInventory={true}
          staffRole="staff"
        />
      )
      // aria-disabled is set to "true" when isDisabled
      const card = container.querySelector('[role="button"]')
      expect(card).toHaveAttribute('aria-disabled', 'true')
      // Out of stock badge is rendered
      expect(screen.getByText('Out of stock')).toBeInTheDocument()
    })

    it('owner can see out-of-stock card but badge still renders', () => {
      const product = makeProduct({ stock_quantity: 0 })
      render(
        <ProductCard
          {...defaultProps}
          product={product}
          hasInventory={true}
          staffRole="owner"
        />
      )
      // Owner is not disabled (staffRole === 'owner' bypasses disable)
      const card = screen.getByRole('button')
      expect(card).not.toHaveAttribute('aria-disabled')
      expect(screen.getByText('Out of stock')).toBeInTheDocument()
    })
  })
})
