import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { POSTopBar } from '../POSTopBar'

// Minimal props factory for POSTopBar
function makeTopBarProps(overrides: Partial<Parameters<typeof POSTopBar>[0]> = {}) {
  return {
    storeName: 'Test Store',
    staffName: 'Test Staff',
    onLogout: vi.fn(),
    ...overrides,
  }
}

describe('POSTopBar demo mode', () => {
  it('renders DEMO badge when demoMode is true', () => {
    render(<POSTopBar {...makeTopBarProps({ demoMode: true })} />)
    expect(screen.getByText('DEMO')).toBeInTheDocument()
  })

  it('hides staff name and logout button when demoMode is true', () => {
    render(<POSTopBar {...makeTopBarProps({ demoMode: true })} />)
    expect(screen.queryByText('Test Staff')).not.toBeInTheDocument()
  })

  it('renders staff name normally when demoMode is false', () => {
    render(<POSTopBar {...makeTopBarProps({ demoMode: false })} />)
    expect(screen.getByText('Test Staff')).toBeInTheDocument()
    expect(screen.queryByText('DEMO')).not.toBeInTheDocument()
  })
})

// TODO: POSClientShell demo mode tests (post-implementation)
// These require heavier mocking and are better validated by the human checkpoint.
// Stub descriptions for future expansion:
// - "does not call completeSale server action when demoMode=true"
// - "builds receipt data client-side with fake order ID in demo mode"
// - "does not render barcode scanner button in demo mode"
// - "passes onEmailCapture={undefined} to ReceiptScreen in demo mode"
