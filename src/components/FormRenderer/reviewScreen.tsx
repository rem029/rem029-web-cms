'use client'
/**
 * The review before submit: one section per step (`fb-review`) listing each visible answer as
 * label → `answerText` (hidden conditional fields and content blocks left out, list rows
 * numbered), with "Edit" per section. Rendered by `MultiStep` after the last step.
 */
import React from 'react'

import { Button } from '@/components/ui/button'

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
}) => {
  const { values, listCounts, locale } = useFormRenderer()
  const text = formText(locale)

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section, i) => {
        const answers = visibleAnswers(section.fields ?? [], values, listCounts)
        return (
          <section className="fb-review rounded border border-border p-4" key={section.id ?? i}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">{section.label}</h3>
              <Button
                aria-label={`${text.edit} ${section.label}`}
                className="fb-button"
                onClick={() => onEdit(i)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {text.edit}
              </Button>
            </div>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              {answers.map(({ field, path }) => (
                <React.Fragment key={path}>
                  <dt className="text-muted-foreground">
                    {('label' in field && field.label) || path}
                    {rowSuffix(path)}
                  </dt>
                  <dd className="break-words">{answerText(field, values[path], locale)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )
      })}
      <div className="fb-actions flex justify-end">
        <Button
          className="fb-button fb-button--primary"
          disabled={submitting}
          onClick={onSubmit}
          type="button"
        >
          {submitting ? text.submitting : submitLabel}
        </Button>
      </div>
    </div>
  )
}
