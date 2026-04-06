import { describe, it, expect } from 'vitest'

describe('quickAddCustomer', () => {
  it('requires consent_given to be true per D-13/D-14 IPP 3A', () => {
    expect(true).toBe(false) // RED: quickAddCustomer not implemented
  })
  it('rejects when consent_given is false', () => {
    expect(true).toBe(false)
  })
  it('requires name field', () => {
    expect(true).toBe(false)
  })
  it('requires email field', () => {
    expect(true).toBe(false)
  })
  it('rejects duplicate email for same store', () => {
    expect(true).toBe(false)
  })
})
