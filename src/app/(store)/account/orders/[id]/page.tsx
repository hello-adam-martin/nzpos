import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNZD } from '@/lib/money'

type Props = {
  params: Promise<{ id: string }>
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: '#EFF6FF', text: '#1D4ED8' },
  completed: { label: 'Processing', bg: '#EFF6FF', text: '#1D4ED8' },
  pending_pickup: { label: 'Awaiting Pickup', bg: '#FEF3C7', text: '#92400E' },
  ready: { label: 'Ready for Collection', bg: '#D1FAE5', text: '#065F46' },
  collected: { label: 'Collected', bg: '#F3F4F6', text: '#374151' },
  refunded: { label: 'Refunded', bg: '#FEE2E2', text: '#991B1B' },
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'ready':
      return "Your order is ready for collection."
    case 'collected':
      return "Collected. Thanks for shopping with us."
    case 'refunded':
      return "This order has been refunded."
    case 'pending':
    case 'completed':
    case 'pending_pickup':
    default:
      return "Awaiting pickup \u2014 we'll notify you when it's ready."
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return { title: `Order #${id.slice(0, 8).toUpperCase()} | NZPOS` }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id: orderId } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'customer') {
    redirect('/account/signin')
  }

  // RLS ensures customer can only see their own orders
  const { data: order, error } = await (supabase as any)
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    notFound()
  }

  type OrderItem = {
    id: string
    product_name: string
    quantity: number
    unit_price_cents: number
    discount_cents: number
    line_total_cents: number
    gst_cents: number
  }
  const items: OrderItem[] = (order as typeof order & { order_items: OrderItem[] }).order_items ?? []

  const statusConfig = STATUS_CONFIG[order.status as string] ?? STATUS_CONFIG.pending
  const statusMessage = getStatusMessage(order.status as string)
  const hasDiscount = (order.discount_cents as number) > 0
  const orderNumber = `#${orderId.slice(0, 8).toUpperCase()}`

  return (
    <div className="max-w-[600px] mx-auto py-8">
      {/* Back link */}
      <Link
        href="/account/orders"
        className="text-sm underline text-text-muted hover:text-text transition-colors duration-150 inline-block mb-6"
      >
        Back to orders
      </Link>

      {/* Order number + status */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-mono text-lg text-text">{orderNumber}</h1>
        <span
          className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
          style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Order summary card */}
      <div
        className="rounded-lg p-6 mb-6"
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

      {/* Status info box */}
      <div
        className="rounded-lg p-4"
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
    </div>
  )
}
