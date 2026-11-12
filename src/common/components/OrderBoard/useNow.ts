'use client'

import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `intervalMs` (default a minute), so "12 min ago" counts up
 * while a board stays open. One timer per caller, cleared on unmount.
 */
export const useNow = (intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => {
      window.clearInterval(id)
    }
  }, [intervalMs])

  return now
}
