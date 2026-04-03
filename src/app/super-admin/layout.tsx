import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SuperAdminSidebar from '@/components/super-admin/SuperAdminSidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.is_super_admin !== true) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <SuperAdminSidebar userEmail={user.email} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
