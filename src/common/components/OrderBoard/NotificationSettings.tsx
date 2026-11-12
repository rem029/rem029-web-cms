'use client'

import { Button } from '@payloadcms/ui'
import React, { useEffect, useId, useRef, useState } from 'react'

import { AlertSoundSettings, toneLabel } from '@/common/components/AlertSounds/AlertSoundSettings'
import { TONE_IDS } from '@/common/components/AlertSounds/tones'

import type { BoardAlerts } from './useBoardAlerts'

/**
 * The board's "Alerts" panel (rem0018 phase 4 step 2b, sdq settings menu): a toolbar button
 * "Alerts" (`aria-expanded`) opens a panel (closes on Escape or a click outside) with:
 * 1. `AlertSoundSettings` (phase 3: sound on / off, tone with ▶ preview, volume; locale `en`,
 *    no vibrate) for new orders
 * 2. "Tone for guest requests": radio list of `TONE_IDS` with ▶ preview (`sound.play(tone)`
 *    after `sound.enable()` in the tap) → `setRequestTone`
 * 3. checkboxes "Ring until handled" (`sound.loop`) and "Sound while this board is open"
 *    (`sound.chimeWhenVisible`)
 * 4. desktop notifications by `notifications.permission`: `default` → "Turn on notifications"
 *    button (`requestPermission`, from the tap); `granted` → "Notifications are on"; `denied` →
 *    "Notifications are blocked. Allow them in this browser's site settings."; `unsupported` →
 *    hidden
 * Every choice saves on this device for this user, business and board (the hooks' scope).
 * Class `order-board__alerts-panel`; admin tokens; English.
 */
export const NotificationSettings: React.FC<{ alerts: BoardAlerts }> = ({ alerts }) => {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const requestToneGroupId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [open])

  return (
    <div className="order-board__alerts" ref={containerRef}>
      <Button
        buttonStyle="secondary"
        size="medium"
        margin={false}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        Alerts
      </Button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Alert settings"
          className="order-board__alerts-panel"
        >
          <AlertSoundSettings
            sound={alerts.sound}
            locale="en"
            className="order-board__sound-settings"
          />

          <fieldset className="order-board__request-tones" aria-label="Tone for guest requests">
            <legend className="order-board__legend">Tone for guest requests</legend>
            <div className="order-board__tone-options">
              {TONE_IDS.map((id) => {
                const label = toneLabel(id)
                return (
                  <div key={id} className="order-board__tone-row">
                    <label className="order-board__radio-label">
                      <input
                        type="radio"
                        name={requestToneGroupId}
                        value={id}
                        checked={alerts.requestTone === id}
                        onChange={() => {
                          void alerts.sound.enable()
                          alerts.setRequestTone(id)
                        }}
                      />
                      <span>{label}</span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Play ${label}`}
                      onClick={() => {
                        void alerts.sound.enable().then(() => alerts.sound.play(id))
                      }}
                    >
                      ▶
                    </button>
                  </div>
                )
              })}
            </div>
          </fieldset>

          <div className="order-board__alerts-checkboxes">
            <label className="order-board__checkbox-label">
              <input
                type="checkbox"
                checked={alerts.sound.loop}
                onChange={(e) => {
                  void alerts.sound.enable()
                  alerts.sound.setLoop(e.target.checked)
                }}
              />
              <span>Ring until handled</span>
            </label>
            <label className="order-board__checkbox-label">
              <input
                type="checkbox"
                checked={alerts.sound.chimeWhenVisible}
                onChange={(e) => {
                  void alerts.sound.enable()
                  alerts.sound.setChimeWhenVisible(e.target.checked)
                }}
              />
              <span>Sound while this board is open</span>
            </label>
          </div>

          {alerts.notifications.permission !== 'unsupported' && (
            <div className="order-board__notifications-row">
              {alerts.notifications.permission === 'default' && (
                <Button
                  buttonStyle="secondary"
                  size="small"
                  margin={false}
                  onClick={() => {
                    void alerts.notifications.requestPermission()
                  }}
                >
                  Turn on notifications
                </Button>
              )}
              {alerts.notifications.permission === 'granted' && <span>Notifications are on</span>}
              {alerts.notifications.permission === 'denied' && (
                <span>
                  Notifications are blocked. Allow them in this browser&apos;s site settings.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
