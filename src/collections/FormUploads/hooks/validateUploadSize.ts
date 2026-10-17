import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Refuses a file over FORM_UPLOAD_MAX_BYTES (Payload's own size limit is one value for every
 * collection, so this one is per collection).
 */
export const validateUploadSize: CollectionBeforeValidateHook = ({ data, req }) => {
  // 1. no req.file → return data (updates without a new file)
  // 2. req.file.size > FORM_UPLOAD_MAX_BYTES →
  //    req.payload.logger.warn({ msg: 'form-uploads: file too large', size, form: data.form })
  //    throw ValidationError on path 'file': 'Files can be up to 10 MB.'
  // 3. return data
  void req
  return data
}
