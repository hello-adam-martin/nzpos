import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStocktakeSession } from '@/actions/inventory/getStocktakeSession'
import { StocktakeSessionPage } from '@/components/admin/inventory/StocktakeSessionPage'

export const dynamic = 'force-dynamic'

interface StocktakePageProps {
  params: Promise<{ sessionId: string }>
}

export default async function StocktakePage({ params }: StocktakePageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { sessionId } = await params
  const result = await getStocktakeSession(sessionId)

  if ('error' in result) {
    if (result.error === 'session_not_found') {
      redirect('/admin/inventory?tab=stocktakes')
    }
    return (
      <div className="p-[var(--space-lg)] text-center">
        <p className="text-sm text-error">
          Failed to load stocktake session. Please reload the page to try again.
        </p>
      </div>
    )
  }

  return <StocktakeSessionPage session={result.session} lines={result.lines} />
}
