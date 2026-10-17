/**
 * Where the visitor is in a multi-step form, as the Appearance tab's "Step indicator" asks:
 * - progress: "Step 2 of 3 · <label>" + a bar (`role="progressbar"`)
 * - numbered: an ordered list of the steps, numbers + labels (labels hidden on phones),
 *   done / current / upcoming (`aria-current="step"`)
 * - dots: one dot per step + the "Step 2 of 3" text for screen readers
 * - none: nothing (the step heading still says where you are)
 * All share `fb-steps` + `fb-steps--<variant>`. Replaces step 1's `progressBar.tsx`; rendered
 * by `MultiStep`.
 */
import React from 'react'

import type { RendererLocale } from './types'

export type StepIndicatorVariant = 'progress' | 'numbered' | 'dots' | 'none'

export type StepIndicatorProps = {
  variant: StepIndicatorVariant
  current: number
  labels: string[]
  locale: RendererLocale
}

export const StepIndicator: React.FC<StepIndicatorProps> = () => {
  // 1. variant none or one step → null
  // 2. progress → step 1's ProgressBar markup (moved here), class fb-steps fb-steps--progress
  // 3. numbered → <ol className="fb-steps fb-steps--numbered"> li per step with
  //    data-state done|current|upcoming, aria-current on the current one, number + label
  // 4. dots → <ol aria-label=stepOf(current+1,total)> li per step (aria-hidden dots)
  return null
}
