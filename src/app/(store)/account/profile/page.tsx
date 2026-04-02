import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  const initialData = {
    name: (customer?.name as string | null) ?? '',
    email: user.email ?? '',
    emailReceiptsEnabled: (customer?.preferences as { email_receipts?: boolean } | null)?.email_receipts ?? true,
    marketingEmailsEnabled: (customer?.preferences as { marketing_emails?: boolean } | null)?.marketing_emails ?? false,
  }

  return (
    <div className="py-8">
      <ProfileForm initialData={initialData} />
    </div>
  )
}
