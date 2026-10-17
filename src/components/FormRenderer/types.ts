/**
 * Types shared by the form renderer, derived from the generated `Form` type so a new block shows
 * up here after `pnpm generate:types`. Used by every file in `src/components/FormRenderer/`.
 */
import type {
  Form,
  FormConditionalBlock,
  FormGroupBlock,
  FormListBlock,
  FormMultiStepBlock,
} from '@/payload-types'

export type RendererLocale = 'en' | 'ar'

/** A top-level field of a form. */
export type FormField = NonNullable<Form['fields']>[number]

/** Any field the renderer can meet, at the top level or nested in a step, group, list or condition. */
export type RenderField =
  | FormField
  | NonNullable<FormGroupBlock['fields']>[number]
  | NonNullable<FormListBlock['fields']>[number]
  | NonNullable<FormConditionalBlock['fields']>[number]
  | NonNullable<NonNullable<FormMultiStepBlock['steps']>[number]['fields']>[number]

export type FieldOf<T extends RenderField['blockType']> = Extract<RenderField, { blockType: T }>

export type MultiStepBlock = FormMultiStepBlock
export type Step = NonNullable<MultiStepBlock['steps']>[number]

/** One answer. File and signature fields hold the id of the stored `form-uploads` doc. */
export type FieldValue = string | number | boolean

/** Answers keyed by dotted path: `email`, `address.city`, `family.0.name`. */
export type FormValues = Record<string, FieldValue>

/** Rows shown per list, keyed by the list's dotted path. */
export type ListCounts = Record<string, number>

/** What the form-builder plugin stores in `form-submissions.submissionData`. */
export type SubmissionRow = { field: string; value: string }

export type SubmitResult = { ok: true } | { ok: false; error: string }

/** Sends the answers; step 3 passes `submitFormAction`, tests pass a fake. */
export type SubmitHandler = (input: {
  formId: number
  // step 3a: ADD — locale (the server answers in the visitor's language), honeypot (the hidden
  // fb_website input), termsAccepted (the terms checkbox when the form has terms)
  submissionData: SubmissionRow[]
}) => Promise<SubmitResult>

export type UploadResult = { ok: true; id: number } | { ok: false; error: string }

/** Stores a file or a signature png; step 3 passes `uploadFileAction`, tests pass a fake. */
export type UploadHandler = (input: {
  formId: number
  // step 3a: ADD — locale, as on SubmitHandler
  fieldName: string
  file: File
}) => Promise<UploadResult>
