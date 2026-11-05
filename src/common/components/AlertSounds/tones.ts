/**
 * The alert tones (rem0018 plan "alert sounds", ported from sdq `useBrowserNotifications`):
 * synthesised with the Web Audio API, no sound files. Pure scheduling: each tone gets a running
 * `AudioContext` and the level's multiplier, schedules its oscillators from `ctx.currentTime`
 * and disconnects its nodes when they end. No React, no storage: `useAlertSound` owns those.
 */

export const TONE_IDS = ['classic', 'chime', 'ring', 'bell', 'handbell'] as const
export type ToneId = (typeof TONE_IDS)[number]

export const SOUND_LEVELS = ['low', 'normal', 'high'] as const
export type SoundLevel = (typeof SOUND_LEVELS)[number]

export const DEFAULT_TONE: ToneId = 'chime'
export const DEFAULT_LEVEL: SoundLevel = 'normal'

/** kept quiet on purpose: `normal` is a soft chime, `high` for a noisy kitchen pass */
export const LEVEL_MULTIPLIER: Record<SoundLevel, number> = { low: 0.5, normal: 1, high: 1.7 }

type Tone = (ctx: AudioContext, multiplier: number) => void

const disconnectNode = (node: AudioNode) => {
  try {
    if (typeof node.disconnect === 'function') {
      node.disconnect()
    }
  } catch {
    // already disconnected or torn down
  }
}

// sdq's numbers, one function each:
// - classic: two triangle notes 660 Hz (100 ms) then 880 Hz (110 ms), peak 0.11
// - chime: sines 587.33 Hz (300 ms) then 783.99 Hz at +130 ms (400 ms), low-pass 1300 Hz Q 0.7,
//   peak 0.05
// - ring: sines 440 + 480 Hz through one gain, two 400 ms bursts (0 and +600 ms, 15 ms
//   attack/release), low-pass 1000 Hz, peak 0.09
// - bell: 660 Hz with inharmonic partials (×1, 2.76, 5.4, 8.93; gains 1, .6, .35, .2; decays
//   1.8, 1.2, .7, .4 s), 5 ms attack, low-pass 3500 Hz, peak 0.06
// - handbell: the bell's partials (gains 1, .55, .3, .18; decays 1.6, 1, .6, .35 s) struck three
//   times 400 ms apart (decay ×.5, ×.5, ×1; detune ×1, .993, 1.006), peak 0.055
// every node disconnects on `onended` (shared filters after the longest tail)
const classic: Tone = (ctx, mult) => {
  const now = ctx.currentTime
  const peak = 0.11 * mult

  // Note 1: ~660Hz, triangle oscillator, ~100ms duration
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'triangle'
  osc1.frequency.setValueAtTime(660, now)

  gain1.gain.setValueAtTime(0.0001, now)
  gain1.gain.exponentialRampToValueAtTime(peak, now + 0.02)
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)

  osc1.connect(gain1)
  gain1.connect(ctx.destination)

  osc1.start(now)
  osc1.stop(now + 0.1)
  osc1.onended = () => {
    disconnectNode(osc1)
    disconnectNode(gain1)
  }

  // Note 2: ~880Hz, triangle oscillator, ~110ms duration (total ~220ms)
  const t2 = now + 0.11
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(880, t2)

  gain2.gain.setValueAtTime(0.0001, t2)
  gain2.gain.exponentialRampToValueAtTime(peak, t2 + 0.02)
  gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.11)

  osc2.connect(gain2)
  gain2.connect(ctx.destination)

  osc2.start(t2)
  osc2.stop(t2 + 0.11)
  osc2.onended = () => {
    disconnectNode(osc2)
    disconnectNode(gain2)
  }
}

const chime: Tone = (ctx, mult) => {
  const now = ctx.currentTime
  const peak = 0.05 * mult

  // Shared low-pass: keep only the rounded fundamental, drop the piercing
  // harmonics that make a raw oscillator read as an alarm.
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1300, now)
  filter.Q.setValueAtTime(0.7, now)
  filter.connect(ctx.destination)

  const playNote = (freq: number, startAt: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, startAt)

    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

    osc.connect(gain)
    gain.connect(filter)

    osc.start(startAt)
    osc.stop(startAt + duration)
    osc.onended = () => {
      disconnectNode(osc)
      disconnectNode(gain)
    }
  }

  playNote(587.33, now, 0.3)
  playNote(783.99, now + 0.13, 0.4)

  // Release the shared filter once the longest tail has finished.
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      disconnectNode(filter)
    }, 700)
  }
}

