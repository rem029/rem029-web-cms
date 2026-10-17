/**
 * The renderer's own words (buttons, errors, list and upload hints) in English and Arabic.
 * Field labels come from the form itself (localized in the admin); only these fixed strings
 * live here. Used by every renderer component through `formText(locale)`.
 */
import type { RendererLocale } from './types'

export type FormText = {
  next: string
  back: string
  review: string
  edit: string
  submit: string
  submitting: string
  addRow: (label: string) => string
  removeRow: string
  row: (n: number) => string
  required: string
  fixErrors: (count: number) => string
  uploading: string
  uploadLimit: string
  fileAttached: string
  signed: string
  clearSignature: string
  yes: string
  no: string
  stepOf: (current: number, total: number) => string
  draftSaved: string
  somethingWrong: string
}

const en: FormText = {
  // 1. English strings (pseudo: fill in at implementation)
  next: '',
  back: '',
  review: '',
  edit: '',
  submit: '',
  submitting: '',
  addRow: () => '',
  removeRow: '',
  row: () => '',
  required: '',
  fixErrors: () => '',
  uploading: '',
  uploadLimit: '',
  fileAttached: '',
  signed: '',
  clearSignature: '',
  yes: '',
  no: '',
  stepOf: () => '',
  draftSaved: '',
  somethingWrong: '',
}

// 2. Arabic: the same keys (pseudo: fill in at implementation)
const ar: FormText = { ...en }

export const formText = (locale: RendererLocale): FormText => (locale === 'ar' ? ar : en)
