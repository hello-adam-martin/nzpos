import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// Mock server-only to no-op so it doesn't throw in test environment
vi.mock('server-only', () => ({}))

// Mock requireFeature to always authorize (email tests test email logic, not gating)
vi.mock('@/lib/requireFeature', () => ({
  requireFeature: vi.fn().mockResolvedValue({ authorized: true }),
}))

// Mock the resend module before importing email.ts
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

// Import AFTER mocks are set up
const { sendEmail } = await import('@/lib/email')

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.RESEND_FROM_ADDRESS = 'Test Store <noreply@test.co.nz>'
  })

  it('calls resend.emails.send with correct params', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null })

    const reactEl = React.createElement('div', null, 'Hello')
    await sendEmail({
      to: 'customer@example.com',
      subject: 'Your receipt',
      react: reactEl,
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith({
      from: 'Test Store <noreply@test.co.nz>',
      to: 'customer@example.com',
      subject: 'Your receipt',
      react: reactEl,
    })
  })

  it('returns { success: true } when Resend returns no error', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null })

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Your receipt',
      react: React.createElement('div', null, 'Hello'),
    })

    expect(result).toEqual({ success: true })
  })

  it('returns { success: false } and logs error when Resend returns an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: null, error: { message: 'fail', name: 'validation_error' } })

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Your receipt',
      react: React.createElement('div', null, 'Hello'),
    })

    expect(result).toEqual({ success: false })
    expect(consoleSpy).toHaveBeenCalledWith(
      '[email] Send failed:',
      expect.objectContaining({ message: 'fail' })
    )

    consoleSpy.mockRestore()
  })

  it('does NOT throw on Resend error (fire-and-forget safety)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: null, error: { message: 'network error', name: 'network_error' } })

    // Should not throw
    await expect(
      sendEmail({
        to: 'customer@example.com',
        subject: 'Your receipt',
        react: React.createElement('div', null, 'Hello'),
      })
    ).resolves.not.toThrow()
  })
})
