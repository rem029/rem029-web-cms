'use client'
/**
 * The form a site visitor fills in: used by the Form block inside pages and by `/forms/<slug>`
 * (both from step 3, which also passes the server actions as `submit` / `upload`). Takes a
 * populated form in the visitor's locale and renders either one page of fields or the
 * multi-step flow, then the confirmation message or the redirect (the plugin's fields).
 *
 * Root: `<div className="fb-form" data-form-id dir lang>` + the Appearance presets as `data-*` and
 * css vars (`appearance.ts`); the form's Custom CSS is scoped to it (`customCss.ts`).
 * Answers are flat dotted paths (`helpers.ts`), kept as a draft in localStorage (`useDraft`).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Form } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

import { APPEARANCE_DEFAULTS, appearanceToStyle } from './appearance'
import { FormRendererContext, type FormErrors, type FormRendererState } from './context'
import { scopeCustomCss } from './customCss'
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
import './formRenderer.css'

export type FormRendererProps = {
  form: Form
  locale: RendererLocale
  submit: SubmitHandler
  upload: UploadHandler
  /** Off in live preview and the admin, so an editor's test answers aren't kept. */
  saveDraft?: boolean
  /** The page heading (`/forms/<slug>`); the Form block leaves it out, its page has headings. */
  title?: string
}

type Status = 'idle' | 'submitting' | 'done'

/** The error key of the terms checkbox (not an answer, so never in `submissionData`). */
const TERMS_PATH = 'fb_terms'

