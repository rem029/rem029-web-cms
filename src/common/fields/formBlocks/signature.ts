import type { Block } from 'payload'

import { childFields } from './childFields'

// A signature drawn with a finger or mouse, saved as an image.
export const signatureBlock: Block = {
  slug: 'signature',
  interfaceName: 'FormSignatureBlock',
  labels: { singular: 'Signature', plural: 'Signatures' },
  fields: [...childFields],
}
