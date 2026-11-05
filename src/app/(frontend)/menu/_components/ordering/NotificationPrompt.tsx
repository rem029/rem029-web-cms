'use client'

import type { TypedLocale } from 'payload'
import React, { useState } from 'react'

import { AlertSoundSettings } from '@/common/components/AlertSounds/AlertSoundSettings'

import { useStoredSetting, type AlertSound } from '@/common/components/AlertSounds/useAlertSound'
import type { BrowserNotifications } from '@/common/components/AlertSounds/useBrowserNotifications'

import { menuStrings } from '../../_i18n'

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

const buttonClass =
  'menu-btn rounded border border-menu-border px-3 py-1.5 text-sm font-medium hover:bg-menu-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary'

export type NotificationPromptProps = {
  sound: AlertSound
  notifications: BrowserNotifications
  locale: TypedLocale
}

/**
 * "Alert me when my order is ready" (rem0018 phase 3 step 2b, sdq `notification-prompt.tsx`):
 * shown in the tracker until the guest turns it on or dismisses it. **Turn on** is the tap the
 * browser needs: `notifications.requestPermission()` (OS permission, then the sound). Dismiss
 * saves `orders-notify:guest:promptDismissed` (`useStoredSetting`). Once on, a
 * "Sound settings" toggle opens `AlertSoundSettings` (tone with ▶ preview, volume, vibrate).
 * Class `menu-notify-prompt`.
 */
export const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  sound,
  notifications,
  locale,
}) => {
  const t = menuStrings(locale)
  const [dismissed, setDismissed] = useStoredSetting('guest', 'promptDismissed', false, isBoolean)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // the sound alone is enough: OS permission may stay default, denied or unsupported
  if (sound.ready) {
    return (
      <div className="menu-notify-prompt">
        <button
          type="button"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={buttonClass}
        >
          {t.soundSettings}
        </button>
        {settingsOpen && (
          <AlertSoundSettings
            sound={sound}
            locale={locale === 'ar' ? 'ar' : 'en'}
            showVibrate
            className="menu-alert-settings mt-3"
          />
        )}
      </div>
    )
  }
  if (dismissed) return null
  return (
    <div className="menu-notify-prompt flex flex-wrap items-center gap-2 rounded border border-menu-border bg-menu-card p-3">
      <p className="flex-1 text-sm">{t.alertMe}</p>
      <button
        type="button"
        onClick={() => void notifications.requestPermission()}
        className={buttonClass}
      >
        {t.turnOn}
      </button>
      <button type="button" onClick={() => setDismissed(true)} className={buttonClass}>
        {t.dismiss}
      </button>
    </div>
  )
}
