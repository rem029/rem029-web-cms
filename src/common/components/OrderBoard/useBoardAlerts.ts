'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { BoardContext } from '@/collections/Orders/utils/board'
import type { ToneId } from '@/common/components/AlertSounds/tones'
import {
  isToneId,
  useAlertSound,
  useStoredSetting,
  type AlertSound,
} from '@/common/components/AlertSounds/useAlertSound'
import {
  useBrowserNotifications,
  type BrowserNotifications,
} from '@/common/components/AlertSounds/useBrowserNotifications'
import type { StaffRole } from '@/common/utils/staffRoles'
import type { Order } from '@/payload-types'

import { orderButtons } from './orderButtons'
import { getTableLabel } from './OrderCard'
import type { OrderStreamEvent } from './useOrderStream'

/** One thing waiting for this board, newest last; the banner lists them. */
export type BoardAlert =
  // an order now waits for this board's forward move (waiter: a new order; kitchen: confirmed …)
  | { kind: 'order'; orderId: number; key: string; title: string }
  // a guest's Call staff / Ask for the bill
  | { kind: 'staff' | 'bill'; orderId: number; key: string; title: string }

export type BoardAlerts = {
  alerts: BoardAlert[]
  sound: AlertSound
  notifications: BrowserNotifications
  /** the tone for guest requests (`orders-notify:<scope>:requestTone`, default `bell`) */
  requestTone: ToneId
  setRequestTone: (tone: ToneId) => void
  /** feed every stream event here (next to `applyEvent`) */
  onEvent: (event: OrderStreamEvent) => void
  /** "Stop ringing": marks every current alert seen (they leave the banner, the ring stops) */
  acknowledge: () => void
}

/** Requests that ring on each board (user 2026-11-05: any staff role may clear one). */
export const REQUEST_ALERTS: Record<StaffRole, ('staff' | 'bill')[]> = {
  waiter: ['staff', 'bill'],
  kitchen: [],
  cashier: ['bill'],
}

const getStatusStamp = (order: Order): string | null | undefined => {
  switch (order.status) {
    case 'pending':
      return order.createdAt
    case 'confirmed':
      return order.confirmedAt
    case 'preparing':
      return order.preparingAt
    case 'prepared':
      return order.preparedAt
    case 'served':
      return order.servedAt
    default:
      return null
  }
}

/**
 * The alerts of one staff board (rem0018 phase 4; sdq `useBrowserNotifications` + `RingAlertBanner`
 * logic): scope `<userId>:<tenantId>:<role>` (plan "browser storage"), so each board of each user
 * and business keeps its own sound settings. Client only, no `payload` import.
 */
export const useBoardAlerts = (args: { context: BoardContext; role: StaffRole }): BoardAlerts => {
  const { context, role } = args
  const scope = `${context.userId}:${context.tenantId}:${role}`

  const sound = useAlertSound(scope, { loop: true, chimeWhenVisible: true })
  const notifications = useBrowserNotifications(sound)
  const [requestTone, setRequestTone] = useStoredSetting(scope, 'requestTone', 'bell', isToneId)

  const [alerts, setAlerts] = useState<BoardAlert[]>([])
  const alertedKeysRef = useRef<Set<string>>(new Set())
  const mountedAtRef = useRef(Date.now())

  const roleRef = useRef(role)
  roleRef.current = role

  const contextRef = useRef(context)
  contextRef.current = context

  const soundRef = useRef(sound)
  soundRef.current = sound

  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  const requestToneRef = useRef(requestTone)
  requestToneRef.current = requestTone

  const onEvent = useCallback((event: OrderStreamEvent) => {
    const { order } = event
    const currentRole = roleRef.current
    const currentContext = contextRef.current
    const currentMountedAt = mountedAtRef.current

    const buttons = orderButtons({ order, role: currentRole, context: currentContext })
    const waits =
      currentRole === 'cashier'
        ? order.status === 'served' && buttons.some((b) => b.kind === 'pay')
        : buttons.some((b) => b.kind === 'forward')

    const tableLabel = getTableLabel(order.table)
    const num = order.orderNumber ?? order.id

    const newAlerts: BoardAlert[] = []

    // 1. Order alert
    const orderKey = `order:${order.id}:${order.status}`
    const statusStamp = getStatusStamp(order)
    const sinceMs = statusStamp ? new Date(statusStamp).getTime() : 0

    if (waits && sinceMs >= currentMountedAt && !alertedKeysRef.current.has(orderKey)) {
      alertedKeysRef.current.add(orderKey)
      let baseTitle = `New order ${num}`
      if (currentRole === 'kitchen') {
        baseTitle = `Order ${num} to prepare`
      } else if (currentRole === 'cashier') {
        baseTitle = `Order ${num} to settle`
      }
      const title = tableLabel ? `${baseTitle} · ${tableLabel}` : baseTitle
      const alert: BoardAlert = { kind: 'order', orderId: order.id, key: orderKey, title }
      newAlerts.push(alert)
      notificationsRef.current.notify(title, {
        tone: soundRef.current.tone,
        tag: orderKey,
      })
    }

    // 2. Request alerts
    const requestKinds = REQUEST_ALERTS[currentRole] ?? []
    for (const kind of requestKinds) {
      const stamp = kind === 'staff' ? order.assistanceRequestedAt : order.billRequestedAt
      if (!stamp) continue
      const stampMs = new Date(stamp).getTime()
      const reqKey = `${kind}:${order.id}:${stamp}`
      if (stampMs >= currentMountedAt && !alertedKeysRef.current.has(reqKey)) {
        alertedKeysRef.current.add(reqKey)
        const subject = tableLabel ?? `Order ${num}`
        const title = kind === 'staff' ? `${subject} calls staff` : `${subject} asks for the bill`
        const alert: BoardAlert = { kind, orderId: order.id, key: reqKey, title }
        newAlerts.push(alert)
        notificationsRef.current.notify(title, {
          tone: requestToneRef.current,
          tag: reqKey,
        })
      }
    }

    // 3. Update alerts state: drop handled alerts for this order, append new alerts
    setAlerts((prev) => {
      const filtered = prev.filter((a) => {
        if (a.orderId !== order.id) return true
        if (order.status === 'cancelled') return false
        if (a.kind === 'order') {
          return waits && a.key === orderKey
        }
        if (a.kind === 'staff') {
          return (
            Boolean(order.assistanceRequestedAt) &&
            a.key === `staff:${order.id}:${order.assistanceRequestedAt}`
          )
        }
        if (a.kind === 'bill') {
          return (
            Boolean(order.billRequestedAt) && a.key === `bill:${order.id}:${order.billRequestedAt}`
          )
        }
        return false
      })
      if (newAlerts.length === 0 && filtered.length === prev.length) {
        return prev
      }
      return [...filtered, ...newAlerts]
    })
  }, [])

  const acknowledge = useCallback(() => {
    setAlerts([])
    soundRef.current.setRinging(false)
  }, [])

  const { loop, setRinging } = sound
  useEffect(() => {
    if (alerts.length > 0 && loop) {
      const anyRequestOpen = alerts.some((a) => a.kind === 'staff' || a.kind === 'bill')
      setRinging(true, anyRequestOpen ? requestTone : undefined)
    } else {
      setRinging(false)
    }
  }, [alerts, loop, setRinging, requestTone])

  return {
    alerts,
    sound,
    notifications,
    requestTone,
    setRequestTone,
    onEvent,
    acknowledge,
  }
}
