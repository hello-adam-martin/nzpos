import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoyaltyBanner } from '../LoyaltyBanner'

// Mock the dismissLoyaltyBanner server action — it can't run in test environment
vi.mock('@/actions/loyalty/getCustomerLoyalty', () => ({
  getCustomerLoyalty: vi.fn(),
  dismissLoyaltyBanner: vi.fn(async () => ({ success: true })),
  getCustomerLoyaltyForCheckout: vi.fn(),
}))

describe('LoyaltyBanner', () => {
  describe('render conditions (D-11)', () => {
    it('renders banner when isActive=true and bannerDismissed=false', () => {
      render(<LoyaltyBanner isActive={true} bannerDismissed={false} />)
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByText("You're now earning loyalty points!")).toBeInTheDocument()
      expect(screen.getByText(/We track your purchase history/)).toBeInTheDocument()
    })

    it('does NOT render banner when bannerDismissed=true', () => {
      render(<LoyaltyBanner isActive={true} bannerDismissed={true} />)
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    })

    it('does NOT render banner when isActive=false', () => {
      render(<LoyaltyBanner isActive={false} bannerDismissed={false} />)
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    })

    it('does NOT render banner when both isActive=false and bannerDismissed=true', () => {
      render(<LoyaltyBanner isActive={false} bannerDismissed={true} />)
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has aria-live="polite" on banner', () => {
      render(<LoyaltyBanner isActive={true} bannerDismissed={false} />)
      const banner = screen.getByRole('banner')
      expect(banner).toHaveAttribute('aria-live', 'polite')
    })

    it('dismiss button has correct aria-label', () => {
      render(<LoyaltyBanner isActive={true} bannerDismissed={false} />)
      const dismissButton = screen.getByRole('button', { name: 'Dismiss loyalty notice' })
      expect(dismissButton).toBeInTheDocument()
    })
  })

  describe('dismiss interaction', () => {
    it('dismiss button calls dismissLoyaltyBanner action', async () => {
      const { dismissLoyaltyBanner } = await import('@/actions/loyalty/getCustomerLoyalty')

      render(<LoyaltyBanner isActive={true} bannerDismissed={false} />)

      const dismissButton = screen.getByRole('button', { name: 'Dismiss loyalty notice' })
      fireEvent.click(dismissButton)

      await waitFor(() => {
        expect(dismissLoyaltyBanner).toHaveBeenCalledOnce()
      })
    })

    it('hides banner after dismiss', async () => {
      render(<LoyaltyBanner isActive={true} bannerDismissed={false} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()

      const dismissButton = screen.getByRole('button', { name: 'Dismiss loyalty notice' })
      fireEvent.click(dismissButton)

      await waitFor(() => {
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      })
    })

    it('shows "Learn more" text link', () => {
      render(<LoyaltyBanner isActive={true} bannerDismissed={false} />)
      const learnMore = screen.getByRole('link', { name: 'Learn more' })
      expect(learnMore).toBeInTheDocument()
    })
  })
})
