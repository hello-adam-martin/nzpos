import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpgradePrompt } from '../UpgradePrompt'

describe('UpgradePrompt', () => {
  const defaultProps = {
    feature: 'xero' as const,
    headline: 'Xero sync requires an upgrade',
    body: 'Connect your Xero account and sync sales automatically. No manual data entry.',
  }

  it('renders headline text passed as prop', () => {
    render(<UpgradePrompt {...defaultProps} />)
    expect(screen.getByText('Xero sync requires an upgrade')).toBeInTheDocument()
  })

  it('renders body text passed as prop', () => {
    render(<UpgradePrompt {...defaultProps} />)
    expect(
      screen.getByText(
        'Connect your Xero account and sync sales automatically. No manual data entry.'
      )
    ).toBeInTheDocument()
  })

  it('renders "Upgrade to unlock" CTA link', () => {
    render(<UpgradePrompt {...defaultProps} />)
    expect(screen.getByRole('link', { name: 'Upgrade to unlock' })).toBeInTheDocument()
  })

  it('CTA links to /admin/billing?upgrade={feature} for given feature', () => {
    render(<UpgradePrompt {...defaultProps} feature="xero" />)
    const link = screen.getByRole('link', { name: 'Upgrade to unlock' })
    expect(link).toHaveAttribute('href', '/admin/billing?upgrade=xero')
  })

  it('renders lock icon SVG', () => {
    const { container } = render(<UpgradePrompt {...defaultProps} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('uses correct feature in href for email_notifications', () => {
    render(
      <UpgradePrompt
        feature="email_notifications"
        headline="Email notifications require an upgrade"
        body="Automatically email customers when orders are confirmed, ready, or shipped."
      />
    )
    const link = screen.getByRole('link', { name: 'Upgrade to unlock' })
    expect(link).toHaveAttribute('href', '/admin/billing?upgrade=email_notifications')
  })
})
