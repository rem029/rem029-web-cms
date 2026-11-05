'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { safeStorage } from '@/common/utils/safeStorage'
import {
  DEFAULT_LEVEL,
  DEFAULT_TONE,
  playTone,
  SOUND_LEVELS,
  TONE_IDS,
  type SoundLevel,
  type ToneId,
} from './tones'

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

const isToneId = (value: unknown): value is ToneId =>
  typeof value === 'string' && TONE_IDS.some((id) => id === value)

const isSoundLevel = (value: unknown): value is SoundLevel =>
  typeof value === 'string' && SOUND_LEVELS.some((lvl) => lvl === value)

type WindowWithWebkitAudio = Window & {
  webkitAudioContext: typeof AudioContext
}

const hasWebkitAudioContext = (win: Window): win is WindowWithWebkitAudio => {
  return 'webkitAudioContext' in win
}

const getAudioContextClass = (): typeof AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (typeof window.AudioContext === 'function') return window.AudioContext
  return hasWebkitAudioContext(window) ? window.webkitAudioContext : null
}

/**
 * A setting kept on this device under `orders-notify:<scope>:<name>` (plan "browser storage"),
 * read after mount (the server renders the fallback) through `safeStorage`; a stored value that
 * fails `isValid` reads as the fallback. Shared by the sound settings and the guest's prompt.
 */
export const useStoredSetting = <T>(
  scope: string,
  name: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(fallback)
  const key = `orders-notify:${scope}:${name}`

  useEffect(() => {
    const raw = safeStorage.getItem(key)
    if (typeof raw !== 'string') return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isValid(parsed)) setValue(parsed)
    } catch {
      console.warn('stored setting unreadable', key)
    }
  }, [key, isValid])

  const setStored = useCallback(
    (next: T) => {
      setValue(next)
      void safeStorage.setItem(key, JSON.stringify(next))
    },
    [key],
  )

  return [value, setStored]
}

export type AlertSound = {
  /** the AudioContext exists and runs (after a tap) */
  ready: boolean
  /** creates or resumes the AudioContext: call from a tap (browsers block sound before one) */
  enable: () => Promise<void>
  enabled: boolean
  setEnabled: (value: boolean) => void
  level: SoundLevel
  setLevel: (value: SoundLevel) => void
  tone: ToneId
  setTone: (value: ToneId) => void
  /** vibrate with the tone on phones (`navigator.vibrate`); guests only offer it */
  vibrate: boolean
  setVibrate: (value: boolean) => void
  /** ring until handled (staff boards, phase 4): repeat every 3.5 s while `ringing` */
  loop: boolean
  setLoop: (value: boolean) => void
  ringing: boolean
  setRinging: (value: boolean) => void
  /** also alert while the tab is visible (staff opt-in; default: only a hidden tab beeps) */
  chimeWhenVisible: boolean
  setChimeWhenVisible: (value: boolean) => void
  /** plays the chosen tone (or `tone`, for a ▶ preview) when enabled and ready */
  play: (tone?: ToneId) => void
}

export const LOOP_INTERVAL_MS = 3500
/** bursts (a reconnect replay) play once */
export const COALESCE_MS = 250

/**
 * The alert sound of one screen (rem0018 plan "alert sounds", sdq `useBrowserNotifications`
 * split): scope `guest` on the menu, `<userId>:<tenantId>:<board>` on the staff boards
 * (phase 4). Client only, no `payload` import.
 */
export const useAlertSound = (scope: string): AlertSound => {
  const [enabled, setEnabled] = useStoredSetting(scope, 'sound', true, isBoolean)
  const [level, setLevel] = useStoredSetting(scope, 'level', DEFAULT_LEVEL, isSoundLevel)
  const [tone, setTone] = useStoredSetting(scope, 'tone', DEFAULT_TONE, isToneId)
  const [vibrate, setVibrate] = useStoredSetting(scope, 'vibrate', true, isBoolean)
  const [loop, setLoop] = useStoredSetting(scope, 'loop', false, isBoolean)
  const [chimeWhenVisible, setChimeWhenVisible] = useStoredSetting(
    scope,
    'chimeVisible',
    false,
    isBoolean,
  )

  const [ready, setReady] = useState(false)
  const [ringing, setRinging] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const lastToneAtRef = useRef(0)

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const levelRef = useRef(level)
  levelRef.current = level

  const toneRef = useRef(tone)
  toneRef.current = tone

  const vibrateRef = useRef(vibrate)
  vibrateRef.current = vibrate

  const enable = useCallback(async (): Promise<void> => {
    let ctx = audioContextRef.current
    if (!ctx) {
      const AudioCtx = getAudioContextClass()
      if (!AudioCtx) return
      try {
        ctx = new AudioCtx()
        audioContextRef.current = ctx
        ctx.onstatechange = () => {
          setReady(ctx?.state === 'running')
        }
      } catch (err) {
        console.warn('Failed to construct AudioContext', err)
        return
      }
    }
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch (err) {
        console.warn('Failed to resume AudioContext', err)
      }
    }
    setReady(ctx.state === 'running')
  }, [])

  const play = useCallback((toneToPlay?: ToneId) => {
    if (!enabledRef.current) return
    const ctx = audioContextRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch((err) => {
        console.warn('Failed to resume AudioContext', err)
      })
      return
    }
    if (ctx.state !== 'running') return

    const now = Date.now()
    if (now - lastToneAtRef.current < COALESCE_MS) return
    lastToneAtRef.current = now

    playTone(ctx, toneToPlay ?? toneRef.current, levelRef.current)

    if (
      vibrateRef.current &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate([200, 100, 200])
      } catch {
        // ignore vibrate errors
      }
    }
  }, [])

  useEffect(() => {
    if (!ringing || !loop) return
    play()
    const id = window.setInterval(() => {
      play()
    }, LOOP_INTERVAL_MS)
    return () => {
      window.clearInterval(id)
    }
  }, [ringing, loop, play])

  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current
      audioContextRef.current = null
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch((err: unknown) => console.warn('AudioContext close failed', err))
      }
    }
  }, [])

  return {
    ready,
    enable,
    enabled,
    setEnabled,
    level,
    setLevel,
    tone,
    setTone,
    vibrate,
    setVibrate,
    loop,
    setLoop,
    ringing,
    setRinging,
    chimeWhenVisible,
    setChimeWhenVisible,
    play,
  }
}
