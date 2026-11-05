'use client'

import React, { useEffect, useId, useState } from 'react'

import { SOUND_LEVELS, TONE_IDS, type SoundLevel, type ToneId } from './tones'
import type { AlertSound } from './useAlertSound'

export type AlertSoundLocale = 'en' | 'ar'

const STRINGS = {
  en: {
    title: 'Alert sound',
    sound: 'Sound',
    tone: 'Tone',
    level: 'Volume',
    preview: 'Play {tone}',
    vibrate: 'Vibrate',
    tones: { classic: 'Classic', chime: 'Chime', ring: 'Ring', bell: 'Bell', handbell: 'Hand bell' },
    levels: { low: 'Low', normal: 'Normal', high: 'High' },
  },
  ar: {
    title: 'صوت التنبيه',
    sound: 'الصوت',
    tone: 'النغمة',
    level: 'مستوى الصوت',
    preview: 'تشغيل {tone}',
    vibrate: 'الاهتزاز',
    tones: { classic: 'كلاسيكي', chime: 'رنين', ring: 'جرس هاتف', bell: 'جرس', handbell: 'جرس يدوي' },
    levels: { low: 'منخفض', normal: 'عادي', high: 'مرتفع' },
  },
} satisfies Record<
  AlertSoundLocale,
  {
    title: string
    sound: string
    tone: string
    level: string
    preview: string
    vibrate: string
    tones: Record<ToneId, string>
    levels: Record<SoundLevel, string>
  }
>

export type AlertSoundSettingsProps = {
  sound: AlertSound
  locale: AlertSoundLocale
  /** the vibrate switch (guests on phones; hidden when `navigator.vibrate` is missing) */
  showVibrate?: boolean
  /** extra class names for the panel (each screen adds its own, e.g. `menu-alert-settings`) */
  className?: string
}

/**
 * The alert sound panel (rem0018 plan "alert sounds"): sound on / off, the tone (radio list,
 * each with a ▶ preview), the volume, and on phones vibrate. Any tap enables the AudioContext
 * first (`sound.enable()`), so the preview plays on the first tap; nothing plays before one.
 * Choices save on the device through `useAlertSound`. Plain inputs with labels, theme colours
 * from the caller (`currentColor`, no hardcoded colours); logical spacing for RTL.
 */
export const AlertSoundSettings: React.FC<AlertSoundSettingsProps> = ({
  sound,
  locale,
  showVibrate,
  className,
}) => {
  const t = STRINGS[locale]
  const toneGroupId = useId()
  const levelGroupId = useId()

  const [hasVibrate, setHasVibrate] = useState(false)
  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    ) {
      setHasVibrate(true)
    }
  }, [])

  return (
    <fieldset className={className} aria-label={t.title}>
      <legend className="font-semibold mb-3">{t.title}</legend>

      <div className="mb-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={sound.enabled}
            onChange={(e) => {
              void sound.enable()
              sound.setEnabled(e.target.checked)
            }}
            className="rounded border-current"
          />
          <span className="ms-2">{t.sound}</span>
        </label>
      </div>

      <div className="mb-4">
        <div className="text-sm opacity-80 mb-2">{t.tone}</div>
        <div className="space-y-2">
          {TONE_IDS.map((id) => (
            <div key={id} className="flex items-center justify-between">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`${toneGroupId}-tone`}
                  value={id}
                  checked={sound.tone === id}
                  onChange={() => {
                    void sound.enable()
                    sound.setTone(id)
                  }}
                  className="border-current"
                />
                <span className="ms-2">{t.tones[id]}</span>
              </label>
              <button
                type="button"
                aria-label={t.preview.replace('{tone}', t.tones[id])}
                onClick={async () => {
                  const en = sound.enable()
                  sound.play(id)
                  await en
                }}
                className="ms-2 px-2 py-0.5 rounded border border-current text-xs opacity-80 hover:opacity-100 transition-opacity"
              >
                ▶
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm opacity-80 mb-2">{t.level}</div>
        <div className="flex items-center gap-4">
          {SOUND_LEVELS.map((lvl) => (
            <label key={lvl} className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                name={`${levelGroupId}-level`}
                value={lvl}
                checked={sound.level === lvl}
                onChange={() => {
                  void sound.enable()
                  sound.setLevel(lvl)
                }}
                className="border-current"
              />
              <span className="ms-2">{t.levels[lvl]}</span>
            </label>
          ))}
        </div>
      </div>

      {showVibrate && hasVibrate && (
        <div className="mb-2">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sound.vibrate}
              onChange={(e) => {
                void sound.enable()
                sound.setVibrate(e.target.checked)
              }}
              className="rounded border-current"
            />
            <span className="ms-2">{t.vibrate}</span>
          </label>
        </div>
      )}
    </fieldset>
  )
}
