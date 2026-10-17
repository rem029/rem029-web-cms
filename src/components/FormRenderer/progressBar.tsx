/**
 * Where the visitor is in a multi-step form: "Step 2 of 3" + a bar (`fb-progress`, `role`
 * progressbar with aria-valuenow). Step 2 replaces it with `stepIndicator.tsx` (progress /
 * numbered / dots / none from the Appearance tab). Rendered by `MultiStep`.
 */
import React from 'react'

import type { RendererLocale } from './types'

export type ProgressBarProps = {
  current: number
  total: number
  labels: string[]
  locale: RendererLocale
}

export const ProgressBar: React.FC<ProgressBarProps> = () => {
  // 1. <div className="fb-progress" role="progressbar" aria-valuemin=1 aria-valuemax=total
  //      aria-valuenow=current+1 aria-valuetext={labels[current]}>
  // 2. text formText(locale).stepOf(current + 1, total) · labels[current]
  // 3. bar width (current + 1) / total; logical properties so it fills from the right in rtl
  return <div />
}
