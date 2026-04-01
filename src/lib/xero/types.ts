export interface XeroTokenSet {
  access_token: string
  refresh_token: string
  expires_at: string // ISO string
}

export interface XeroConnection {
  id: string
  store_id: string
  tenant_id: string
  tenant_name: string | null
  vault_secret_id: string
  status: 'connected' | 'disconnected' | 'token_expired'
  xero_contact_id: string | null
  account_code_cash: string | null
  account_code_eftpos: string | null
  account_code_online: string | null
  connected_at: string
  updated_at: string
}

export interface XeroSyncLogEntry {
  id: string
  store_id: string
  sync_date: string
  sync_type: 'auto' | 'manual'
  status: 'pending' | 'success' | 'failed'
  period_from: string | null
  period_to: string | null
  total_cents: number | null
  xero_invoice_id: string | null
  xero_invoice_number: string | null
  error_message: string | null
  attempt_count: number
  created_at: string
}

export interface DailySalesData {
  cashTotalCents: number
  eftposTotalCents: number
  onlineTotalCents: number
  dateLabel: string // YYYY-MM-DD
}

export interface XeroSettings {
  cashAccountCode: string
  eftposAccountCode: string
  onlineAccountCode: string
  contactId: string
}
