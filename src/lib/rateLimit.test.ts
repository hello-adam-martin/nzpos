import { describe, test } from 'vitest'

describe('Rate Limiter', () => {
  test.todo('allows first request from new IP')
  test.todo('allows up to maxPerMinute requests')
  test.todo('blocks request exceeding maxPerMinute')
  test.todo('resets after 1 minute window')
})
