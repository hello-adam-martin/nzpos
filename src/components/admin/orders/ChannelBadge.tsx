'use client'

type Channel = 'pos' | 'online'

interface ChannelBadgeProps {
  channel: Channel
}

const CHANNEL_STYLES: Record<Channel, string> = {
  pos: 'bg-navy text-white',
  online: 'bg-[var(--color-info)] text-white',
}

const CHANNEL_LABELS: Record<Channel, string> = {
  pos: 'POS',
  online: 'Online',
}

export function ChannelBadge({ channel }: ChannelBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
        CHANNEL_STYLES[channel],
      ].join(' ')}
    >
      {CHANNEL_LABELS[channel]}
    </span>
  )
}
