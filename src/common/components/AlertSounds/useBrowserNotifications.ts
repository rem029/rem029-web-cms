'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AlertSound } from './useAlertSound'

export type NotifyPermission = NotificationPermission | 'unsupported'

export type NotifyOptions = NotificationOptions & {
  /** also play the tone (default true) */
  sound?: boolean
  /** alert even while the tab is visible (default: only `sound.chimeWhenVisible`) */
  whenVisible?: boolean
}

export type BrowserNotifications = {
  /** 'unsupported' without the Notification API, else the live permission */
  permission: NotifyPermission
  /** from a tap: asks permission first (Safari needs the tap's activation), then `sound.enable()` */
  requestPermission: () => Promise<void>
  /**
   * An alert: a visible tab without `whenVisible` / `chimeWhenVisible` → nothing (the screen is
   * the signal); else the tone (unless `sound: false`) and, when granted, an OS notification
   * (try/catch: mobile Safari throws "Illegal constructor").
   */
  notify: (title: string, options?: NotifyOptions) => void
}

/**
 * OS notifications next to the alert sound (rem0018 plan "alert sounds", sdq
 * `useBrowserNotifications` split). Client only.
 */
export const useBrowserNotifications = (sound: AlertSound): BrowserNotifications => {
  const [permission, setPermission] = useState<NotifyPermission>('unsupported')
  const permissionRef = useRef<NotifyPermission>(permission)
  permissionRef.current = permission

  const soundRef = useRef(sound)
  soundRef.current = sound

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return
    let status: PermissionStatus | null = null
    const onChange = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission)
      }
    }
    const descriptor: PermissionDescriptor = { name: 'notifications' }
    navigator.permissions
      .query(descriptor)
      .then((s) => {
        status = s
        s.addEventListener('change', onChange)
      })
      .catch(() => {
        // Some browsers reject the 'notifications' permission query - safe to ignore.
      })
    return () => {
      status?.removeEventListener('change', onChange)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<void> => {
    // the sound first, inside the tap: browsers start audio only from a user gesture, and the
    // guest may leave the permission prompt open or block it
    const enabling = soundRef.current.enable()
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission()
        if (res) {
          setPermission(res)
        }
      } catch (err) {
        console.warn('Notification permission request failed', err)
      }
    }
    await enabling
  }, [])

  const notify = useCallback((title: string, options?: NotifyOptions) => {
    const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    const allowWhenVisible = Boolean(options?.whenVisible || soundRef.current.chimeWhenVisible)

    if (isVisible && !allowWhenVisible) {
      return
    }

    if (options?.sound !== false) {
      soundRef.current.play()
    }

    if (
      !isVisible &&
      permissionRef.current === 'granted' &&
      typeof window !== 'undefined' &&
      'Notification' in window
    ) {
      try {
        new Notification(title, options)
      } catch (err) {
        console.warn('Failed to construct Notification', err)
      }
    }
  }, [])

  return {
    permission,
    requestPermission,
    notify,
  }
}
