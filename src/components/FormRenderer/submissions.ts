/**
 * What the form actions do, with the request already read: the host's tenant, the signed-in user
 * and the visitor's ip are arguments, so tests call these without Next (`tests/form-builder/
 * submitForm.test.ts`, `uploadFile.test.ts`). `actions.ts` reads them from the request and calls
 * these. Server only; never import from a client component.
 *
 * Every refusal is logged (`warn`, with tenant id, form id and reason) and returned to the
 * visitor in their language (`formText`). The `validateSubmission` hook repeats the form checks
 * on `form-submissions` create, so the REST api can't skip them.
 */
import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import type { RendererLocale, SubmissionRow, SubmitResult, UploadResult } from './types'

export type SubmissionContext = {
  payload: Payload
  /** The tenant the request's host serves (`getFrontendTenantId()`); `null` refuses everything. */
  tenantId: number | null
  user: User | null
  /** For the rate limit; `null` (no trusted proxy header) skips it. */
  ip: string | null
  now?: Date
}

export type SubmitInput = {
  formId: number
  locale: RendererLocale
  submissionData: SubmissionRow[]
  /** The hidden `fb_website` input: people leave it empty, bots fill it. */
  honeypot?: string
  termsAccepted?: boolean
}

export type UploadInput = {
  formId: number
  locale: RendererLocale
  /** The field's dotted path (`receipt`, `family.0.receipt`). */
  fieldName: string
  file: File
}

/** Submissions per ip and form in `RATE_WINDOW_MS`; uploads get `UPLOAD_LIMIT`. */
export const SUBMIT_LIMIT = 5
export const UPLOAD_LIMIT = 20
export const RATE_WINDOW_MS = 10 * 60 * 1000

/**
 * In-memory hits per `<kind>:<ip>:<formId>` (one server process, as on staging; resets on a
 * restart). `true` when this hit is still under `limit`.
 */
export const allowHit = (_key: string, _limit: number, _now: number): boolean => {
  // 1. drop the key's hits older than RATE_WINDOW_MS
  // 2. at or over limit → false (don't record)
  // 3. record now, true
  throw new Error('not implemented')
}

export const submitForm = async (
  _context: SubmissionContext,
  _input: SubmitInput,
): Promise<SubmitResult> => {
  // 1. honeypot filled → log warn 'form submission dropped: honeypot', return { ok: true }
  //    (the bot sees success, nothing is saved)
  // 2. tenantId null → refuse (somethingWrong)
  // 3. find the form: payload.find forms, frontendTenantWhere(tenantId, { id }), depth 0,
  //    overrideAccess false; none → refuse 'not_found' (a form of another tenant's host too)
  // 4. formRefusal(form, user, now) → refuse with text.formClosed / text.membersOnly
  // 5. form.has_terms and !termsAccepted → refuse text.acceptTerms
  // 6. ip and !allowHit(`submit:${ip}:${formId}`, SUBMIT_LIMIT) → log warn, refuse text.tooMany
  // 7. payload.create form-submissions { form, submissionData }, user (if any), overrideAccess
  //    false: the plugin's public create, so validateSubmission re-checks the form, rebuilds
  //    submissionData from the form's fields and sets the tenant (setFormSubmissionTenant)
  // 8. ValidationError (missing required) → refuse text.fixErrors(n); other errors → log error,
  //    refuse somethingWrong
  // 9. log info 'form submitted' (tenant, form, submission id), return { ok: true }
  throw new Error('not implemented')
}

export const uploadFile = async (
  _context: SubmissionContext,
  _input: UploadInput,
): Promise<UploadResult> => {
  // 1. tenantId null / form not in the host's tenant / formRefusal → refuse as in submitForm
  // 2. fieldName not a file or signature field of the form (fieldAtPath) → refuse somethingWrong
  // 3. mime not in FORM_UPLOAD_MIME_TYPES → text.wrongType; size > FORM_UPLOAD_MAX_BYTES →
  //    text.tooLarge (before reading the file into memory)
  // 4. ip and !allowHit(`upload:${ip}:${formId}`, UPLOAD_LIMIT) → refuse text.tooMany
  // 5. payload.create form-uploads { tenant: form tenant, form, field_name }, file from
  //    file.arrayBuffer(), overrideAccess true (nobody else may create them)
  // 6. log info 'form upload stored', return { ok: true, id }
  throw new Error('not implemented')
}
