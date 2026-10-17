'use client'
/**
 * State the nested renderer parts share (answers, errors, list rows, locale, upload), so
 * `RecursiveFields` → `FieldControl` don't pass a dozen props down every level. Provided by
 * `FormRenderer` (index.tsx), read with `useFormRenderer()`.
 */
import { createContext, useContext } from 'react'

import type { FieldValue, FormValues, ListCounts, RendererLocale, UploadHandler } from './types'

export type FormErrors = Record<string, string>

export type FormRendererState = {
  formId: number
  locale: RendererLocale
  values: FormValues
  errors: FormErrors
  listCounts: ListCounts
  disabled: boolean
  /** a file or signature is waiting to upload or uploading: Next, Review and Send wait for it */
  busy: boolean
  setBusy: (path: string, busy: boolean) => void
  setValue: (path: string, value: FieldValue | undefined) => void
  setErrors: (errors: FormErrors) => void
  setFieldError: (path: string, message: string | undefined) => void
  addListRow: (path: string) => void
  removeListRow: (path: string, row: number) => void
  upload: UploadHandler
}

export const FormRendererContext = createContext<FormRendererState | null>(null)

export const useFormRenderer = (): FormRendererState => {
  const state = useContext(FormRendererContext)
  if (!state) throw new Error('useFormRenderer: used outside FormRenderer')
  return state
}
