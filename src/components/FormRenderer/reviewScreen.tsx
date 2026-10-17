'use client'
/**
 * The review before submit: one section per step (`fb-review`) listing each visible answer as
 * label → `answerText` (hidden conditional fields and content blocks left out, list rows
 * numbered), with "Edit" per section. Rendered by `MultiStep` after the last step.
 */
import React from 'react'

import type { Step } from './types'

export type ReviewScreenProps = {
  sections: Step[]
  onEdit: (sectionIndex: number) => void
  onSubmit: () => void
  submitLabel: string
  submitting: boolean
}

export const ReviewScreen: React.FC<ReviewScreenProps> = () => {
  // 1. const { values, listCounts, locale } = useFormRenderer()
  // 2. per section: <section className="fb-review"> <h3>label</h3> <button>Edit</button>
  //      <dl> rows from toSubmissionData(section.fields, values, listCounts), label looked up
  //      by path, value through answerText </dl>
  // 3. actions: Submit (disabled + "submitting" while sending)
  return <div />
}
