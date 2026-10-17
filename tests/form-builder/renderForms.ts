/** Form docs for the renderer tests, as the page hands them over (populated, one locale). */
import type { Form } from '@/payload-types'

import type { FormField, SubmitHandler, UploadHandler } from '@/components/FormRenderer/types'

/** A saved form with `fields`, in English unless overridden. */
export const formDoc = (fields: FormField[], overrides: Partial<Form> = {}): Form => {
  // 1. id 1, title 'Test form', confirmationType 'message' with a one-paragraph message
  //    'Thanks!', submitButtonLabel 'Send', timestamps, then `overrides`
  throw new Error('not implemented')
}

/** One of each plugin stock field (the fields old pages already use). */
export const stockFields = (): FormField[] => {
  // text, textarea, email, number, select (2 options), radio, checkbox, date, country,
  // state, message: each with a distinct label to find it by
  throw new Error('not implemented')
}

/** A radio `party` (alone | family) and a required `family_note` shown when it's family. */
export const conditionalFields = (): FormField[] => {
  throw new Error('not implemented')
}

/** A list `family` (max_items 2) with a text `name`. */
export const listFields = (): FormField[] => {
  throw new Error('not implemented')
}

/** A two-step form: step "You" (required text `full_name`), step "Visit" (date `visit_date`). */
export const twoStepFields = (): FormField[] => {
  throw new Error('not implemented')
}

/** A submit that resolves ok and records its calls. */
export const fakeSubmit = (): SubmitHandler => {
  // vi.fn resolving { ok: true }
  throw new Error('not implemented')
}

/** An upload that resolves with id 1. */
export const fakeUpload = (): UploadHandler => {
  throw new Error('not implemented')
}
