'use server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  // Clear staff PIN session cookie to prevent auth leak
  const cookieStore = await cookies()
  cookieStore.delete('staff_session')

  redirect('/login')
}
