import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProfileForm } from './ProfileForm'

export const metadata = {
  title: 'My Profile | NZPOS',
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'customer') {
    redirect('/account/signin')
  }

  // customers table is not in generated types yet (added in migration 012_customer_accounts.sql)
  // Cast to untyped client until `supabase gen types` is re-run post-migration
  const untypedSupabase = supabase as unknown as SupabaseClient
  const { data: customer } = await untypedSupabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single() as { data: { name?: string | null; preferences?: { email_receipts?: boolean; marketing_emails?: boolean } | null } | null }

  const initialData = {
    name: customer?.name ?? '',
    email: user.email ?? '',
    emailReceiptsEnabled: customer?.preferences?.email_receipts ?? true,
    marketingEmailsEnabled: customer?.preferences?.marketing_emails ?? false,
  }

  return (
    <div className="py-8">
      <ProfileForm initialData={initialData} />
    </div>
  )
}
