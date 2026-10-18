/**
 * What the form actions do, with the request already read: the host's tenant, the signed-in user
 * and the visitor's ip are arguments, so tests call these without Next (`tests/form-builder/
 * submitForm.test.ts`, `uploadFile.test.ts`). `actions.ts` reads them from the request and calls
 * these. Server only; never import from a client component.
 *
 * Every refusal is logged (`warn`, with tenant id, form id, reason and the visitor's ip) and
 * returned to the visitor in their language (`formText`). The `validateSubmission` hook repeats
 * the form checks on `form-submissions` create, so the REST api can't skip them. Submit attempts
 * on a form are recorded in `analytics` (`recordFormAnalytics`).
 */
import type { Payload } from 'payload'
import { ValidationError } from 'payload'

import { FORM_UPLOAD_MAX_BYTES, FORM_UPLOAD_MIME_TYPES } from '@/collections/FormUploads/constants'
import { formRefusal } from '@/common/utils/formAvailability'
import { frontendTenantWhere } from '@/common/utils/frontendTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Form, User } from '@/payload-types'

import { fieldAtPath } from './helpers'
import { type FormText, formText, refusalMessage } from './i18n'
import type { RendererLocale, SubmissionRow, SubmitResult, UploadResult } from './types'

export type SubmissionContext = {
  payload: Payload
  /** The tenant the request's host serves (`getFrontendTenantId()`); `null` refuses everything. */
  tenantId: number | null
  user: User | null
  /** For the rate limit; `null` (no trusted proxy header) skips it. */
  ip: string | null
  /** The visitor as the request shows it, for logs and analytics only (never the rate limit). */
  visitor?: VisitorInfo
  now?: Date
}

