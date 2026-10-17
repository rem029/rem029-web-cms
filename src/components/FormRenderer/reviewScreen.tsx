'use client'
/**
 * The review before submit: one section per step (`fb-review`) listing each visible answer as
 * label → `answerText` (hidden conditional fields and content blocks left out, list rows
 * numbered), with "Edit" per section. Rendered by `MultiStep` after the last step.
 */
import React from 'react'

import { useFormRenderer } from './context'
import { answerText, visibleAnswers } from './helpers'
import { formText } from './i18n'
import type { Step } from './types'

export type ReviewScreenProps = {
  sections: Step[]
  onEdit: (sectionIndex: number) => void
  onSubmit: () => void
  submitLabel: string
  submitting: boolean
  /** Shown beside the submit button (the "draft saved" note). */
  status?: React.ReactNode
  /** The terms checkbox and the honeypot, above the submit button. */
  beforeSubmit?: React.ReactNode
}

/** `family.1.name` → ' 2': the row number of the innermost list, for the answer's label. */
const rowSuffix = (path: string): string => {
  const rows = path.match(/\.(\d+)\./g)
  const last = rows?.at(-1)
  return last ? ` ${Number(last.slice(1, -1)) + 1}` : ''
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  sections,
  onEdit,
  onSubmit,
  submitLabel,
  submitting,
  status,
  beforeSubmit,
}) => {
  const { values, listCounts, locale } = useFormRenderer()
  const text = formText(locale)

  return (
    <div className="fb-review-list">
      {sections.map((section, i) => {
        const answers = visibleAnswers(section.fields ?? [], values, listCounts)
        return (
          <section className="fb-review" key={section.id ?? i}>
            <div className="fb-review-head">
              <h3 className="fb-review-title">{section.label}</h3>
              <button
                aria-label={`${text.edit} ${section.label}`}
                className="fb-button fb-button--quiet"
                onClick={() => onEdit(i)}
                type="button"
              >
                {text.edit}
              </button>
            </div>
            <dl className="fb-review-answers">
              {answers.map(({ field, path }) => (
                <React.Fragment key={path}>
                  <dt className="fb-review-label">
                    {('label' in field && field.label) || path}
                    {rowSuffix(path)}
                  </dt>
                  <dd className="fb-review-value">{answerText(field, values[path], locale)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )
      })}
      {beforeSubmit}
      <div className="fb-actions">
        {status}
        <button
          className="fb-button fb-button--primary"
          disabled={submitting}
          onClick={onSubmit}
          type="button"
        >
          {submitting ? text.submitting : submitLabel}
        </button>
      </div>
    </div>
  )
}
