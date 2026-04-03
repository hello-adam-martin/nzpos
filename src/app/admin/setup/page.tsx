import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { WizardLayout } from '@/components/wizard/WizardLayout'
import { SetupWizard } from '@/components/wizard/SetupWizard'

export const dynamic = 'force-dynamic'

/**
 * /admin/setup — wizard entry point.
 * Loads store data, computes initialStep from bitmask, redirects if already dismissed.
 */
export default async function SetupPage() {
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
    .select('name, slug, logo_url, primary_color, setup_completed_steps, setup_wizard_dismissed')
    .eq('id', storeId)
    .single()

  if (!store) {
    redirect('/login')
  }

  // If wizard already dismissed, go to dashboard
  if (store.setup_wizard_dismissed) {
    redirect('/admin/dashboard')
  }

  // Derive initial step from bitmask:
  //   bit 0 (1) = store name complete
  //   bit 1 (2) = logo/color complete
  //   bit 2 (4) = first product complete
  let initialStep: 1 | 2 | 3 | 4
  const steps = store.setup_completed_steps ?? 0
  if (!(steps & 1)) {
    initialStep = 1
  } else if (!(steps & 2)) {
    initialStep = 2
  } else if (!(steps & 4)) {
    initialStep = 3
  } else {
    // All steps done but wizard not dismissed — show completion
    initialStep = 4
  }

  // Fetch categories for step 3 dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', storeId)
    .order('name')

  const storeData = {
    name: store.name,
    slug: store.slug,
    logo_url: store.logo_url,
    primary_color: store.primary_color,
    setup_completed_steps: steps,
  }

  return (
    <WizardLayout>
      <SetupWizard
        initialStep={initialStep}
        storeData={storeData}
        categories={categories ?? []}
      />
    </WizardLayout>
  )
}