const ring: Tone = (ctx, mult) => {
  const now = ctx.currentTime
  const peak = 0.09 * mult

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1000, now)
  filter.connect(ctx.destination)

  const gain = ctx.createGain()
  gain.connect(filter)

  // Burst A: now -> now + 0.4s (15ms attack, hold, 15ms release)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.015)
  gain.gain.setValueAtTime(peak, now + 0.385)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

  // Burst B: now + 0.6s -> now + 1.0s (15ms attack, hold, 15ms release)
  gain.gain.setValueAtTime(0.0001, now + 0.6)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.615)
  gain.gain.setValueAtTime(peak, now + 0.985)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0)

  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  osc1.type = 'sine'
  osc2.type = 'sine'
  osc1.frequency.setValueAtTime(440, now)
  osc2.frequency.setValueAtTime(480, now)

  osc1.connect(gain)
  osc2.connect(gain)

  osc1.start(now)
  osc1.stop(now + 1.0)
  osc2.start(now)
  osc2.stop(now + 1.0)

  let stopped = 0
  const cleanup = () => {
    disconnectNode(osc1)
    disconnectNode(osc2)
    disconnectNode(gain)
    disconnectNode(filter)
  }
  osc1.onended = () => {
    stopped++
    if (stopped === 2) cleanup()
  }
  osc2.onended = () => {
    stopped++
    if (stopped === 2) cleanup()
  }
  if (typeof window !== 'undefined') {
    window.setTimeout(cleanup, 1200)
  }
}

const bell: Tone = (ctx, mult) => {
  const now = ctx.currentTime
  const peak = 0.06 * mult
  const fundamental = 660

  // Soften the top end so the metallic partials shimmer rather than pierce.
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3500, now)
  filter.connect(ctx.destination)

  // Struck-metal timbre = a few INHARMONIC partials (not integer multiples),
  // each quieter and shorter-lived than the last, over a long exponential tail.
  const partials: { ratio: number; gain: number; decay: number }[] = [
    { ratio: 1, gain: 1.0, decay: 1.8 },
    { ratio: 2.76, gain: 0.6, decay: 1.2 },
    { ratio: 5.4, gain: 0.35, decay: 0.7 },
    { ratio: 8.93, gain: 0.2, decay: 0.4 },
  ]

  partials.forEach(({ ratio, gain: g, decay }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(fundamental * ratio, now)

    // Near-instant attack (a strike), long exponential ring-out.
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak * g, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)

    osc.connect(gain)
    gain.connect(filter)

    osc.start(now)
    osc.stop(now + decay)
    osc.onended = () => {
      disconnectNode(osc)
      disconnectNode(gain)
    }
  })

  // Release the shared filter after the longest partial has decayed.
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      disconnectNode(filter)
    }, 2000)
  }
}

const handbell: Tone = (ctx, mult) => {
  const now = ctx.currentTime
  const peak = 0.055 * mult
  const fundamental = 660

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3500, now)
  filter.connect(ctx.destination)

  const partials: { ratio: number; gain: number; decay: number }[] = [
    { ratio: 1, gain: 1.0, decay: 1.6 },
    { ratio: 2.76, gain: 0.55, decay: 1.0 },
    { ratio: 5.4, gain: 0.3, decay: 0.6 },
    { ratio: 8.93, gain: 0.18, decay: 0.35 },
  ]

  // One clapper strike. `decayScale` < 1 cuts the ring short when another
  // swing follows; `wobble` detunes the whole strike a few cents to mimic
  // the bell meeting the clapper at a different point of its arc.
  const strike = (startAt: number, decayScale: number, wobble: number) => {
    partials.forEach(({ ratio, gain: g, decay }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(fundamental * ratio * wobble, startAt)

      const d = decay * decayScale
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(peak * g, startAt + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + d)

      osc.connect(gain)
      gain.connect(filter)

      osc.start(startAt)
      osc.stop(startAt + d)
      osc.onended = () => {
        disconnectNode(osc)
        disconnectNode(gain)
      }
    })
  }

  // Three swings ~0.4 s apart; the first two are damped by the next
  // swing, the last one rings out in full.
  strike(now, 0.5, 1.0)
  strike(now + 0.4, 0.5, 0.993)
  strike(now + 0.8, 1.0, 1.006)

  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      disconnectNode(filter)
    }, 2800)
  }
}

const TONES: Record<ToneId, Tone> = { classic, chime, ring, bell, handbell }

/** Plays `tone` now on a running context; scheduling errors are caught (`console.warn`). */
export const playTone = (ctx: AudioContext, tone: ToneId, level: SoundLevel): void => {
  try {
    TONES[tone](ctx, LEVEL_MULTIPLIER[level])
  } catch (err) {
    console.warn('Failed to play alert tone', err)
  }
}
