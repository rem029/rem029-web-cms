'use client'

import { useEffect, useState } from 'react'

/** `value`, once it has stopped changing for `delay` ms (the search box). From sdq. */
export const useDebounce = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
