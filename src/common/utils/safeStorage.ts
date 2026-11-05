import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage that never throws (plan, rem0018 "browser storage"): empty, blocked or full
 * storage (private mode) reads as `null` and drops writes, with one `console.warn` per page (no
 * logger in the browser; "a warn in the console at most"). Browser only; `null` on the server.
 * Used by the guest cart, the guest's orders and the alert sound settings.
 */
let storageWarned = false
const warnStorageOnce = (err: unknown) => {
  if (!storageWarned) {
    storageWarned = true
    console.warn('browser storage unavailable', err)
  }
}

export const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window === 'undefined') return null
      return window.localStorage.getItem(name)
    } catch (err) {
      warnStorageOnce(err)
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(name, value)
    } catch (err) {
      warnStorageOnce(err)
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window === 'undefined') return
      window.localStorage.removeItem(name)
    } catch (err) {
      warnStorageOnce(err)
    }
  },
}
