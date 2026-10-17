import type { CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

import { FORM_UPLOAD_MAX_BYTES } from '../constants'

/**
 * Refuses a file over FORM_UPLOAD_MAX_BYTES (Payload's own size limit is one value for every
 * collection, so this one is per collection).
 */
export const validateUploadSize: CollectionBeforeValidateHook = ({ data, req }) => {
  // Payload records the uploaded file's size on `filesize` before this hook runs
  const size = typeof data?.filesize === 'number' ? data.filesize : req.file?.size
  if (size === undefined || size <= FORM_UPLOAD_MAX_BYTES) return data

  req.payload.logger.warn({
    msg: 'form-uploads: file too large',
    size,
    form: data?.form,
    tenant: data?.tenant,
  })
  throw new ValidationError({
    collection: 'form-uploads',
    errors: [{ path: 'file', message: 'Files can be up to 10 MB.' }],
    req,
  })
}
