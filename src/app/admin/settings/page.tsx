import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BrandingForm } from './BrandingForm'

export const dynamic = 'force-dynamic'

/**
 * /admin/settings — post-wizard branding settings.
 * Allows editing store name, logo, and primary color after wizard.
 */
export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/login')
  }

  const { data: store } = await supabase
    .from('stores')
    .select('name, slug, logo_url, primary_color')
    .eq('id', storeId)
    .single()

  if (!store) {
    redirect('/login')
  }

  return (
    <div className="space-y-[var(--space-xl)]">
      <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">Settings</h1>

      <BrandingForm
        storeName={store.name ?? ''}
        slug={store.slug}
        logoUrl={store.logo_url}
        primaryColor={store.primary_color}
      />
    </div>
  )
}
