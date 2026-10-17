'use client'
/**
 * A drawn signature on a canvas (`signature_pad`). At the end of each stroke it exports a PNG
 * and hands it to `onChange` as a `File`; `FieldControl` uploads it like any file. "Clear"
 * empties it. Resizes with its container (devicePixelRatio), touch and mouse. Rendered by
 * `FieldControl`.
 *
 * step 5 (skeleton, critique P0), to build:
 * 1. the canvas is `role="img"` named "<label>, <drawLabel>", with the field's `describedBy`
 * 2. a typed fallback under it (`fb-input fb-signature-typed`, labelled `typedLabel`): on blur
 *    with text → clear the pad, draw the name (italic, the form's font, centred), export once;
 *    a new stroke clears the typed text
 * 3. export a drawn signature once, `EXPORT_DELAY_MS` after the last stroke (a new stroke
 *    restarts the wait), not on every stroke; Clear cancels a pending export and empties both
 */
import React, { useEffect, useRef } from 'react'
import SignaturePadLib from 'signature_pad'

import { Button } from '@/components/ui/button'

export type SignaturePadProps = {
  id: string
  /** the field's label, part of the drawing area's accessible name */
  label: string
  /** the field's help / error ids (`aria-describedby`) */
  describedBy?: string
  disabled?: boolean
  clearLabel: string
  drawLabel: string
  typedLabel: string
  onChange: (file: File | null) => void
}

/** How long after the last stroke a drawn signature is exported (one upload per signature). */
export const EXPORT_DELAY_MS = 800

export const SignaturePad: React.FC<SignaturePadProps> = ({
  id,
  disabled,
  clearLabel,
  onChange,
}) => {
  // step 5: label, describedBy, drawLabel and typedLabel are used once built (see the file comment)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  // the latest onChange without re-creating the pad on every render
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const canvas = canvasRef.current
    // jsdom and very old browsers have no 2d canvas
    if (!canvas?.getContext('2d')) return
    const pad = new SignaturePadLib(canvas)
    padRef.current = pad

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const strokes = pad.toData()
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      pad.fromData(strokes)
    }
    const exportPng = () =>
      canvas.toBlob((blob) => {
        if (blob) onChangeRef.current(new File([blob], 'signature.png', { type: 'image/png' }))
      }, 'image/png')

    resize()
    window.addEventListener('resize', resize)
    pad.addEventListener('endStroke', exportPng)
    return () => {
      window.removeEventListener('resize', resize)
      pad.removeEventListener('endStroke', exportPng)
      pad.off()
      padRef.current = null
    }
  }, [])

  useEffect(() => {
    if (disabled) padRef.current?.off()
    else padRef.current?.on()
  }, [disabled])

  const clear = () => {
    padRef.current?.clear()
    onChange(null)
  }

  return (
    <div className="fb-signature flex flex-col gap-2">
      <canvas
        className="h-40 w-full touch-none rounded border border-border bg-background"
        id={id}
        ref={canvasRef}
      />
      <Button
        className="fb-button self-start"
        disabled={disabled}
        onClick={clear}
        size="sm"
        type="button"
        variant="outline"
      >
        {clearLabel}
      </Button>
    </div>
  )
}
