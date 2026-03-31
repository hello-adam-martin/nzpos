'use server'
import { StaffPinLoginSchema } from '@/schemas/staff'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import bcryptjs from 'bcryptjs'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)
const LOCKOUT_ATTEMPTS = 10
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export async function verifyStaffPin(input: unknown) {
  const parsed = StaffPinLoginSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { storeId, staffId, pin } = parsed.data

  const supabase = createSupabaseAdminClient()

  // Fetch staff record — include 'name' for the success response
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name, pin_hash, role, store_id, pin_attempts, pin_locked_until, is_active')
    .eq('id', staffId)
    .eq('store_id', storeId)
    .single()

  if (error || !staff) return { error: 'Staff not found' }
  if (!staff.is_active) return { error: 'Account deactivated' }
  if (!staff.pin_hash) return { error: 'PIN not set' }

  // Check lockout (per D-05: 10 attempts in 5 minutes)
  if (staff.pin_locked_until && new Date(staff.pin_locked_until) > new Date()) {
    return { error: 'Account locked. Contact store owner.' }
  }

  // Reset attempts if lockout window has passed
  const attemptsToCheck =
    staff.pin_locked_until && new Date(staff.pin_locked_until) <= new Date()
      ? 0
      : staff.pin_attempts

  // Verify PIN
  const valid = await bcryptjs.compare(pin, staff.pin_hash)

  if (!valid) {
    const newAttempts = (attemptsToCheck ?? 0) + 1
    const lockUntil =
      newAttempts >= LOCKOUT_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_WINDOW_MS).toISOString()
        : null

    await supabase
      .from('staff')
      .update({
        pin_attempts: newAttempts,
        pin_locked_until: lockUntil,
      })
      .eq('id', staffId)

    if (newAttempts >= LOCKOUT_ATTEMPTS) {
      return { error: 'Account locked. Contact store owner.' }
    }
    return { error: `Invalid PIN. ${LOCKOUT_ATTEMPTS - newAttempts} attempts remaining.` }
  }

  // Success — reset attempts and issue JWT
  await supabase
    .from('staff')
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq('id', staffId)

  const token = await new SignJWT({
    role: staff.role,
    store_id: staff.store_id,
    staff_id: staff.id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set('staff_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours
  })

  return { success: true, staffName: staff.name ?? 'Staff' }
}
