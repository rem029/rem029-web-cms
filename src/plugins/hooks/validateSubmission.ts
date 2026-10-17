import type { CollectionBeforeValidateHook } from 'payload'
import { APIError, ValidationError } from 'payload'

import { formRefusal } from '@/common/utils/formAvailability'
import { extractTenantId } from '@/common/utils/tenantCollections'
import {
  fieldAtPath,
  listCountsFrom,
  missingRequired,
  toSubmissionData,
  valuesFromSubmission,
} from '@/components/FormRenderer/helpers'
import type { FormSubmission, User } from '@/payload-types'

const REFUSALS = {
  inactive: "This form isn't taking answers.",
  not_open_yet: "This form isn't taking answers.",
  closed: "This form isn't taking answers.",
  members_only: 'Only members can fill in this form.',
} as const

const isUser = (user: unknown): user is User =>
  typeof user === 'object' && user !== null && 'collection' in user && user.collection === 'users'

/**
 * The form's own rules for every new submission, the submit action's and `POST
 * /api/form-submissions` alike: the form takes answers (`formRefusal`), and `submissionData` is
 * rebuilt from the form's fields (unknown and hidden fields dropped, required ones present, file
 * values pointing at this form's own `form-uploads`). Runs on create only (editors may fix a
 * submission later), before `setFormSubmissionTenant`.
 */
export const validateSubmission: CollectionBeforeValidateHook<FormSubmission> = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || !data) return data
  const { payload } = req

  // extractTenantId reads any relationship's id (number, string or populated doc)
  const formId = extractTenantId(data.form)
  const form =
    formId === null
      ? null
      : await payload
          .findByID({ collection: 'forms', id: formId, depth: 0, req, overrideAccess: true })
          .catch(() => null)
  if (!form) {
    throw new APIError('The form associated with this submission could not be found.', 400)
  }
  const tenantId = extractTenantId(form.tenant)
  // step 3b: ADD — form._status !== 'published' (never published: only a draft) → as
  // 'inactive' (403); findByID above reads the main row, which holds the published version

  const reason = formRefusal(form, isUser(req.user) ? req.user : null, new Date())
  if (reason) {
    payload.logger.warn({ msg: `form submission refused: ${reason}`, tenantId, formId })
    throw new APIError(REFUSALS[reason], 403)
  }

  const fields = form.fields ?? []
  const values = valuesFromSubmission(data.submissionData)
  const listCounts = listCountsFrom(values)

  const missing = missingRequired(fields, values, listCounts)
  if (missing.length) {
    payload.logger.warn({ msg: 'form submission refused: missing answers', tenantId, formId })
    throw new ValidationError({
      collection: 'form-submissions',
      errors: missing.map(({ label }) => ({
        message: `${label} is required.`,
        path: 'submissionData',
      })),
    })
  }

  const rows = toSubmissionData(fields, values, listCounts)
  const uploadIds = rows
    .filter((row) => {
      const type = fieldAtPath(fields, row.field)?.blockType
      return type === 'file' || type === 'signature'
    })
    .map((row) => ({ field: row.field, id: Number(row.value) }))
  if (uploadIds.length) {
    const { docs } = await payload.find({
      collection: 'form-uploads',
      where: {
        and: [
          { id: { in: uploadIds.map(({ id }) => id).filter(Number.isInteger) } },
          { form: { equals: form.id } },
        ],
      },
      depth: 0,
      limit: uploadIds.length,
      pagination: false,
      overrideAccess: true,
      req,
    })
    const ownIds = new Set(docs.map((doc) => doc.id))
    const foreign = uploadIds.filter(({ id }) => !ownIds.has(id))
    if (foreign.length) {
      payload.logger.warn({ msg: 'form submission refused: foreign upload', tenantId, formId })
      throw new ValidationError({
        collection: 'form-submissions',
        errors: foreign.map(({ field }) => ({
          message: `The file for ${field} is not one of this form's uploads.`,
          path: 'submissionData',
        })),
      })
    }
  }

  data.submissionData = rows
  return data
}
