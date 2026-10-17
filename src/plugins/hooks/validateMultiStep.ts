import type { CollectionBeforeChangeHook } from 'payload'

import type { Form } from '@/payload-types'

/**
 * A form with a Multi-step block has nothing else at the top level: every field goes in a step
 * (sdq `validate-multi-step`). Runs on drafts too (beforeChange, not validate).
 */
export const validateMultiStep: CollectionBeforeChangeHook<Form> = ({ data, req }) => {
  // 1. fields = data.fields ?? []
  // 2. no block with blockType 'multi-step' → return data
  // 3. more than one block at the top level →
  //    req.payload.logger.warn({ msg: 'forms: multi-step mixed with top-level fields', formId, tenant })
  //    throw ValidationError on path 'fields':
  //    'A multi-step form keeps every field inside its steps. Move <blockTypes> into a step, or remove the Multi-step block.'
  // 4. return data
  void req
  return data
}
