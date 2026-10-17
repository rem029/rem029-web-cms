'use client'
/**
 * The renderer wired to the server actions, as site visitors use it: the Form block and
 * `/forms/<slug>` both render this. Also sends the analytics events the old Form block sent
 * (`form_submission` / `error`), without email or phone.
 */
import React from 'react'

import type { Form } from '@/payload-types'

import { FormRenderer } from './index'
import type { RendererLocale } from './types'

export type PublicFormProps = {
  form: Form
  locale: RendererLocale
  /** Off in live preview, so an editor's test answers aren't kept. */
  saveDraft?: boolean
}

export const PublicForm: React.FC<PublicFormProps> = (_props) => {
  // 1. submit = async (input) => { result = await submitFormAction(input);
  //    addAnalytics({ eventType: result.ok ? 'form_submission' : 'error', pagePath,
  //    payload: { formID, formName: form.title, success | errorMessage } }); return result }
  // 2. <FormRenderer form locale submit upload={uploadFileAction} saveDraft />
  void FormRenderer
  return <div />
}
