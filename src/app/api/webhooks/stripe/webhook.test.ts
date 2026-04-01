import { describe, test } from 'vitest'

describe('Stripe Webhook Handler', () => {
  test.todo('returns 400 on invalid signature')
  test.todo('processes checkout.session.completed event')
  test.todo('silently ignores duplicate events (idempotency)')
  test.todo('calls complete_online_sale RPC with correct params')
  test.todo('passes order_items to RPC')
})
