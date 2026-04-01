import AdminSidebar from '@/components/admin/AdminSidebar'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email ?? null

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar userEmail={userEmail} />
      <main className="flex-1 p-4 pt-16 md:p-lg md:pt-lg overflow-auto">
        {children}
      </main>
    </div>
  )
}
