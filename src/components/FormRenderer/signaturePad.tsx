'use client'
/**
 * A signature, drawn on a canvas (`signature_pad`) or typed. A drawn signature is exported as a
 * PNG `EXPORT_DELAY_MS` after the last stroke (a new stroke restarts the wait), so a signature
 * is one upload, not one per stroke; `onPendingChange` says when an export is waiting, so the
 * form can hold Next / Review / Send. The typed fallback (keyboard, screen reader, one hand) draws
 * the name on the canvas in the form's font when the visitor leaves it and exports at once.
 * Either way `onChange` gets a `File`, which `UploadInput` uploads like any file. "Clear" empties
 * both. Resizes with its container (devicePixelRatio), touch and mouse. Rendered by `UploadInput`.
 *
 * The canvas is `role="img"` named "<label>, <drawLabel>" (a `<label for>` can't name a canvas);
 * the field's label points at the typed input instead (`id`). Styled by `.fb-signature` in
 * formRenderer.css (no utility classes: they are unlayered and would beat the form's tokens).
 */
import React, { useEffect, useRef, useState } from 'react'
import SignaturePadLib from 'signature_pad'

import { Button } from '@/components/ui/button'

export type SignaturePadProps = {
  /** the typed input's id: the field's `<label>` points at it */
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
  onPendingChange?: (pending: boolean) => void
}

/** How long after the last stroke a drawn signature is exported (one upload per signature). */
export const EXPORT_DELAY_MS = 800

export const SignaturePad: React.FC<SignaturePadProps> = ({
  id,
  label,
  describedBy,
  disabled,
  clearLabel,
  drawLabel,
  typedLabel,
  onChange,
  onPendingChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [typed, setTyped] = useState('')
  // the typed name drawn on the canvas, redrawn after a resize
  const drawnNameRef = useRef('')
  // the latest callbacks without re-creating the pad on every render
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onPendingRef = useRef(onPendingChange)
  onPendingRef.current = onPendingChange

  const cancelPending = () => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
    onPendingRef.current?.(false)
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) onChangeRef.current(new File([blob], 'signature.png', { type: 'image/png' }))
      // after onChange, so the upload is already marked busy when the wait ends
      onPendingRef.current?.(false)
    }, 'image/png')
  }

  const drawName = (name: string) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const style = getComputedStyle(canvas)
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    context.save()
    context.font = `italic ${Math.round(height / 4)}px ${style.fontFamily}`
    context.direction = style.direction === 'rtl' ? 'rtl' : 'ltr'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = padRef.current?.penColor ?? style.color
    context.fillText(name, width / 2, height / 2, width - 32)
    context.restore()
    drawnNameRef.current = name
  }

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
      if (drawnNameRef.current) drawName(drawnNameRef.current)
    }
    // drawing replaces a typed name
    const beginStroke = () => {
      if (!drawnNameRef.current) return
      pad.clear()
      drawnNameRef.current = ''
      setTyped('')
    }
    const endStroke = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      else onPendingRef.current?.(true)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        exportPng()
      }, EXPORT_DELAY_MS)
    }

    resize()
    window.addEventListener('resize', resize)
    pad.addEventListener('beginStroke', beginStroke)
    pad.addEventListener('endStroke', endStroke)
    return () => {
      window.removeEventListener('resize', resize)
      pad.removeEventListener('beginStroke', beginStroke)
      pad.removeEventListener('endStroke', endStroke)
      if (timerRef.current) clearTimeout(timerRef.current)
      pad.off()
      padRef.current = null
    }
    // the pad is created once; drawName and exportPng only read refs
  }, [])

  useEffect(() => {
    if (disabled) padRef.current?.off()
    else padRef.current?.on()
  }, [disabled])

  const signTyped = () => {
    const name = typed.trim()
    if (!name || name === drawnNameRef.current) return
    cancelPending()
    padRef.current?.clear()
    drawName(name)
    exportPng()
  }

  const clear = () => {
    cancelPending()
    padRef.current?.clear()
    drawnNameRef.current = ''
    setTyped('')
    onChange(null)
  }

  return (
    <div className="fb-signature">
      <canvas
        aria-describedby={describedBy}
        aria-label={`${label}, ${drawLabel}`}
        id={`${id}-pad`}
        ref={canvasRef}
        role="img"
      />
      <label className="fb-help" htmlFor={id}>
        {typedLabel}
      </label>
      <input
        aria-describedby={describedBy}
        autoComplete="name"
        className="fb-input fb-signature-typed"
        disabled={disabled}
        id={id}
        onBlur={signTyped}
        onChange={(event) => setTyped(event.target.value)}
        type="text"
        value={typed}
      />
      <Button
        className="fb-button"
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
