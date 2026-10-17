/**
 * Where the visitor is in a multi-step form, as the Appearance tab's "Step indicator" asks:
 * - progress: "Step 2 of 3 · <label>" + a bar (`role="progressbar"`)
 * - numbered: an ordered list of the steps, numbers + labels (labels hidden on phones),
 *   done / current / upcoming (`aria-current="step"`)
 * - dots: one dot per step + the "Step 2 of 3" text for screen readers
 * - none: nothing (the step heading still says where you are)
 * All share `fb-steps` + `fb-steps--<variant>`. Rendered by `MultiStep`.
 */
import React from 'react'

import { formText } from './i18n'
import type { RendererLocale } from './types'

export type StepIndicatorVariant = 'progress' | 'numbered' | 'dots' | 'none'

export type StepIndicatorProps = {
  variant: StepIndicatorVariant
  current: number
  labels: string[]
  locale: RendererLocale
}

const stateOf = (index: number, current: number): 'done' | 'current' | 'upcoming' =>
  index < current ? 'done' : index === current ? 'current' : 'upcoming'

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  variant,
  current,
  labels,
  locale,
}) => {
  const total = labels.length
  if (variant === 'none' || total < 2) return null
  const position = formText(locale).stepOf(current + 1, total)

  if (variant === 'progress') {
    return (
      <div className="fb-steps fb-steps--progress">
        <p className="fb-steps-text">
          {position}
          {labels[current] && <span className="fb-steps-label"> · {labels[current]}</span>}
        </p>
        <div
          aria-label={position}
          aria-valuemax={total}
          aria-valuemin={1}
          aria-valuenow={current + 1}
          aria-valuetext={labels[current]}
          className="fb-progress"
          role="progressbar"
        >
          <div
            className="fb-progress-fill"
            style={{ inlineSize: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <ol aria-label={position} className={`fb-steps fb-steps--${variant}`}>
      {labels.map((label, index) => (
        <li
          aria-current={index === current ? 'step' : undefined}
          className="fb-steps-item"
          data-state={stateOf(index, current)}
          key={index}
        >
          {variant === 'numbered' ? (
            <>
              <span aria-hidden="true" className="fb-steps-number">
                {index + 1}
              </span>
              <span className="fb-steps-name">{label}</span>
            </>
          ) : (
            <span className="sr-only">{label}</span>
          )}
        </li>
      ))}
    </ol>
  )
}
