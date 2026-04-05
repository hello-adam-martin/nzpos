import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BrandingForm } from './BrandingForm'
import { BusinessDetailsForm } from './BusinessDetailsForm'
import { ReceiptForm } from './ReceiptForm'

export const dynamic = 'force-dynamic'

/**
 * /admin/settings — post-wizard branding settings, business details, and receipt customization.
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
    .select('name, slug, logo_url, primary_color, business_address, phone, ird_gst_number, receipt_header, receipt_footer')
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

      <BusinessDetailsForm
        businessAddress={store.business_address ?? ''}
        phone={store.phone ?? ''}
        irdGstNumber={store.ird_gst_number ?? ''}
      />

      <ReceiptForm
        receiptHeader={store.receipt_header ?? ''}
        receiptFooter={store.receipt_footer ?? ''}
      />
    </div>
  )
}
