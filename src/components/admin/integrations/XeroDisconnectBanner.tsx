'use client'
import Link from 'next/link'

interface XeroDisconnectBannerProps {
  status: 'disconnected' | 'token_expired'
}

export default function XeroDisconnectBanner({ status }: XeroDisconnectBannerProps) {
  const message =
    status === 'token_expired'
      ? 'Xero token expired. Daily sales sync has stopped.'
      : 'Xero is disconnected. Daily sales sync has stopped.'

  return (
    <div
      className="w-full min-h-[48px] px-6 py-3 flex items-center gap-3"
      style={{
        backgroundColor: '#FEF3C7',
        borderBottom: '1px solid #D97706',
      }}
    >
      {/* Warning triangle icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M8 1.5L14.5 13H1.5L8 1.5Z"
          stroke="#92400E"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 6v3.5"
          stroke="#92400E"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11" r="0.75" fill="#92400E" />
      </svg>

      <p
        className="font-sans text-sm"
        style={{ color: '#92400E' }}
      >
        {message}{' '}
        <Link
          href="/admin/integrations"
          className="underline font-semibold hover:opacity-80"
          style={{ color: '#92400E' }}
        >
          Reconnect to restore automatic sync.
        </Link>
      </p>
    </div>
  )
}
