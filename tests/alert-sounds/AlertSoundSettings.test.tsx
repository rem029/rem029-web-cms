// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AlertSoundSettings } from '@/common/components/AlertSounds/AlertSoundSettings'
import { useAlertSound } from '@/common/components/AlertSounds/useAlertSound'

import { FakeAudioContext } from '../common/audio'

// rem0018 phase 3 step 2b: the alert sound panel over a real useAlertSound('test') (a small
// harness component renders both). `AudioContext` is the shared fake (tests/common/audio.ts), so
// a played tone shows as oscillators created.

const Harness: React.FC = () => {
  const sound = useAlertSound('test')
  return <AlertSoundSettings sound={sound} locale="en" />
}

const HarnessWithPlayOnMount: React.FC = () => {
  const sound = useAlertSound('test')
  useEffect(() => {
    sound.play()
  }, [sound])
  return <AlertSoundSettings sound={sound} locale="en" />
}

describe('AlertSoundSettings', () => {
  beforeEach(() => {
    FakeAudioContext.instances = []
    FakeAudioContext.createdOscillators = []
    vi.stubGlobal('AudioContext', FakeAudioContext)
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('previews the chosen tone', async () => {
    // arrange: render the harness
    render(<Harness />)

    // act: click ▶ on "Bell"
    const playBell = screen.getByRole('button', { name: 'Play Bell' })
    fireEvent.click(playBell)

    // assert: the AudioContext was created and oscillators started
    expect(FakeAudioContext.instances.length).toBeGreaterThan(0)
    expect(FakeAudioContext.createdOscillators.length).toBeGreaterThan(0)
    expect(FakeAudioContext.createdOscillators[0]?.start).toHaveBeenCalled()
  })

  it('remembers the choice on this device', async () => {
    // arrange: render, pick "Ring" and volume "High"
    const { unmount } = render(<Harness />)
    fireEvent.click(screen.getByRole('radio', { name: 'Ring' }))
    fireEvent.click(screen.getByRole('radio', { name: 'High' }))

    // act: unmount, render again
    unmount()
    render(<Harness />)

    // assert: "Ring" and "High" checked; localStorage has orders-notify:test:tone and :level
    expect(screen.getByRole('radio', { name: 'Ring' })).toHaveProperty('checked', true)
    expect(screen.getByRole('radio', { name: 'High' })).toHaveProperty('checked', true)
    expect(localStorage.getItem('orders-notify:test:tone')).toContain('ring')
    expect(localStorage.getItem('orders-notify:test:level')).toContain('high')
  })

  it('stays silent when sound is off', async () => {
    // arrange: render, untick "Sound"
    render(<Harness />)
    const soundCheckbox = screen.getByRole('checkbox', { name: 'Sound' })
    fireEvent.click(soundCheckbox)

    // act: click ▶ on "Chime"
    const playChime = screen.getByRole('button', { name: 'Play Chime' })
    fireEvent.click(playChime)

    // assert: no oscillator created
    expect(FakeAudioContext.createdOscillators).toHaveLength(0)
  })

  it('waits for a tap before playing', () => {
    // arrange: render the harness; the harness calls sound.play() on mount
    render(<HarnessWithPlayOnMount />)

    // act: nothing

    // assert: no AudioContext created
    expect(FakeAudioContext.instances).toHaveLength(0)
  })
})
