import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedXeroClient } from './client'
import { getNZDayBoundaries, getNZTodayBoundaries } from './dates'
import { buildDailyInvoice, buildCreditNote } from './buildInvoice'
import type { DailySalesData, XeroSettings, XeroSyncLogEntry } from './types'

// Retry configuration per D-09: exponential backoff 1min, 5min, 15min
const BACKOFF_MS = [60_000, 300_000, 900_000]
const MAX_ATTEMPTS = 3

// Non-retryable failure messages (configuration issues, not transient errors)
const NON_RETRYABLE_MESSAGES = ['Xero not connected', 'Account codes not configured']

/**
 * Sleep helper for retry backoff delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Aggregates daily sales from orders table, grouped by payment method.
 * Only includes completed/collected/ready orders (confirmed payment).
 * Also returns refund totals for the same period.
 */
async function aggregateDailySales(
  storeId: string,
  from: Date,
  to: Date,
  label: string
): Promise<DailySalesData & { refundTotalCents: number }> {
  const supabase = createSupabaseAdminClient()

  // Query completed/collected/ready orders (confirmed payment)
  const { data: completedOrders } = await supabase
    .from('orders')
    .select('total_cents, payment_method, channel, status')
    .eq('store_id', storeId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .in('status', ['completed', 'collected', 'ready'])

  const orders = completedOrders ?? []

  const cashTotalCents = orders
    .filter((o) => o.payment_method === 'cash')
    .reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  const eftposTotalCents = orders
    .filter((o) => o.payment_method === 'eftpos')
    .reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  const onlineTotalCents = orders
    .filter((o) => o.channel === 'online')
    .reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  // Query refunded orders for credit note creation
  const { data: refundedOrders } = await supabase
    .from('orders')
    .select('total_cents, payment_method, channel, status')
    .eq('store_id', storeId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .in('status', ['refunded'])

  const refundTotalCents = (refundedOrders ?? []).reduce(
    (sum, o) => sum + (o.total_cents ?? 0),
    0
  )

  return {
    cashTotalCents,
    eftposTotalCents,
    onlineTotalCents,
    dateLabel: label,
    refundTotalCents,
  }
}

/**
 * Fetches Xero account code settings for a store.
 * Returns null if not connected or account codes not configured.
 */
async function getXeroSettings(storeId: string): Promise<XeroSettings | null> {
  const supabase = createSupabaseAdminClient()

  // xero_connections is not in the generated Database types (added in Phase 06 migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('xero_connections')
    .select('account_code_cash, account_code_eftpos, account_code_online, xero_contact_id')
    .eq('store_id', storeId)
    .eq('status', 'connected')
    .single() as { data: {
      account_code_cash: string | null
      account_code_eftpos: string | null
      account_code_online: string | null
      xero_contact_id: string | null
    } | null; error: unknown }

  if (
    !data ||
    !data.account_code_cash ||
    !data.account_code_eftpos ||
    !data.account_code_online ||
    !data.xero_contact_id
  ) {
    return null
  }

  return {
    cashAccountCode: data.account_code_cash,
    eftposAccountCode: data.account_code_eftpos,
    onlineAccountCode: data.account_code_online,
    contactId: data.xero_contact_id,
  }
}

/**
 * Writes a new sync log entry. Returns the new row ID.
 */
async function writeSyncLog(
  entry: Partial<XeroSyncLogEntry> & {
    store_id: string
    sync_date: string
    sync_type: string
    status: string
  }
): Promise<string> {
  const supabase = createSupabaseAdminClient()

  // xero_sync_log is not in the generated Database types (added in Phase 06 migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('xero_sync_log').insert(entry).single()

  return (data as { id: string } | null)?.id ?? ''
}

/**
 * Updates an existing sync log entry by ID.
 */
async function updateSyncLog(
  logId: string,
  updates: Partial<XeroSyncLogEntry>
): Promise<void> {
  if (!logId) return
  const supabase = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('xero_sync_log').update(updates).eq('id', logId)
}

/**
 * Core sync logic: aggregates sales for the given period, builds/updates Xero invoice,
 * handles refund credit notes, writes sync log.
 */
async function runSync(
  storeId: string,
  boundaries: { from: Date; to: Date; label: string },
  syncType: 'auto' | 'manual'
): Promise<{ success: boolean; message: string; invoiceNumber?: string; logId?: string }> {
  // 1. Get authenticated Xero client
  const client = await getAuthenticatedXeroClient(storeId)
  if (!client) {
    return { success: false, message: 'Xero not connected' }
  }

  const { xero, tenantId } = client

  // 2. Get Xero account settings
  const settings = await getXeroSettings(storeId)
  if (!settings) {
    return { success: false, message: 'Account codes not configured' }
  }

  const { from, to, label } = boundaries

  // 3. Aggregate sales for the period
  const sales = await aggregateDailySales(storeId, from, to, label)

  // 4. Early return if no sales and no refunds
  if (
    sales.cashTotalCents === 0 &&
    sales.eftposTotalCents === 0 &&
    sales.onlineTotalCents === 0 &&
    sales.refundTotalCents === 0
  ) {
    return { success: true, message: 'No sales recorded for this period. Nothing to sync.' }
  }

  // 5. Check for existing successful sync (for upsert per D-10)
  const supabase = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingLog } = await (supabase as any)
    .from('xero_sync_log')
    .select('xero_invoice_id, status')
    .eq('store_id', storeId)
    .eq('sync_date', label)
    .eq('status', 'success')
    .single() as { data: { xero_invoice_id: string | null; status: string } | null; error: unknown }

  const existingInvoiceId = existingLog?.xero_invoice_id ?? undefined

  // 6. Write pending sync log entry
  const logId = await writeSyncLog({
    store_id: storeId,
    sync_date: label,
    sync_type: syncType,
    status: 'pending',
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    attempt_count: 1,
  })

  try {
    // 7. Build invoice
    const invoice = buildDailyInvoice(sales, settings, existingInvoiceId)

    let invoiceID: string
    let invoiceNumber: string

    // 8. Create or update invoice in Xero
    if (existingInvoiceId) {
      const result = await xero.accountingApi.updateInvoice(tenantId, existingInvoiceId, {
        invoices: [invoice],
      })
      invoiceID = result.body.invoices![0].invoiceID!
      invoiceNumber = result.body.invoices![0].invoiceNumber!
    } else {
      const result = await xero.accountingApi.createInvoices(tenantId, {
        invoices: [invoice],
      })
      invoiceID = result.body.invoices![0].invoiceID!
      invoiceNumber = result.body.invoices![0].invoiceNumber!
    }

    // 9. Handle refunds as credit notes
    if (sales.refundTotalCents > 0) {
      const creditNote = buildCreditNote(sales.refundTotalCents, label, settings, invoiceNumber)
      await xero.accountingApi.createCreditNotes(tenantId, { creditNotes: [creditNote] })
    }

    // 10. Update sync log to success
    const totalCents =
      sales.cashTotalCents + sales.eftposTotalCents + sales.onlineTotalCents
    await updateSyncLog(logId, {
      status: 'success',
      xero_invoice_id: invoiceID,
      xero_invoice_number: invoiceNumber,
      total_cents: totalCents,
    })

    return { success: true, message: 'Synced', invoiceNumber, logId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Update sync log to failed
    await updateSyncLog(logId, {
      status: 'failed',
      error_message: message,
    })

    return { success: false, message, logId }
  }
}

/**
 * Executes daily sync for the previous NZ calendar day.
 * Used by the automated cron job.
 */
export async function executeDailySync(
  storeId: string,
  referenceDate?: Date
): Promise<{ success: boolean; message: string; invoiceNumber?: string }> {
  const boundaries = getNZDayBoundaries(referenceDate)
  const { logId: _logId, ...result } = await runSync(storeId, boundaries, 'auto')
  return result
}

/**
 * Executes manual sync for today's sales (midnight NZST to now).
 * Used by the manual sync button in the admin Integrations page.
 * Re-syncing the same day updates the existing invoice per D-10.
 */
export async function executeManualSync(
  storeId: string
): Promise<{ success: boolean; message: string; invoiceNumber?: string }> {
  const boundaries = getNZTodayBoundaries()
  const { logId: _logId, ...result } = await runSync(storeId, boundaries, 'manual')
  return result
}

/**
 * Executes daily sync with exponential backoff retry per D-09.
 * Retries up to 3 times with 1min/5min/15min delays.
 * Non-retryable failures (Xero not connected, account codes not configured)
 * return immediately without retrying.
 *
 * @param sleepFn - Optional sleep function override for testing (default: sleep)
 */
export async function executeDailySyncWithRetry(
  storeId: string,
  referenceDate?: Date,
  sleepFn: (ms: number) => Promise<void> = sleep
): Promise<{ success: boolean; message: string; invoiceNumber?: string; attempts: number }> {
  let lastResult: { success: boolean; message: string; invoiceNumber?: string } = {
    success: false,
    message: 'Unknown error',
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    lastResult = await executeDailySync(storeId, referenceDate)

    if (lastResult.success) {
      return { ...lastResult, attempts: attempt }
    }

    // Check if this is a non-retryable failure (configuration issue)
    const isNonRetryable = NON_RETRYABLE_MESSAGES.some((msg) =>
      lastResult.message.includes(msg)
    )
    if (isNonRetryable) {
      return { ...lastResult, attempts: attempt }
    }

    // If not the last attempt, wait before retrying
    if (attempt < MAX_ATTEMPTS) {
      await sleepFn(BACKOFF_MS[attempt - 1])
    }
  }

  // All attempts failed
  return { ...lastResult, attempts: MAX_ATTEMPTS }
}
