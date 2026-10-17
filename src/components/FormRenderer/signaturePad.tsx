'use client'
/**
 * A drawn signature on a canvas (`signature_pad`). At the end of each stroke it exports a PNG
 * and hands it to `onChange` as a `File`; `FieldControl` uploads it like any file. "Clear"
 * empties it. Resizes with its container (devicePixelRatio), touch and mouse. Rendered by
 * `FieldControl`.
 */
import React, { useEffect, useRef } from 'react'
import SignaturePadLib from 'signature_pad'

import { Button } from '@/components/ui/button'

export type SignaturePadProps = {
  id: string
  disabled?: boolean
  clearLabel: string
  onChange: (file: File | null) => void
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  id,
  disabled,
  clearLabel,
  onChange,
}) => {
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
