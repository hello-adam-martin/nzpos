'use server'
import 'server-only'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

type Result = { url: string } | { error: string }

export async function createBillingPortalSession(): Promise<Result> {
  // Auth check
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'unauthenticated' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { error: 'no_store' }
  }

  // Look up stripe_customer_id
  const adminClient = createSupabaseAdminClient()
  const { data: store } = await adminClient
    .from('stores')
    .select('id, stripe_customer_id')
    .eq('id', storeId)
    .single()

  if (!store?.stripe_customer_id) {
    return { error: 'no_customer' }
  }

  // Build return URL from host header
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') || host.includes('lvh.me') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  const returnUrl = `${baseUrl}/admin/billing`

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: store.stripe_customer_id,
      return_url: returnUrl,
    })

    return { url: portalSession.url }
  } catch (err) {
    console.error('[createBillingPortalSession] Stripe error:', err)
    return { error: 'server_error' }
  }
}
