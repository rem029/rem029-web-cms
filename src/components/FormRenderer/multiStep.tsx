'use client'
/**
 * A multi-step form: one step at a time (`fb-step` / `fb-step--active`, the step's `css_class`),
 * the progress bar, Back / Next, then the review screen and Submit. Next checks only the
 * current step's required fields (`missingRequired` on that step) and focuses the first error.
 * "Edit" on the review screen jumps to that step and Next returns to review. Rendered by
 * `FormRenderer` when the form's top-level field is a `multi-step` block (phase 1's
 * `validateMultiStep` keeps every other field inside the steps).
 */
import React from 'react'

import type { MultiStepBlock } from './types'

export type MultiStepProps = {
  block: MultiStepBlock
  submitLabel: string
  submitting: boolean
  /** Called from the review screen; FormRenderer runs the full check and sends. */
  onSubmit: () => void
}

export const MultiStep: React.FC<MultiStepProps> = () => {
  // 1. state: current (0), reviewing (false), returnToReview (false)
  // 2. steps = block.steps ?? []; none → null
  // 3. reviewing → <ReviewScreen sections={steps} onEdit={(i) => go to i, returnToReview}
  //                 onSubmit submitLabel submitting />
  // 4. else <ProgressBar current total labels />
  //        <section className={cn('fb-step fb-step--active', step.css_class)}
  //          aria-labelledby=step heading> heading label + description
  //        <RecursiveFields fields={step.fields} />
  //    actions: Back (hidden on 0) · Next (last step → Review)
  // 5. Next: missing = missingRequired(step.fields, values, listCounts);
  //    missing → set errors through the context, focus the first `[data-field]`; else advance
  //    (or back to review when returnToReview); scroll the form top into view
  return <div />
}
