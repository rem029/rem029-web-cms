'use client'
/**
 * A drawn signature on a canvas (`signature_pad` package, added at implementation: MIT, the
 * standard canvas signature library). On end of stroke it exports a PNG and hands it to
 * `onChange` as a `File`; `FieldControl` uploads it like any file. "Clear" empties it.
 * Resizes with its container (devicePixelRatio), touch and mouse. Rendered by `FieldControl`.
 */
import React from 'react'

export type SignaturePadProps = {
  id: string
  disabled?: boolean
  clearLabel: string
  onChange: (file: File | null) => void
}

export const SignaturePad: React.FC<SignaturePadProps> = () => {
  // 1. ref canvas; on mount new SignaturePad(canvas), resize to the container × dpr
  // 2. on endStroke → canvas.toBlob(png) → new File([blob], 'signature.png') → onChange(file)
  // 3. Clear button → pad.clear(), onChange(null)
  // 4. disabled → pad.off(); cleanup on unmount
  return <div />
}
