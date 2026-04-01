type POSTopBarProps = {
  storeName: string
  staffName: string
  onLogout: () => void
}

export function POSTopBar({ storeName, staffName, onLogout }: POSTopBarProps) {
  return (
    <div className="flex items-center justify-between h-14 px-4 bg-navy shrink-0">
      <span className="font-display font-bold text-white text-lg">{storeName}</span>
      <div className="flex items-center gap-3">
        <span className="font-sans text-white/70 text-sm">{staffName}</span>
        <button
          onClick={onLogout}
          className="text-white/50 hover:text-white text-sm transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
