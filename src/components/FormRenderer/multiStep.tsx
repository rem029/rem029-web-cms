'use client'
/**
 * A multi-step form: one step at a time (`fb-step` / `fb-step--active`, the step's `css_class`),
 * the step indicator, Back / Next, then the review screen and Submit. Next checks only the
 * current step's required fields (`missingRequired` on that step) and focuses the first error.
 * "Edit" on the review screen jumps to that step and Next returns to review. Rendered by
 * `FormRenderer` when the form's top-level field is a `multi-step` block (phase 1's
 * `validateMultiStep` keeps every other field inside the steps).
 */
import React, { useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

import { useFormRenderer } from './context'
import { focusFirstError, missingRequired } from './helpers'
import { formText } from './i18n'
import { RecursiveFields } from './recursiveFields'
import { ReviewScreen } from './reviewScreen'
import { StepIndicator, type StepIndicatorVariant } from './stepIndicator'
import type { MultiStepBlock } from './types'

export type MultiStepProps = {
  block: MultiStepBlock
  submitLabel: string
  submitting: boolean
  stepIndicator: StepIndicatorVariant
  /** Called from the review screen; FormRenderer runs the full check and sends. */
  onSubmit: () => void
  /** Shown beside the actions (the "draft saved" note). */
  status?: React.ReactNode
  /** The terms checkbox and the honeypot, shown on the review screen above Submit. */
  beforeSubmit?: React.ReactNode
}

export const MultiStep: React.FC<MultiStepProps> = ({
  block,
  submitLabel,
  submitting,
  stepIndicator,
  onSubmit,
  status,
  beforeSubmit,
}) => {
  const { values, listCounts, setErrors, locale, busy } = useFormRenderer()
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
      setErrors(Object.fromEntries(missing.map(({ path, label }) => [path, text.required(label)])))
      focusFirstError(topRef.current, missing[0]?.path)
      return
    }
    setErrors({})
    if (last || returnToReview) show(current, true)
    else show(current + 1)
  }

  if (reviewing) {
    return (
      <div className="fb-steps-flow" ref={topRef}>
        <ReviewScreen
          beforeSubmit={beforeSubmit}
          onEdit={(index) => {
            setReturnToReview(true)
            show(index)
          }}
          onSubmit={onSubmit}
          sections={steps}
          status={status}
          submitLabel={submitLabel}
          submitting={submitting}
        />
      </div>
    )
  }

  return (
    <div className="fb-steps-flow" ref={topRef}>
      <StepIndicator
        current={current}
        labels={steps.map((s) => s.label)}
        locale={locale}
        variant={stepIndicator}
      />
      <section
        aria-labelledby={`fb-step-${current}`}
        className={cn('fb-step fb-step--active', step.css_class)}
      >
        <div>
          <h2 className="fb-step-title" id={`fb-step-${current}`}>
            {step.label}
          </h2>
          {step.description && <p className="fb-step-description">{step.description}</p>}
        </div>
        <RecursiveFields fields={step.fields ?? []} />
      </section>
      <div className={cn('fb-actions', current > 0 && 'fb-actions--split')}>
        {status}
        {current > 0 && (
          <button className="fb-button" onClick={() => show(current - 1)} type="button">
            {text.back}
          </button>
        )}
        <button
          className="fb-button fb-button--primary"
          disabled={busy}
          onClick={next}
          type="button"
        >
          {last || returnToReview ? text.review : text.next}
        </button>
      </div>
    </div>
  )
}
