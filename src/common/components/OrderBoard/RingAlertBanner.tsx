'use client'

import { Button } from '@payloadcms/ui'
import React from 'react'

import type { BoardAlerts } from './useBoardAlerts'

/**
 * The alert strip above the board (rem0018 phase 4 step 2b, sdq `RingAlertBanner`):
 * 1. sound on but not ready (no tap yet; browsers start audio only from a tap) → a notice "Tap to
 *    turn on alert sounds" with a "Turn on sound" button (`sound.enable()` inside the tap, before
 *    any await); always shown until ready, alerts or not
 * 2. open alerts → `role="alert"` strip listing each title ("New order 5 · Table 2", "Table 7
 *    calls staff"), newest first, with "Stop ringing" (`acknowledge`) while it rings
 * 3. nothing to say → renders nothing
 * Admin tokens only (`order-board__ring`, `--request` when a request is open), English.
 */
export const RingAlertBanner: React.FC<{ alerts: BoardAlerts }> = ({ alerts }) => {
  const { sound, alerts: alertList, acknowledge } = alerts
  const showNotice = sound.enabled && !sound.ready
  const hasAlerts = alertList.length > 0

  if (!showNotice && !hasAlerts) {
    return null
  }

  const anyRequest = alertList.some((a) => a.kind === 'staff' || a.kind === 'bill')
  const newestFirst = [...alertList].reverse()

  return (
    <>
      {showNotice && (
        <div className="order-board__sound-notice">
          <span>Tap to turn on alert sounds</span>
          <Button
            buttonStyle="primary"
            size="small"
            margin={false}
            onClick={() => {
              void sound.enable()
            }}
          >
            Turn on sound
          </Button>
        </div>
      )}
      {hasAlerts && (
        <div
          role="alert"
          className={`order-board__ring${anyRequest ? ' order-board__ring--request' : ''}`}
        >
          <div className="order-board__ring-list">
            {newestFirst.map((alert) => (
              <span key={alert.key} className="order-board__ring-item">
                {alert.title}
              </span>
            ))}
          </div>
          <Button buttonStyle="primary" size="small" margin={false} onClick={acknowledge}>
            {sound.loop ? 'Stop ringing' : 'Dismiss'}
          </Button>
        </div>
      )}
    </>
  )
}
