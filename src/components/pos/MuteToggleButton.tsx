'use client'
import { Volume2, VolumeX } from 'lucide-react'

type MuteToggleButtonProps = {
  isMuted: boolean
  onToggle: () => void
}

export function MuteToggleButton({ isMuted, onToggle }: MuteToggleButtonProps) {
  const Icon = isMuted ? VolumeX : Volume2

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-center w-11 h-11 transition-opacity duration-150 cursor-pointer"
      aria-label={isMuted ? 'Toggle order sound (currently off)' : 'Toggle order sound (currently on)'}
    >
      <Icon
        size={20}
        className={isMuted ? 'text-white/40 hover:text-white/60' : 'text-white/70 hover:text-white'}
      />
    </button>
  )
}
