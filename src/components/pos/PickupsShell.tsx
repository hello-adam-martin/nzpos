'use client'

import { useRouter } from 'next/navigation'
import { POSTopBar } from './POSTopBar'

type PickupsShellProps = {
  storeName: string
  staffName: string
  children: React.ReactNode
}

export function PickupsShell({ storeName, staffName, children }: PickupsShellProps) {
  const router = useRouter()

  function handleLogout() {
    document.cookie = 'staff_session=; path=/; max-age=0'
    router.push('/pos/login')
  }

  return (
    <div className="flex flex-col h-full">
      <POSTopBar storeName={storeName} staffName={staffName} onLogout={handleLogout} />
      {children}
    </div>
  )
}
