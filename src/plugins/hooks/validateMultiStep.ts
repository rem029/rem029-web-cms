import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import type { Form } from '@/payload-types'

/**
 * A form with a Multi-step block has nothing else at the top level: every field goes in a step
 * (sdq `validate-multi-step`). Runs on drafts too (beforeChange, not validate).
 */
export const validateMultiStep: CollectionBeforeChangeHook<Form> = ({ data, originalDoc, req }) => {
  const fields = data.fields ?? []
  if (!fields.some((field) => field.blockType === 'multi-step') || fields.length === 1) return data

  const others = fields
    .filter((field) => field.blockType !== 'multi-step')
    .map((field) => field.blockType)
  req.payload.logger.warn({
    msg: 'forms: multi-step mixed with top-level fields',
    formId: originalDoc?.id,
    tenant: data.tenant,
    others,
  })
  throw new ValidationError({
    collection: 'forms',
    errors: [
      {
        path: 'fields',
        message: `A multi-step form keeps every field inside its steps. Move ${others.join(', ')} into a step, or remove the Multi-step block.`,
      },
    ],
    req,
  })
}
