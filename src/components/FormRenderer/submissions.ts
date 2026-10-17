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
import { ValidationError } from 'payload'

import { FORM_UPLOAD_MAX_BYTES, FORM_UPLOAD_MIME_TYPES } from '@/collections/FormUploads/constants'
import { type FormRefusal, formRefusal } from '@/common/utils/formAvailability'
import { frontendTenantWhere } from '@/common/utils/frontendTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Form, User } from '@/payload-types'

import { fieldAtPath } from './helpers'
import { type FormText, formText } from './i18n'
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

// in memory: one server process, as on staging; resets on a restart. Several instances would
// need a shared store (Postgres or Redis) behind allowHit.
const hits = new Map<string, number[]>()

/**
 * In-memory hits per `<kind>:<ip>:<formId>` (one server process, as on staging; resets on a
 * restart). `true` when this hit is still under `limit`.
 */
export const allowHit = (key: string, limit: number, now: number): boolean => {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < RATE_WINDOW_MS)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

const refused = (error: string): { ok: false; error: string } => ({ ok: false, error })

const refusalText = (reason: FormRefusal, text: FormText): string => {
  if (reason === 'not_open_yet') return text.notOpenYet
  if (reason === 'members_only') return text.membersOnly
  return text.formClosed
}

type OpenForm = { form: Form; tenantId: number }

/**
 * The form if it belongs to the host's tenant and takes answers from this visitor, else the
 * refusal in their words. Read as the public reads forms (no user: a signed-in visitor of
 * another business still sees a public form).
 */
const findOpenForm = async (
  context: SubmissionContext,
  formId: number,
  text: FormText,
  kind: 'submit' | 'upload',
): Promise<OpenForm | { ok: false; error: string }> => {
  const { payload, tenantId, user } = context
  if (tenantId === null) {
    payload.logger.warn({ msg: `form ${kind} refused: unknown host`, formId })
    return refused(text.somethingWrong)
  }
  const { docs } = await payload.find({
    collection: 'forms',
    where: frontendTenantWhere(tenantId, { id: { equals: formId } }),
    depth: 0,
    limit: 1,
    overrideAccess: false,
  })
  const form = docs[0]
  if (!form) {
    payload.logger.warn({ msg: `form ${kind} refused: not_found`, tenantId, formId })
    return refused(text.somethingWrong)
  }
  const reason = formRefusal(form, user, context.now ?? new Date())
  if (reason) {
    payload.logger.warn({
      msg: `form ${kind} refused: ${reason}`,
      tenantId,
      formId,
      userId: user?.id,
    })
    return refused(refusalText(reason, text))
  }
  return { form, tenantId: extractTenantId(form.tenant) ?? tenantId }
}

const errorCount = (err: ValidationError): number => {
  const { errors } = err.data
  return Array.isArray(errors) && errors.length ? errors.length : 1
}

export const submitForm = async (
  context: SubmissionContext,
  input: SubmitInput,
): Promise<SubmitResult> => {
  const { payload, user, ip } = context
  const { formId } = input
  const text = formText(input.locale)

  // the bot sees success, nothing is saved
  if (input.honeypot) {
    payload.logger.warn({
      msg: 'form submission dropped: honeypot',
      tenantId: context.tenantId,
      formId,
    })
    return { ok: true }
  }

  const found = await findOpenForm(context, formId, text, 'submit')
  if ('ok' in found) return found
  const { form, tenantId } = found

  if (form.has_terms && !input.termsAccepted) {
    payload.logger.warn({ msg: 'form submit refused: terms not accepted', tenantId, formId })
    return refused(text.termsRequired)
  }

  const now = (context.now ?? new Date()).getTime()
  if (ip && !allowHit(`submit:${ip}:${formId}`, SUBMIT_LIMIT, now)) {
    payload.logger.warn({ msg: 'form submit refused: rate limited', tenantId, formId, ip })
    return refused(text.tooMany)
  }

  try {
    // the plugin's public create: validateSubmission re-checks the form and rebuilds the answers,
    // setFormSubmissionTenant sets the tenant
    const submission = await payload.create({
      collection: 'form-submissions',
      data: { form: form.id, submissionData: input.submissionData },
      ...(user ? { user } : {}),
      overrideAccess: false,
      depth: 0,
    })
    payload.logger.info({ msg: 'form submitted', tenantId, formId, submissionId: submission.id })
    return { ok: true }
  } catch (err) {
    if (err instanceof ValidationError) {
      payload.logger.warn({ msg: 'form submit refused: invalid answers', tenantId, formId })
      return refused(text.fixErrors(errorCount(err)))
    }
    payload.logger.error({ msg: 'form submit failed', tenantId, formId, err })
    return refused(text.somethingWrong)
  }
}

export const uploadFile = async (
  context: SubmissionContext,
  input: UploadInput,
): Promise<UploadResult> => {
  const { payload, ip } = context
  const { formId, fieldName, file } = input
  const text = formText(input.locale)

  const found = await findOpenForm(context, formId, text, 'upload')
  if ('ok' in found) return found
  const { form, tenantId } = found

  const field = fieldAtPath(form.fields ?? [], fieldName)
  if (field?.blockType !== 'file' && field?.blockType !== 'signature') {
    payload.logger.warn({
      msg: 'form upload refused: not a file field',
      tenantId,
      formId,
      fieldName,
    })
    return refused(text.somethingWrong)
  }

  // before reading the file into memory
  if (!FORM_UPLOAD_MIME_TYPES.includes(file.type)) {
    payload.logger.warn({
      msg: 'form upload refused: wrong type',
      tenantId,
      formId,
      type: file.type,
    })
    return refused(text.wrongType)
  }
  if (file.size > FORM_UPLOAD_MAX_BYTES) {
    payload.logger.warn({
      msg: 'form upload refused: too large',
      tenantId,
      formId,
      size: file.size,
    })
    return refused(text.tooLarge)
  }

  const now = (context.now ?? new Date()).getTime()
  if (ip && !allowHit(`upload:${ip}:${formId}`, UPLOAD_LIMIT, now)) {
    payload.logger.warn({ msg: 'form upload refused: rate limited', tenantId, formId, ip })
    return refused(text.tooMany)
  }

  try {
    const data = Buffer.from(await file.arrayBuffer())
    // nobody may create form-uploads through access: only this action stores them
    const upload = await payload.create({
      collection: 'form-uploads',
      data: { tenant: tenantId, form: form.id, field_name: fieldName },
      file: { data, mimetype: file.type, name: file.name, size: data.length },
      overrideAccess: true,
      depth: 0,
    })
    payload.logger.info({ msg: 'form upload stored', tenantId, formId, uploadId: upload.id })
    return { ok: true, id: upload.id }
  } catch (err) {
    payload.logger.error({ msg: 'form upload failed', tenantId, formId, fieldName, err })
    return refused(text.somethingWrong)
  }
}
