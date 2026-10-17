/**
 * step 2: REMOVE — replaced by stepIndicator.tsx (its progress variant takes this markup).
 * Where the visitor is in a multi-step form: "Step 2 of 3" + a bar (`fb-progress`, `role`
 * progressbar with aria-valuenow). Step 2 replaces it with `stepIndicator.tsx` (progress /
 * numbered / dots / none from the Appearance tab). Rendered by `MultiStep`.
 */
import React from 'react'

import { formText } from './i18n'
import type { RendererLocale } from './types'

export type ProgressBarProps = {
  current: number
  total: number
  labels: string[]
  locale: RendererLocale
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, labels, locale }) => (
  <div className="fb-progress flex flex-col gap-2">
    <p className="text-sm text-muted-foreground">
      {formText(locale).stepOf(current + 1, total)}
      {labels[current] && ` · ${labels[current]}`}
    </p>
    <div
      aria-valuemax={total}
      aria-valuemin={1}
      aria-valuenow={current + 1}
      aria-valuetext={labels[current]}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
    >
      {/* a block-level child fills from the inline start, so it grows from the right in rtl */}
      <div
        className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  </div>
)
