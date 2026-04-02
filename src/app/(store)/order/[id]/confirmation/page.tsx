import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNZD } from '@/lib/money'
import CartClearer from './CartClearer'
import { PostPurchaseAccountPrompt } from '@/components/store/PostPurchaseAccountPrompt'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string; token?: string }>
}

function getStatusMessage(
  status: string
): string {
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

export default async function OrderConfirmationPage({ params, searchParams: searchParamsPromise }: Props) {
  const { id: orderId } = await params
  const { token } = await searchParamsPromise

  // IDOR protection: require lookup token to view order details
  if (!token) {
    notFound()
  }

  const adminSupabase = createSupabaseAdminClient()
  const { data: order, error } = await (adminSupabase as any)
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('lookup_token', token)
    .single()

  if (error || !order) {
    notFound()
  }

  // Check if viewer is a logged-in customer or a guest
  const serverSupabase = await createSupabaseServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  const isGuest = !user || user.app_metadata?.role !== 'customer'

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

  const statusMessage = getStatusMessage(order.status)
  const hasDiscount = order.discount_cents > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <CartClearer />

      <div className="max-w-[600px] mx-auto py-12 px-6">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full"
            style={{ backgroundColor: '#D1FAE5' }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1
          className="text-center text-2xl font-semibold mb-2"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
        >
          Order confirmed
        </h1>

        {/* Body text */}
        <p
          className="text-center mb-4"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
        >
          Thanks for your order. Bring your order number when you collect.
        </p>

        {/* Order number */}
        <p
          className="text-center font-mono text-lg mb-8"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
        >
          #{orderId.slice(0, 8).toUpperCase()}
        </p>

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

        {/* Click-and-collect status */}
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

        {/* Post-purchase account prompt for guests */}
        {isGuest && order.customer_email && (
          <PostPurchaseAccountPrompt
            email={order.customer_email as string}
            orderId={orderId}
            token={token}
            isGuest={isGuest}
          />
        )}

        {/* Link to order status page */}
        <div className="text-center">
          <a
            href={`/order/${orderId}?token=${token}`}
            className="text-sm underline"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
          >
            View order status
          </a>
        </div>
      </div>
    </div>
  )
}
