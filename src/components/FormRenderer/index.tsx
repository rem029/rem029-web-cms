'use client'
/**
 * The form a site visitor fills in: used by the Form block inside pages and by `/forms/<slug>`
 * (both from step 3, which also passes the server actions as `submit` / `upload`). Takes a
 * populated form in the visitor's locale and renders either one page of fields or the
 * multi-step flow, then the confirmation message or the redirect (the plugin's fields).
 *
 * Root: `<div className="fb-form" data-form-id dir lang>` (the Custom CSS scope, step 2).
 * Answers are flat dotted paths (`helpers.ts`), kept as a draft in localStorage (`useDraft`).
 */
import React from 'react'

import type { Form } from '@/payload-types'

import type { RendererLocale, SubmitHandler, UploadHandler } from './types'

export type FormRendererProps = {
  form: Form
  locale: RendererLocale
  submit: SubmitHandler
  upload: UploadHandler
  /** Off in live preview and the admin, so an editor's test answers aren't kept. */
  saveDraft?: boolean
}

export const FormRenderer: React.FC<FormRendererProps> = () => {
  // 1. { draft, setDraft, clearDraft } = useDraft(form.id, saveDraft ?? true)
  //    state: errors, touched, status idle | submitting | done, submitError
  // 2. setValue(path, value) → setDraft with the value; clear that path's error
  // 3. effect: hiddenFieldPaths(fields, values, listCounts) → drop those values
  //    (a chain of conditionals clears on the next pass)
  // 4. handleSubmit:
  //    missing = missingRequired(fields, values, listCounts)
  //    missing → errors = { [path]: text.required }, error summary (`fb-error-summary`,
  //      role=alert, text.fixErrors(n)), focus the first `[data-field]`; stop
  //    status submitting → submit({ formId, submissionData: toSubmissionData(...) })
  //    ok → clearDraft; confirmationType redirect → router.push(redirect.url) (internal
  //      reference → its page url); else status done
  //    not ok → submitError (the server's message, else text.somethingWrong); log nothing here
  // 5. render: <FormRendererContext.Provider>
  //      <div className="fb-form" data-form-id={form.id} dir={rtl for ar} lang={locale}>
  //        done → <div className="fb-confirmation" role="status"><RichText confirmationMessage>
  //        multi-step top field → <MultiStep block submitLabel onSubmit />
  //        else <form noValidate onSubmit> <RecursiveFields fields indices />
  //             <div className="fb-actions"><Button className="fb-button fb-button--primary">
  //               {submitButtonLabel || text.submit}
  return <div />
}
