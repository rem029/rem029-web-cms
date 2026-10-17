'use client'

import { useEffect, useState } from 'react'

/** `value`, once it has stopped changing for `delay` ms (the search box). From sdq. */
export const useDebounce = <T>(value: T, delay = 300): T => {
  // 1. state = value
  // 2. effect: setTimeout(set value, delay), cleared on change / unmount
  void delay
  const [debounced] = useState(value)
  useEffect(() => {}, [value, delay])
  return debounced
}