export type VisitorInfo = {
  /** The trusted ip, else the first `x-forwarded-for` / `x-real-ip` (spoofable without a proxy). */
  ip: string | null
  deviceType: 'desktop' | 'mobile' | 'tablet'
  /** The page the form is on (the referer's path), if known. */
  pagePath: string | null
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

/** The visitor's ip for logs: what the request shows, else the trusted one. */
const logIp = (context: SubmissionContext): string | null => context.visitor?.ip ?? context.ip

/** The first answer of an `email` / `phone` block, else of a field with that name. */
const answerOf = (
  form: Pick<Form, 'fields'>,
  rows: SubmissionRow[],
  kind: 'email' | 'phone',
): string | undefined => {
  const fields = form.fields ?? []
  const byBlock = rows.find((row) => fieldAtPath(fields, row.field)?.blockType === kind)
  const byName = rows.find((row) => row.field === kind)
  return (byBlock ?? byName)?.value || undefined
}

/**
 * One `analytics` row per submit attempt that reached a form: `form_submission` (saved) or
 * `error` (refused or failed), under the form's tenant, with the visitor's ip, device and page,
 * and email and phone when the form asks for them. Never throws: a failed record is logged and
 * the visitor's result stays as it was.
 */
export const recordFormAnalytics = async (
  context: SubmissionContext,
  event: {
    form: Pick<Form, 'id' | 'title' | 'slug' | 'fields'>
    tenantId: number
    submissionData: SubmissionRow[]
    result: SubmitResult
  },
): Promise<void> => {
  const { payload, visitor } = context
  const { form, tenantId, submissionData, result } = event
  try {
    // visitors can't create analytics through access
    await payload.create({
      collection: 'analytics',
      data: {
        tenant: tenantId,
        eventType: result.ok ? 'form_submission' : 'error',
        ip: logIp(context) ?? undefined,
        email: answerOf(form, submissionData, 'email'),
        phone: answerOf(form, submissionData, 'phone'),
        deviceType: visitor?.deviceType ?? 'desktop',
        pagePath: visitor?.pagePath ?? `/forms/${form.slug ?? ''}`,
        timestamp: (context.now ?? new Date()).toISOString(),
        payload: result.ok
          ? { formID: form.id, formName: form.title, success: true }
          : { formID: form.id, formName: form.title, errorMessage: result.error },
      },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    payload.logger.error({ msg: 'form analytics not recorded', tenantId, formId: form.id, err })
  }
}

type OpenForm = { form: Form; tenantId: number }

/**
 * The form if it belongs to the host's tenant and takes answers from this visitor, else the
 * refusal in their words. Read as the public reads forms (no user: a signed-in visitor of
 * another business still sees a public form; published forms only).
 */
const findOpenForm = async (
  context: SubmissionContext,
  formId: number,
  text: FormText,
  kind: 'submit' | 'upload',
): Promise<OpenForm | { ok: false; error: string }> => {
  const { payload, tenantId, user } = context
  const ip = logIp(context)
  if (tenantId === null) {
    payload.logger.warn({ msg: `form ${kind} refused: unknown host`, formId, ip })
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
    payload.logger.warn({ msg: `form ${kind} refused: not_found`, tenantId, formId, ip })
    return refused(text.somethingWrong)
  }
  const reason = formRefusal(form, user, context.now ?? new Date())
  if (reason) {
    payload.logger.warn({
      msg: `form ${kind} refused: ${reason}`,
      tenantId,
      formId,
      userId: user?.id,
      ip,
    })
    return refused(refusalMessage(reason, text))
  }
  return { form, tenantId: extractTenantId(form.tenant) ?? tenantId }
}

const errorCount = (err: ValidationError): number => {
  const { errors } = err.data
  return Array.isArray(errors) && errors.length ? errors.length : 1
}

/** Saves the submission, or the refusal in the visitor's words; analytics are recorded after. */
const saveSubmission = async (
  context: SubmissionContext,
  { form, tenantId }: OpenForm,
  input: SubmitInput,
  text: FormText,
): Promise<SubmitResult> => {
  const { payload, user, ip } = context
  const formId = form.id
  const loggedIp = logIp(context)

  if (form.has_terms && !input.termsAccepted) {
    payload.logger.warn({
      msg: 'form submit refused: terms not accepted',
      tenantId,
      formId,
      ip: loggedIp,
    })
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
      data: { form: formId, submissionData: input.submissionData },
      ...(user ? { user } : {}),
      overrideAccess: false,
      depth: 0,
    })
    payload.logger.info({
      msg: 'form submitted',
      tenantId,
      formId,
      submissionId: submission.id,
      ip: loggedIp,
    })
    return { ok: true }
  } catch (err) {
    if (err instanceof ValidationError) {
      payload.logger.warn({
        msg: 'form submit refused: invalid answers',
        tenantId,
        formId,
        ip: loggedIp,
      })
      return refused(text.fixErrors(errorCount(err)))
    }
    payload.logger.error({ msg: 'form submit failed', tenantId, formId, ip: loggedIp, err })
    return refused(text.somethingWrong)
  }
}

export const submitForm = async (
  context: SubmissionContext,
  input: SubmitInput,
): Promise<SubmitResult> => {
  const { payload } = context
  const { formId } = input
  const text = formText(input.locale)

  // the bot sees success, nothing is saved or recorded
  if (input.honeypot) {
    payload.logger.warn({
      msg: 'form submission dropped: honeypot',
      tenantId: context.tenantId,
      formId,
      ip: logIp(context),
    })
    return { ok: true }
  }

  // refusals before the form is found have no tenant to record them under
  const found = await findOpenForm(context, formId, text, 'submit')
  if ('ok' in found) return found

  const result = await saveSubmission(context, found, input, text)
  await recordFormAnalytics(context, {
    form: found.form,
    tenantId: found.tenantId,
    submissionData: input.submissionData,
    result,
  })
  return result
}

export const uploadFile = async (
  context: SubmissionContext,
  input: UploadInput,
): Promise<UploadResult> => {
  const { payload, ip } = context
  const { formId, fieldName, file } = input
  const text = formText(input.locale)
  const loggedIp = logIp(context)

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
      ip: loggedIp,
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
      ip: loggedIp,
    })
    return refused(text.wrongType)
  }
  if (file.size > FORM_UPLOAD_MAX_BYTES) {
    payload.logger.warn({
      msg: 'form upload refused: too large',
      tenantId,
      formId,
      size: file.size,
      ip: loggedIp,
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
    payload.logger.info({
      msg: 'form upload stored',
      tenantId,
      formId,
      uploadId: upload.id,
      ip: loggedIp,
    })
    return { ok: true, id: upload.id }
  } catch (err) {
    payload.logger.error({
      msg: 'form upload failed',
      tenantId,
      formId,
      fieldName,
      ip: loggedIp,
      err,
    })
    return refused(text.somethingWrong)
  }
}
