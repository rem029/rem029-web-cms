import type { CollectionBeforeValidateHook } from 'payload'

import type { FormSubmission } from '@/payload-types'

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
  req: _req,
}) => {
  if (operation !== 'create' || !data) return data
  // 1. load the form (depth 0, req); missing → APIError 400 (as setFormSubmissionTenant)
  // 2. formRefusal(form, req.user, new Date()) → log warn (form, tenant, reason), APIError 403
  //    "This form isn't taking answers." / "Only members can fill in this form."
  // 3. values = valuesFromSubmission(data.submissionData); listCounts = listCountsFrom(values)
  // 4. missingRequired(fields, values, listCounts) → ValidationError on submissionData naming
  //    the missing labels; log warn
  // 5. file / signature values must be ids of form-uploads with this form → else ValidationError
  // 6. data.submissionData = toSubmissionData(fields, values, listCounts); return data
  throw new Error('not implemented')
}
