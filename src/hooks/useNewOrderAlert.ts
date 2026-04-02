'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

const POLL_INTERVAL_MS = 30_000
const STORAGE_KEY_LAST_CHECK = 'pos_last_order_check'
const STORAGE_KEY_MUTED = 'pos_sound_muted'
const TOAST_DURATION_MS = 6_000

type NewOrderToastData = {
  count: number
  totalCents: number | null // null for multiple orders
} | null

export function useNewOrderAlert() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [toast, setToast] = useState<NewOrderToastData>(null)
  const [isMuted, setIsMuted] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  // Initialize mute state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY_MUTED)
    setIsMuted(stored === 'true')
  }, [])

  // Reset unread count when navigating to /pos/pickups (per UI-SPEC badge contract)
  useEffect(() => {
    if (pathname === '/pos/pickups' || pathname?.startsWith('/pos/pickups/')) {
      setUnreadCount(0)
      // Store current time as last viewed
      localStorage.setItem('pos_last_viewed_pickups', new Date().toISOString())
    }
  }, [pathname])

  // Polling effect
  useEffect(() => {
    if (typeof window === 'undefined') return

    const poll = async () => {
      try {
        const since = localStorage.getItem(STORAGE_KEY_LAST_CHECK) ?? new Date(0).toISOString()
        const res = await fetch(`/api/pos/new-orders?since=${encodeURIComponent(since)}`)
        if (!res.ok) return

        const { orders, serverTime } = await res.json()
        localStorage.setItem(STORAGE_KEY_LAST_CHECK, serverTime)

        if (!orders || orders.length === 0) return

        // Update unread count (accumulate)
        setUnreadCount(prev => prev + orders.length)

        // Play chime unless muted (per D-18: single chime for multiple orders)
        const muted = localStorage.getItem(STORAGE_KEY_MUTED) === 'true'
        if (!muted) {
          const audio = new Audio('/sounds/chime.mp3')
          audio.play().catch(() => {}) // Suppress autoplay errors
        }

        // Show toast (per D-18: "N new orders" for multiple, per UI-SPEC)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({
          count: orders.length,
          totalCents: orders.length === 1 ? orders[0].totalCents : null,
        })
        toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
      } catch {
        // Silent failure — retry on next poll (per UI-SPEC error contract)
      }
    }

    // Initial poll
    poll()
    const intervalId = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      clearInterval(intervalId)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY_MUTED, String(next))
      return next
    })
  }, [])

  const dismissToast = useCallback(() => {
    setToast(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  return {
    unreadCount,
    toast,
    isMuted,
    toggleMute,
    dismissToast,
  }
}
