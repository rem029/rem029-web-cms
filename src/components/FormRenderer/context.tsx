'use client'
/**
 * State the nested renderer parts share (answers, errors, list rows, locale, upload), so
 * `RecursiveFields` → `FieldControl` don't pass a dozen props down every level. Provided by
 * `FormRenderer` (index.tsx), read with `useFormRenderer()`.
 */
import { createContext, useContext } from 'react'

import type { FieldValue, FormValues, ListCounts, RendererLocale, UploadHandler } from './types'

export type FormRendererState = {
  formId: number
  locale: RendererLocale
  values: FormValues
  errors: Record<string, string>
  listCounts: ListCounts
  disabled: boolean
  setValue: (path: string, value: FieldValue | undefined) => void
  /** Marks a field touched, so its error shows on blur (step 2 UX). */
  touch: (path: string) => void
  setListCount: (path: string, count: number) => void
  upload: UploadHandler
}

export const FormRendererContext = createContext<FormRendererState | null>(null)

export const useFormRenderer = (): FormRendererState => {
  // 1. read the context; outside a FormRenderer → throw (a programming error, not a visitor one)
  const state = useContext(FormRendererContext)
  if (!state) throw new Error('useFormRenderer: used outside FormRenderer')
  return state
}
