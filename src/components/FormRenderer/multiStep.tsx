'use client'
/**
 * A multi-step form: one step at a time (`fb-step` / `fb-step--active`, the step's `css_class`),
 * the progress bar, Back / Next, then the review screen and Submit. Next checks only the
 * current step's required fields (`missingRequired` on that step) and focuses the first error.
 * "Edit" on the review screen jumps to that step and Next returns to review. Rendered by
 * `FormRenderer` when the form's top-level field is a `multi-step` block (phase 1's
 * `validateMultiStep` keeps every other field inside the steps).
 */
import React, { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/ui'

import { useFormRenderer } from './context'
import { focusFirstError, missingRequired } from './helpers'
import { formText } from './i18n'
// step 2: CHANGE — ProgressBar → StepIndicator with variant = step_indicator prop from FormRenderer
import { ProgressBar } from './progressBar'
import { RecursiveFields } from './recursiveFields'
import { ReviewScreen } from './reviewScreen'
import type { MultiStepBlock } from './types'

export type MultiStepProps = {
  block: MultiStepBlock
  submitLabel: string
  submitting: boolean
  // step 2: ADD — stepIndicator: StepIndicatorVariant (from appearanceToStyle's preset)
  /** Called from the review screen; FormRenderer runs the full check and sends. */
  onSubmit: () => void
}

export const MultiStep: React.FC<MultiStepProps> = ({
  block,
  submitLabel,
  submitting,
  onSubmit,
}) => {
  const { values, listCounts, setErrors, locale } = useFormRenderer()
  const [current, setCurrent] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [returnToReview, setReturnToReview] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const text = formText(locale)

  const steps = block.steps ?? []
  const step = steps[current]
  if (!step) return null
  const last = current === steps.length - 1

  const show = (index: number, review = false) => {
    setCurrent(index)
    setReviewing(review)
    topRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }

  const next = () => {
    const missing = missingRequired(step.fields ?? [], values, listCounts)
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map(({ path }) => [path, text.required])))
      focusFirstError(topRef.current, missing[0]?.path)
      return
    }
    setErrors({})
    if (last || returnToReview) show(current, true)
    else show(current + 1)
  }

  if (reviewing) {
    return (
      <div ref={topRef}>
        <ReviewScreen
          onEdit={(index) => {
            setReturnToReview(true)
            show(index)
          }}
          onSubmit={onSubmit}
          sections={steps}
          submitLabel={submitLabel}
          submitting={submitting}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6" ref={topRef}>
      {steps.length > 1 && (
        <ProgressBar
          current={current}
          labels={steps.map((s) => s.label)}
          locale={locale}
          total={steps.length}
        />
      )}
      <section
        aria-labelledby={`fb-step-${current}`}
        // step 2: CHANGE — tailwind look → formRenderer.css (.fb-step); same for fb-actions
        className={cn('fb-step fb-step--active flex flex-col gap-4', step.css_class)}
      >
        <div>
          <h2 className="text-lg font-semibold" id={`fb-step-${current}`}>
            {step.label}
          </h2>
          {step.description && (
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          )}
        </div>
        <RecursiveFields fields={step.fields ?? []} />
      </section>
      <div className="fb-actions flex justify-between gap-2">
        {current > 0 ? (
          <Button
            className="fb-button"
            onClick={() => show(current - 1)}
            type="button"
            variant="outline"
          >
            {text.back}
          </Button>
        ) : (
          <span />
        )}
        <Button className="fb-button fb-button--primary" onClick={next} type="button">
          {last || returnToReview ? text.review : text.next}
        </Button>
      </div>
    </div>
  )
}
