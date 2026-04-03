import 'server-only'
import { Resend } from 'resend'
import type React from 'react'
import { requireFeature } from '@/lib/requireFeature'

let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/**
 * Send a transactional email via Resend.
 *
 * Fire-and-forget safe: callers may use `void sendEmail(...)`.
 * The function awaits Resend internally but catches and logs errors
 * without re-throwing — per D-05 (non-blocking email delivery).
 */
export async function sendEmail(params: {
  to: string
  subject: string
  react: React.ReactElement
}): Promise<{ success: boolean }> {
  // Gate: email_notifications subscription required (DB check for mutation)
  const gate = await requireFeature('email_notifications', { requireDbCheck: true })
  if (!gate.authorized) {
    console.log('[email] Email notifications not active — skipping send')
    return { success: false }
  }

  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured — skipping send')
    return { success: false }
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_ADDRESS!,
    to: params.to,
    subject: params.subject,
    react: params.react,
  })

  if (error) {
    console.error('[email] Send failed:', error)
    return { success: false }
  }

  return { success: true }
}
