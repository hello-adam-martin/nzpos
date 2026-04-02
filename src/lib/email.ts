import 'server-only'
import { Resend } from 'resend'
import type React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY!)

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
