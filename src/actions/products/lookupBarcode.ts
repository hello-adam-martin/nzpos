'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveAuth } from '@/lib/resolveAuth'

const BarcodeSchema = z.string().min(1).max(20).regex(/^\d+$/)

export async function lookupBarcode(barcode: string) {
  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const parsed = BarcodeSchema.safeParse(barcode)
  if (!parsed.success) return { error: 'invalid_barcode' as const }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', staff.store_id)
    .eq('barcode', parsed.data)
    .eq('is_active', true)
    .single()

  if (error || !data) return { error: 'not_found' as const }
  return { product: data }
}
