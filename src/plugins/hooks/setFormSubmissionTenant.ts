import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

export const setFormSubmissionTenant: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data) return data

  const formId =
    typeof data.form === 'object' && data.form !== null && 'id' in data.form
      ? data.form.id
      : data.form

  if (!formId) {
    throw new APIError('The form associated with this submission could not be found.', 400)
  }

  let form
  try {
    form = await req.payload.findByID({
      collection: 'forms',
      id: formId,
      req,
      depth: 0,
    })
  } catch (error) {
    req.payload.logger.error({
      msg: 'Error finding form for submission',
      formId,
      err: error,
    })
    throw new APIError('The form associated with this submission could not be found.', 400)
  }

  if (!form) {
    throw new APIError('The form associated with this submission could not be found.', 400)
  }

  const tenant =
    typeof form.tenant === 'object' && form.tenant !== null && 'id' in form.tenant
      ? form.tenant.id
      : form.tenant

  if (!tenant) {
    req.payload.logger.error({
      msg: 'Form associated with submission has no tenant',
      formId,
    })
    throw new APIError(
      'The form associated with this submission does not have an assigned business.',
      400,
    )
  }

  data.tenant = tenant
  return data
}
