'use client'
/**
 * Keeps a visitor's unsent answers in localStorage per form id (`form-draft-<id>`), so a reload
 * or an accidental back doesn't lose them. Used by `FormRenderer` (index.tsx); cleared after a
 * successful submit. Storage can throw (private mode, blocked site data): every read and write
 * is in try/catch and the form still works without it.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import type { FormValues, ListCounts } from './types'

export type Draft = { values: FormValues; listCounts: ListCounts }

const EMPTY: Draft = { values: {}, listCounts: {} }

export const draftKey = (formId: number): string => `form-draft-${formId}`

const isDraft = (value: unknown): value is Draft =>
  typeof value === 'object' &&
  value !== null &&
  'values' in value &&
  'listCounts' in value &&
  typeof value.values === 'object' &&
  typeof value.listCounts === 'object'

const readDraft = (formId: number): Draft | null => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(draftKey(formId)) ?? 'null')
    return isDraft(stored) ? stored : null
  } catch {
    return null
  }
}

export const useDraft = (
  formId: number,
  enabled: boolean,
): {
  draft: Draft
  updateDraft: (update: (prev: Draft) => Draft) => void
  clearDraft: () => void
} => {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  // only the visitor's own changes are written, never the empty first render
  const changed = useRef(false)

  // read after mount: the server render has no storage, so the first render stays empty
  useEffect(() => {
    if (!enabled) return
    const stored = readDraft(formId)
    if (stored) setDraft(stored)
  }, [formId, enabled])

  useEffect(() => {
    if (!enabled || !changed.current) return
    try {
      localStorage.setItem(draftKey(formId), JSON.stringify(draft))
    } catch {
      // storage full or blocked: the form keeps working without a draft
    }
  }, [draft, formId, enabled])

  const updateDraft = useCallback((update: (prev: Draft) => Draft) => {
    changed.current = true
    setDraft(update)
  }, [])

  const clearDraft = useCallback(() => {
    changed.current = false
    setDraft(EMPTY)
    try {
      localStorage.removeItem(draftKey(formId))
    } catch {
      // nothing stored to clear
    }
  }, [formId])

  return { draft, updateDraft, clearDraft }
}
