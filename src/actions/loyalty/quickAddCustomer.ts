'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

const quickAddSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  // consent_given MUST be exactly true — enforces IPP 3A privacy consent (D-13/D-14)
  consent_given: z.literal(true),
})

export type QuickAddCustomerResult = {
  id: string
  name: string
  email: string
}

/**
 * Creates a new POS customer with explicit privacy consent (D-13/D-14 IPP 3A).
 *
 * consent_given MUST be true — represents staff confirming the customer was
 * informed about loyalty data collection per NZ Privacy Amendment Act 2025.
 *
 * Handles duplicate email gracefully: returns existing customer with duplicate=true
 * so the UI can offer to attach the existing customer instead.
 *
 * @param input - Object with name, email, consent_given (must be literal true)
 * @returns New or existing customer data, or error string
 */
export async function quickAddCustomer(
  input: unknown
): Promise<
  | { data: QuickAddCustomerResult; duplicate: boolean }
  | { error: string }
> {
  const parsed = quickAddSchema.safeParse(input)
  if (!parsed.success) {
    // Check specifically for consent_given failure to provide the required IPP 3A message
    const consentError = parsed.error.issues.find(e =>
      e.path.includes('consent_given')
    )
    if (consentError) {
      return { error: 'Customer consent is required' }
    }
    const firstError = parsed.error.issues[0]
    return { error: firstError?.message ?? 'Invalid input' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Allow owner and POS staff roles
  const role = user.app_metadata?.role as string | undefined
  const validRoles = [POS_ROLES.OWNER, POS_ROLES.MANAGER, POS_ROLES.STAFF]
  if (!role || !validRoles.includes(role as (typeof validRoles)[number])) {
    return { error: 'INSUFFICIENT_ROLE' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()
  const { name, email } = parsed.data

  // Check for duplicate email within this store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (adminClient as any)
    .from('customers')
    .select('id, name, email')
    .eq('store_id', storeId)
    .eq('email', email)
    .maybeSingle() as {
      data: { id: string; name: string | null; email: string } | null
      error: { message: string } | null
    }

  if (existing) {
    return {
      data: {
        id: existing.id,
        name: existing.name ?? name,
        email: existing.email,
      },
      duplicate: true,
    }
  }

  // Insert new customer row (no Supabase auth user — POS-created customers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newCustomer, error: insertError } = await (adminClient as any)
    .from('customers')
    .insert({
      store_id: storeId,
      name,
      email,
      is_active: true,
      // auth_user_id is null for POS-created customers (no self-service account)
    })
    .select('id, name, email')
    .single() as {
      data: { id: string; name: string; email: string } | null
      error: { message: string } | null
    }

  if (insertError || !newCustomer) {
    return { error: "Couldn't create customer. Please try again." }
  }

  return {
    data: {
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
    },
    duplicate: false,
  }
}
