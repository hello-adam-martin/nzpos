import { describe, it, expect } from 'vitest'
import { getChecklistState } from './setupChecklist'

const baseStore = {
  name: 'Test Store',
  slug: 'test-store',
  logo_url: null,
  setup_wizard_dismissed: false,
}

describe('getChecklistState', () => {
  it('returns all false when store has defaults', () => {
    const result = getChecklistState(
      { name: null, slug: 'demo', logo_url: null, setup_wizard_dismissed: false },
      0,
      []
    )
    expect(result.storeName).toBe(false)
    expect(result.logo).toBe(false)
    expect(result.firstProduct).toBe(false)
    expect(result.firstPosSale).toBe(false)
    expect(result.firstOnlineOrder).toBe(false)
    expect(result.allComplete).toBe(false)
    expect(result.dismissed).toBe(false)
    expect(result.completedCount).toBe(0)
  })

  it('storeName is true when name differs from slug', () => {
    const result = getChecklistState(
      { ...baseStore, name: 'Test Store', slug: 'test-store' },
      0,
      []
    )
    expect(result.storeName).toBe(true)
  })

  it('storeName is false when name equals slug', () => {
    const result = getChecklistState(
      { ...baseStore, name: 'test-store', slug: 'test-store' },
      0,
      []
    )
    expect(result.storeName).toBe(false)
  })

  it('storeName is false when name is null', () => {
    const result = getChecklistState(
      { ...baseStore, name: null, slug: 'test-store' },
      0,
      []
    )
    expect(result.storeName).toBe(false)
  })

  it('storeName is false when name is empty string', () => {
    const result = getChecklistState(
      { ...baseStore, name: '', slug: 'test-store' },
      0,
      []
    )
    expect(result.storeName).toBe(false)
  })

  it('logo is true when logo_url is set', () => {
    const result = getChecklistState(
      { ...baseStore, logo_url: 'https://example.com/logo.png' },
      0,
      []
    )
    expect(result.logo).toBe(true)
  })

  it('logo is false when logo_url is null', () => {
    const result = getChecklistState(baseStore, 0, [])
    expect(result.logo).toBe(false)
  })

  it('firstProduct is true when productCount > 0', () => {
    const result = getChecklistState(baseStore, 5, [])
    expect(result.firstProduct).toBe(true)
  })

  it('firstProduct is false when productCount is 0', () => {
    const result = getChecklistState(baseStore, 0, [])
    expect(result.firstProduct).toBe(false)
  })

  it('firstPosSale is true when orderChannels includes pos', () => {
    const result = getChecklistState(baseStore, 0, ['pos'])
    expect(result.firstPosSale).toBe(true)
  })

  it('firstOnlineOrder is true when orderChannels includes online', () => {
    const result = getChecklistState(baseStore, 0, ['online'])
    expect(result.firstOnlineOrder).toBe(true)
  })

  it('allComplete is true when all 5 items are true', () => {
    const result = getChecklistState(
      { name: 'My Store', slug: 'my-store', logo_url: 'https://example.com/logo.png', setup_wizard_dismissed: false },
      1,
      ['pos', 'online']
    )
    expect(result.allComplete).toBe(true)
    expect(result.completedCount).toBe(5)
  })

  it('dismissed reflects store.setup_wizard_dismissed', () => {
    const result = getChecklistState(
      { ...baseStore, setup_wizard_dismissed: true },
      0,
      []
    )
    expect(result.dismissed).toBe(true)
  })

  it('completedCount counts correctly with partial completion', () => {
    const result = getChecklistState(
      { name: 'Test Store', slug: 'test-store', logo_url: 'https://example.com/logo.png', setup_wizard_dismissed: false },
      3,
      ['pos']
    )
    // storeName: true, logo: true, firstProduct: true, firstPosSale: true, firstOnlineOrder: false
    expect(result.completedCount).toBe(4)
    expect(result.allComplete).toBe(false)
  })

  it('handles multiple channels correctly', () => {
    const result = getChecklistState(baseStore, 0, ['pos', 'online', 'pos'])
    expect(result.firstPosSale).toBe(true)
    expect(result.firstOnlineOrder).toBe(true)
  })
})
