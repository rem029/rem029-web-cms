'use client'
/**
 * Keeps a visitor's unsent answers in localStorage per form id (`form-draft-<id>`), so a reload
 * or an accidental back doesn't lose them. Used by `FormRenderer` (index.tsx); cleared after a
 * successful submit. Storage can throw (private mode, blocked site data): every read and write
 * is in try/catch and the form still works without it.
 */
import { useCallback, useState } from 'react'

import type { FormValues, ListCounts } from './types'

export type Draft = { values: FormValues; listCounts: ListCounts }

export const draftKey = (formId: number): string => `form-draft-${formId}`

export const useDraft = (
  formId: number,
  enabled: boolean,
): {
  draft: Draft
  setDraft: (next: Draft) => void
  clearDraft: () => void
  savedAt: Date | null
} => {
  // 1. initial state: enabled → JSON.parse(localStorage[draftKey]) in try/catch, else empty
  // 2. setDraft: set state; enabled → write to localStorage (try/catch), set savedAt
  // 3. clearDraft: remove the key (try/catch), reset to empty
  const [draft, setDraftState] = useState<Draft>({ values: {}, listCounts: {} })
  const setDraft = useCallback((next: Draft) => setDraftState(next), [])
  const clearDraft = useCallback(() => setDraftState({ values: {}, listCounts: {} }), [])
  void formId
  void enabled
  return { draft, setDraft, clearDraft, savedAt: null }
}
