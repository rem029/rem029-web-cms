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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Form } from '@/payload-types'

// step 2: ADD — import './formRenderer.css', appearanceToStyle, scopeCustomCss
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'

import { FormRendererContext, type FormErrors, type FormRendererState } from './context'
import {
  focusFirstError,
  hiddenFieldPaths,
  missingRequired,
  removeListRow,
  toSubmissionData,
} from './helpers'
import { formText } from './i18n'
import { MultiStep } from './multiStep'
import { RecursiveFields } from './recursiveFields'
import type { FieldValue, RendererLocale, SubmitHandler, UploadHandler } from './types'
import { useDraft } from './useDraft'

export type FormRendererProps = {
  form: Form
  locale: RendererLocale
  submit: SubmitHandler
  upload: UploadHandler
  /** Off in live preview and the admin, so an editor's test answers aren't kept. */
  saveDraft?: boolean
}

type Status = 'idle' | 'submitting' | 'done'

export const FormRenderer: React.FC<FormRendererProps> = ({
  form,
  locale,
  submit,
  upload,
  saveDraft = true,
}) => {
  const { draft, updateDraft, clearDraft } = useDraft(form.id, saveDraft)
  const { values, listCounts } = draft
  const [errors, setErrors] = useState<FormErrors>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const rootRef = useRef<HTMLDivElement>(null)
  const text = formText(locale)
  const fields = useMemo(() => form.fields ?? [], [form.fields])
  const multiStep = fields.find((field) => field.blockType === 'multi-step')
  const submitLabel = form.submitButtonLabel || text.submit

  const setValue = useCallback(
    (path: string, value: FieldValue | undefined) => {
      updateDraft((prev) => {
        const nextValues = { ...prev.values }
        if (value === undefined) delete nextValues[path]
        else nextValues[path] = value
        return { ...prev, values: nextValues }
      })
      setErrors((prev) => {
        if (!(path in prev)) return prev
        const { [path]: _cleared, ...rest } = prev
        return rest
      })
    },
    [updateDraft],
  )

  const setFieldError = useCallback((path: string, message: string | undefined) => {
    setErrors((prev) => {
      const { [path]: _old, ...rest } = prev
      return message ? { ...rest, [path]: message } : rest
    })
  }, [])

  // answers behind a condition that stopped matching are dropped; a chain of conditions
  // clears one level per pass
  useEffect(() => {
    const hidden = hiddenFieldPaths(fields, values, listCounts).filter((path) => path in values)
    if (!hidden.length) return
    updateDraft((prev) => {
      const nextValues = { ...prev.values }
      for (const path of hidden) delete nextValues[path]
      return { ...prev, values: nextValues }
    })
  }, [fields, values, listCounts, updateDraft])

  useEffect(() => {
    if (!Object.keys(errors).length) setSummary(null)
  }, [errors])

  const send = async () => {
    const missing = missingRequired(fields, values, listCounts)
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map(({ path }) => [path, text.required])))
      setSummary(text.fixErrors(missing.length))
      focusFirstError(rootRef.current, missing[0]?.path)
      return
    }

    setStatus('submitting')
    setSummary(null)
    const result = await submit({
      formId: form.id,
      submissionData: toSubmissionData(fields, values, listCounts),
    }).catch(() => null)

    if (!result?.ok) {
      setStatus('idle')
      setSummary(result?.error || text.somethingWrong)
      return
    }
    clearDraft()
    if (form.confirmationType === 'redirect' && form.redirect?.url) {
      window.location.assign(form.redirect.url)
      return
    }
    setStatus('done')
  }

  // step 2: ADD — const { dataAttrs, cssVars } = appearanceToStyle(form.appearance)
  // step 2: ADD — const scopedCss = scopeCustomCss(form.custom_css, form.id)
  const state: FormRendererState = {
    formId: form.id,
    locale,
    values,
    errors,
    listCounts,
    disabled: status !== 'idle',
    setValue,
    setErrors,
    setFieldError,
    addListRow: (path) =>
      updateDraft((prev) => ({
        ...prev,
        listCounts: { ...prev.listCounts, [path]: (prev.listCounts[path] ?? 1) + 1 },
      })),
    removeListRow: (path, row) =>
      updateDraft((prev) => removeListRow(prev.values, prev.listCounts, path, row)),
    upload,
  }

  return (
    <FormRendererContext.Provider value={state}>
      <div
        // step 2: CHANGE — className 'fb-form' only (layout and look move to formRenderer.css);
        // step 2:   spread {...dataAttrs}, style={cssVars}; render <style>{scopedCss}</style> first when set
        // step 2: ADD — 'draft saved' note in fb-actions (savedAt from useDraft, aria-live polite)
        className="fb-form flex flex-col gap-6"
        data-form-id={form.id}
        data-numbered={form.show_sequence_number || undefined}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        lang={locale}
        ref={rootRef}
      >
        {status === 'done' ? (
          <div className="fb-confirmation" role="status">
            {form.confirmationMessage && (
              <RichText data={form.confirmationMessage} enableGutter={false} />
            )}
          </div>
        ) : (
          <>
            {summary && (
              <p
                className="fb-error-summary rounded border border-destructive p-3 text-sm text-destructive"
                role="alert"
              >
                {summary}
              </p>
            )}
            {multiStep?.blockType === 'multi-step' ? (
              <MultiStep
                block={multiStep}
                onSubmit={() => void send()}
                submitLabel={submitLabel}
                submitting={status === 'submitting'}
              />
            ) : (
              <form
                className="flex flex-col gap-6"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void send()
                }}
              >
                <RecursiveFields fields={fields} />
                <div className="fb-actions flex justify-end">
                  <Button
                    className="fb-button fb-button--primary"
                    disabled={status === 'submitting'}
                    type="submit"
                  >
                    {status === 'submitting' ? text.submitting : submitLabel}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </FormRendererContext.Provider>
  )
}
