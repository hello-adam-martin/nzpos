import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import PromoForm from '@/components/admin/PromoForm'
import PromoList from '@/components/admin/PromoList'

export const dynamic = 'force-dynamic'

export default async function PromosPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/admin/login')
  }

  const { data: promos } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-[var(--space-xl)]">
      <h1 className="font-display text-[2.25rem] font-bold text-primary">Promo Codes</h1>
      <PromoForm />
      <PromoList promos={promos ?? []} />
    </div>
  )
}