export const FormRenderer: React.FC<FormRendererProps> = ({
  form,
  locale,
  submit,
  upload,
  saveDraft = true,
  title,
}) => {
  const { draft, updateDraft, clearDraft, savedAt } = useDraft(form.id, saveDraft)
  const { values, listCounts } = draft
  const [errors, setErrors] = useState<FormErrors>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)
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

  // the form is replaced by the message: move focus there so it is read and kept in view
  useEffect(() => {
    if (status === 'done') confirmationRef.current?.focus()
  }, [status])

  const send = async () => {
    const missing = missingRequired(fields, values, listCounts).map(({ path, label }) => [
      path,
      text.required(label),
    ])
    if (form.has_terms && !termsAccepted) missing.push([TERMS_PATH, text.termsRequired])
    if (missing.length) {
      setErrors(Object.fromEntries(missing))
      setSummary(text.fixErrors(missing.length))
      focusFirstError(rootRef.current, missing[0]?.[0])
      return
    }

    setStatus('submitting')
    setSummary(null)
    const result = await submit({
      formId: form.id,
      locale,
      submissionData: toSubmissionData(fields, values, listCounts),
      honeypot: honeypotRef.current?.value || undefined,
      termsAccepted: form.has_terms ? termsAccepted : undefined,
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

  // paths of fields whose file or signature is still on its way (see `busy` in context.tsx)
  const [busyPaths, setBusyPaths] = useState<string[]>([])
  const setBusy = useCallback(
    (path: string, busy: boolean) =>
      setBusyPaths((prev) =>
        busy ? (prev.includes(path) ? prev : [...prev, path]) : prev.filter((p) => p !== path),
      ),
    [],
  )
  const busy = busyPaths.length > 0

  const { dataAttrs, cssVars } = appearanceToStyle(form.appearance)
  const scopedCss = scopeCustomCss(form.custom_css, form.id)
  const state: FormRendererState = {
    formId: form.id,
    locale,
    values,
    errors,
    listCounts,
    disabled: status !== 'idle',
    busy,
    setBusy,
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

  const draftNote =
    savedAt && status === 'idle' ? <p className="fb-draft-status">{text.draftSaved}</p> : null

  // shown before the submit button, on one page or the review screen
  const beforeSubmit = (
    <>
      {form.has_terms && (
        <Terms
          accepted={termsAccepted}
          content={form.terms_content}
          disabled={status !== 'idle'}
          error={errors[TERMS_PATH]}
          id={`fb-${form.id}-terms`}
          label={text.acceptTerms}
          onChange={(accepted) => {
            setTermsAccepted(accepted)
            setFieldError(TERMS_PATH, undefined)
          }}
        />
      )}
      <Honeypot id={`fb-${form.id}-website`} inputRef={honeypotRef} />
    </>
  )
  const headerImage = typeof form.header_image === 'object' ? form.header_image : null

  return (
    <FormRendererContext.Provider value={state}>
      <div
        {...dataAttrs}
        className="fb-form"
        data-form-id={form.id}
        data-numbered={form.show_sequence_number || undefined}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        lang={locale}
        ref={rootRef}
        style={cssVars}
      >
        {scopedCss && <style>{scopedCss}</style>}
        <div className="fb-body">
          {title && <h1 className="fb-title">{title}</h1>}
          {headerImage && (
            <figure className="fb-header">
              <Media resource={headerImage} />
            </figure>
          )}
          {status === 'done' ? (
            <div className="fb-confirmation" ref={confirmationRef} role="status" tabIndex={-1}>
              {form.confirmationMessage && (
                <RichText data={form.confirmationMessage} enableGutter={false} />
              )}
            </div>
          ) : (
            <>
              {summary && (
                <p className="fb-error-summary" role="alert">
                  {summary}
                </p>
              )}
              {multiStep?.blockType === 'multi-step' ? (
                <MultiStep
                  block={multiStep}
                  onSubmit={() => void send()}
                  status={draftNote}
                  stepIndicator={appearanceStepIndicator(form)}
                  beforeSubmit={beforeSubmit}
                  submitLabel={submitLabel}
                  submitting={status === 'submitting'}
                />
              ) : (
                <form
                  className="fb-steps-flow"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault()
                    void send()
                  }}
                >
                  <RecursiveFields fields={fields} />
                  {beforeSubmit}
                  <div className="fb-actions">
                    {draftNote}
                    <button
                      className="fb-button fb-button--primary"
                      disabled={status === 'submitting' || busy}
                      type="submit"
                    >
                      {status === 'submitting' ? text.submitting : submitLabel}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </FormRendererContext.Provider>
  )
}

const appearanceStepIndicator = (form: Form) =>
  form.appearance?.step_indicator ?? APPEARANCE_DEFAULTS.step_indicator

type TermsProps = {
  id: string
  label: string
  content: Form['terms_content']
  accepted: boolean
  disabled: boolean
  error?: string
  onChange: (accepted: boolean) => void
}

/** The form's terms and the box to accept them (`fb-terms`, `data-field="fb_terms"`). */
const Terms: React.FC<TermsProps> = ({
  id,
  label,
  content,
  accepted,
  disabled,
  error,
  onChange,
}) => (
  <div className={`fb-terms${error ? ' fb-field--error' : ''}`} data-field={TERMS_PATH}>
    {content && (
      <div className="fb-terms-content">
        <RichText data={content} enableGutter={false} />
      </div>
    )}
    <label className="fb-check" htmlFor={id}>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        checked={accepted}
        className="fb-checkbox"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="fb-label">
        {label}
        <span aria-hidden="true" className="fb-required">
          *
        </span>
      </span>
    </label>
    {error && (
      <p className="fb-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    )}
  </div>
)

/**
 * A field people never see and bots fill in (`fb_website`): off-screen, not `display: none`,
 * so bots still find it; out of the tab order and hidden from screen readers.
 */
const Honeypot: React.FC<{ id: string; inputRef: React.RefObject<HTMLInputElement | null> }> = ({
  id,
  inputRef,
}) => (
  <div aria-hidden="true" className="fb-honeypot">
    <label htmlFor={id}>Website</label>
    <input autoComplete="off" id={id} name="fb_website" ref={inputRef} tabIndex={-1} type="text" />
  </div>
)
