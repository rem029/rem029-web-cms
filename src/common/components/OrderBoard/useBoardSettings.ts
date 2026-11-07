'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { safeStorage } from '@/common/utils/safeStorage'
import type { StaffRole } from '@/common/utils/staffRoles'

/**
 * Which list a board shows. Every board: `active`, `history`; the cashier also `unpaid`,
 * `earlier` and `refundDue` (`listRefundDue`).
 */
export type BoardTab = 'active' | 'history' | 'unpaid' | 'earlier' | 'refundDue'

export type BoardSettings = {
  // the menu filter; `null` = every menu of the user
  menuId: number | null
  setMenuId: (menuId: number | null) => void
  tab: BoardTab
  setTab: (tab: BoardTab) => void
}

type StoredSettings = { menuId: number | null; tab: BoardTab }

const CASHIER_TABS: BoardTab[] = ['active', 'history', 'unpaid', 'earlier', 'refundDue']
const OTHER_TABS: BoardTab[] = ['active', 'history']

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

/**
 * The board's view settings, kept on the device per user, business and board (plan "browser
 * storage": `orders-board:<userId>:<tenantId>:<role>`, one json value `{ menuId, tab }`), through
 * `safeStorage`, read after mount (no hydration mismatch). A stored menu that's no longer in
 * `menuIds` reads as `null`; a tab the role doesn't have reads as `active`.
 */
export const useBoardSettings = (args: {
  userId: number
  tenantId: number
  role: StaffRole
  menuIds: number[]
}): BoardSettings => {
  const { userId, tenantId, role, menuIds } = args
  const key = `orders-board:${userId}:${tenantId}:${role}`
  // a string, so a new array with the same menus doesn't re-read the storage
  const menuIdsKey = menuIds.join(',')

  const [settings, setSettings] = useState<StoredSettings>({ menuId: null, tab: 'active' })
  // the latest settings for the setters (set with the state, never one render late)
  const settingsRef = useRef(settings)

  const save = useCallback(
    (next: StoredSettings) => {
      settingsRef.current = next
      setSettings(next)
      void safeStorage.setItem(key, JSON.stringify(next))
    },
    [key],
  )

  useEffect(() => {
    const raw = safeStorage.getItem(key)
    if (typeof raw !== 'string') return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) return
      const allowedTabs = role === 'cashier' ? CASHIER_TABS : OTHER_TABS
      const ids = menuIdsKey === '' ? [] : menuIdsKey.split(',').map(Number)
      const next: StoredSettings = {
        menuId:
          typeof parsed.menuId === 'number' && ids.includes(parsed.menuId) ? parsed.menuId : null,
        tab: allowedTabs.find((t) => t === parsed.tab) ?? 'active',
      }
      settingsRef.current = next
      setSettings(next)
    } catch {
      console.warn('board settings unreadable', key)
    }
  }, [key, menuIdsKey, role])

  const setMenuId = useCallback(
    (menuId: number | null) => save({ ...settingsRef.current, menuId }),
    [save],
  )
  const setTab = useCallback((tab: BoardTab) => save({ ...settingsRef.current, tab }), [save])
  const { menuId, tab } = settings

  return { menuId, setMenuId, tab, setTab }
}
