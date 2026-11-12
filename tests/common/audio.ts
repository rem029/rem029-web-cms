import { vi } from 'vitest'

// A fake Web Audio context for jsdom (moved from AlertSoundSettings.test, rem0018 phase 4 step 2b,
// so the board tests share it): `vi.stubGlobal('AudioContext', FakeAudioContext)`; state
// 'running'; every oscillator a tone creates is kept in `createdOscillators`, with the
// frequencies it was given in `frequency.setValueAtTime.mock.calls`. Reset both statics in
// `beforeEach`.

export type FakeOscillator = {
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>
  }
  type: string
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

type FakeGain = {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
    linearRampToValueAtTime: ReturnType<typeof vi.fn>
    value: number
  }
  connect: ReturnType<typeof vi.fn>
}

type FakeBiquadFilter = {
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>
  }
  Q: {
    setValueAtTime: ReturnType<typeof vi.fn>
  }
  type: string
  connect: ReturnType<typeof vi.fn>
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static createdOscillators: FakeOscillator[] = []

  currentTime = 0
  destination = {}
  state: AudioContextState = 'running'
  resume = vi.fn(async () => {})
  close = vi.fn(async () => {})

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createOscillator(): FakeOscillator {
    const osc: FakeOscillator = {
      frequency: {
        setValueAtTime: vi.fn(),
      },
      type: 'sine',
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
    FakeAudioContext.createdOscillators.push(osc)
    return osc
  }

  createGain(): FakeGain {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        value: 1,
      },
      connect: vi.fn(),
    }
  }

  createBiquadFilter(): FakeBiquadFilter {
    return {
      frequency: {
        setValueAtTime: vi.fn(),
      },
      Q: {
        setValueAtTime: vi.fn(),
      },
      type: 'lowpass',
      connect: vi.fn(),
    }
  }
}
