import { describe, it } from 'vitest'

describe('processRefund', () => {
  it.todo('refunds POS order without Stripe call')
  it.todo('refunds online order via Stripe refunds API')
  it.todo('rejects already-refunded order')
  it.todo('restores stock when restoreStock is true')
  it.todo('does not restore stock when restoreStock is false')
  it.todo('requires refund reason')
})
