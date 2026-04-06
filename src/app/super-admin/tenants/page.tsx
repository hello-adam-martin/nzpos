import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ADDONS, FEATURE_TO_COLUMN } from '@/config/addons'
import TenantTable from '@/components/super-admin/TenantTable'

export const dynamic = 'force-dynamic'

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const admin = createSupabaseAdminClient()
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('stores')
    .select(
      'id, name, slug, is_active, created_at, store_plans(has_xero, has_custom_domain, has_inventory)',
      { count: 'exact' }
    )
    .range(from, to)
    .order('created_at', { ascending: false })

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%`)
  }
  if (params.status === 'active') {
    query = query.eq('is_active', true)
  } else if (params.status === 'suspended') {
    query = query.eq('is_active', false)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawStores, count } = await query as { data: any[] | null; count: number | null }

  const stores = (rawStores ?? []).map((store) => {
    const plans = Array.isArray(store.store_plans) ? store.store_plans[0] : store.store_plans
    const activeAddons = plans
      ? ADDONS
          .filter((addon) => {
            const col = FEATURE_TO_COLUMN[addon.feature]
            return plans[col] === true
          })
          .map((addon) => addon.name)
      : []
    return {
      id: store.id as string,
      name: store.name as string,
      slug: store.slug as string,
      is_active: store.is_active as boolean,
      created_at: store.created_at as string,
      plan_summary: activeAddons.length > 0 ? activeAddons.join(', ') : 'Free',
    }
  })

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] mb-1">
        Tenants
      </h1>
      <p className="text-base font-sans text-[var(--color-text-muted)] mb-6">
        All provisioned stores on the platform.
      </p>
      <TenantTable
        stores={stores}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
        query={params.q ?? ''}
        status={params.status ?? ''}
      />
    </div>
  )
}
