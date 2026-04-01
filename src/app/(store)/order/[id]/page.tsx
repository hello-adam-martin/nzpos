import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatNZD } from '@/lib/money'

// Force dynamic so customer always sees the latest order status on refresh
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'completed':
      return 'Processing'
    case 'pending_pickup':
      return 'Awaiting Pickup'
    case 'ready':
      return 'Ready for Collection'
    case 'collected':
      return 'Collected'
    case 'refunded':
      return 'Refunded'
    case 'expired':
      return 'Expired'
    default:
      return 'Unknown'
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'ready':
      return "Your order is ready for collection."
    case 'collected':
      return "Collected. Thanks for shopping with us."
    case 'pending':
    case 'completed':
    case 'pending_pickup':
    default:
      return "Awaiting pickup \u2014 we'll notify you when it's ready."
  }
}

export default async function OrderStatusPage({ params }: Props) {
  const { id: orderId } = await params

  const supabase = createSupabaseAdminClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    notFound()
  }

  const items = (order as typeof order & { order_items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_price_cents: number
    discount_cents: number
    line_total_cents: number
    gst_cents: number
  }> }).order_items ?? []

  const statusMessage = getStatusMessage(order.status)
  const statusLabel = getStatusLabel(order.status)
  const hasDiscount = order.discount_cents > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-[600px] mx-auto py-12 px-6">
        {/* Order number */}
        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
        >
          Order Status
        </h1>

        <p
          className="font-mono text-lg mb-6"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          #{orderId.slice(0, 8).toUpperCase()}
        </p>

        {/* Status pill */}
        <div
          className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-6"
          style={{
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {statusLabel}
        </div>

        {/* Status message */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
          }}
        >
          <p
            className="text-sm"
            style={{ color: '#1D4ED8', fontFamily: 'var(--font-sans)' }}
          >
            {statusMessage}
          </p>
        </div>

        {/* Order summary card */}
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 4px rgba(30,41,59,0.08)',
          }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
          >
            Order Summary
          </h2>

          {/* Items */}
          <ul className="space-y-3 mb-4">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-start">
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
                >
                  {item.product_name}{' '}
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    &times; {item.quantity}
                  </span>
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
                >
                  {formatNZD(item.line_total_cents)}
                </span>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div
            className="my-4"
            style={{ borderTop: '1px solid var(--color-border-light)' }}
          />

          {/* Totals */}
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt
                className="text-sm"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
              >
                Subtotal
              </dt>
              <dd
                className="text-sm tabular-nums"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
              >
                {formatNZD(order.subtotal_cents)}
              </dd>
            </div>

            {hasDiscount && (
              <div className="flex justify-between">
                <dt
                  className="text-sm"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
                >
                  Discount
                </dt>
                <dd
                  className="text-sm tabular-nums"
                  style={{ color: '#059669', fontFamily: 'var(--font-sans)' }}
                >
                  -{formatNZD(order.discount_cents)}
                </dd>
              </div>
            )}

            <div className="flex justify-between">
              <dt
                className="text-sm"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
              >
                GST (incl.)
              </dt>
              <dd
                className="text-sm tabular-nums"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
              >
                {formatNZD(order.gst_cents)}
              </dd>
            </div>

            <div
              className="flex justify-between pt-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <dt
                className="text-base font-semibold"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
              >
                Total
              </dt>
              <dd
                className="text-base font-semibold tabular-nums"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
              >
                {formatNZD(order.total_cents)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
