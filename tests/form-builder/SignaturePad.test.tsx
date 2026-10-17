// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormRenderer } from '@/components/FormRenderer'
import { SignaturePad, EXPORT_DELAY_MS } from '@/components/FormRenderer/signaturePad'

import { fakeSubmit, fakeUpload, formDoc } from './renderForms'

// step 5 (critique P0). `signature_pad` and the canvas 2d context are mocked: jsdom has no canvas,
// and they are outside edges. The mocks keep the stroke listeners so a test can fire strokes.

// the site's RichText reaches the Code block's copy button, which imports the admin UI (scss)
vi.mock('@payloadcms/ui/icons/Copy', () => ({ CopyIcon: () => null }))

const pad = vi.hoisted(() => ({ listeners: {} as Record<string, () => void> }))

vi.mock('signature_pad', () => ({
  default: class {
    penColor = 'black'
    addEventListener(type: string, listener: () => void) {
      pad.listeners[type] = listener
    }
    removeEventListener() {}
    clear() {}
    on() {}
    off() {}
    toData() {
      return []
    }
    fromData() {}
  },
}))

const context = { fillText: vi.fn(), save() {}, restore() {}, scale() {} }

const stroke = () =>
  act(() => {
    pad.listeners.beginStroke?.()
    pad.listeners.endStroke?.()
  })

const renderPad = () => {
  const onChange = vi.fn<(file: File | null) => void>()
  const onPendingChange = vi.fn<(pending: boolean) => void>()
  render(
    <SignaturePad
      clearLabel="Clear"
      drawLabel="draw your signature"
      id="fb-sign"
      label="Signature"
      onChange={onChange}
      onPendingChange={onPendingChange}
      typedLabel="Or type your full name"
    />,
  )
  return { onChange, onPendingChange }
}

describe('SignaturePad', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => context as unknown as CanvasRenderingContext2D, // only the calls the pad makes
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    )
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    context.fillText.mockClear()
    pad.listeners = {}
  })

  it('names the drawing area for screen readers', () => {
    // arrange
    renderPad()

    // act: -

    // assert
    expect(screen.getByRole('img', { name: 'Signature, draw your signature' })).toBeTruthy()
  })

  it('offers a typed name instead of drawing', () => {
    // arrange
    renderPad()

    // act
    const input = screen.getByLabelText('Or type your full name')

    // assert
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect((input as HTMLInputElement).type).toBe('text')
  })

  it('hands over one file after the visitor stops drawing', () => {
    // arrange
    vi.useFakeTimers()
    const { onChange } = renderPad()

    // act
    stroke()
    act(() => void vi.advanceTimersByTime(100))
    stroke()
    act(() => void vi.advanceTimersByTime(100))
    stroke()
    act(() => void vi.advanceTimersByTime(EXPORT_DELAY_MS))

    // assert
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toBeInstanceOf(File)
    expect(onChange.mock.calls[0]?.[0]?.name).toBe('signature.png')
  })

  it('signs with a typed name on leaving the input', () => {
    // arrange
    const { onChange } = renderPad()
    const input = screen.getByLabelText('Or type your full name')

    // act
    fireEvent.change(input, { target: { value: 'Sara Ali' } })
    fireEvent.blur(input)

    // assert
    expect(context.fillText).toHaveBeenCalledWith(
      'Sara Ali',
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toBeInstanceOf(File)
  })

  it('drops a pending signature when cleared', () => {
    // arrange
    vi.useFakeTimers()
    const { onChange } = renderPad()

    // act
    stroke()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    act(() => void vi.advanceTimersByTime(EXPORT_DELAY_MS))

    // assert
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  // added at the implementation review: the user asked for Send / Next / Review to wait
  it('holds Send while a signature is waiting to upload', () => {
    // arrange
    vi.useFakeTimers()
    render(
      <FormRenderer
        form={formDoc([
          { blockType: 'signature', name: 'sign', label: 'Signature', required: true },
        ])}
        locale="en"
        submit={fakeSubmit()}
        upload={fakeUpload()}
      />,
    )
    const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement

    // act
    stroke()

    // assert
    expect(send.disabled).toBe(true)
  })
})
