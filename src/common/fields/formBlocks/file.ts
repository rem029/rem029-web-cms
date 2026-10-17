import type { Block } from 'payload'

import { childFields } from './childFields'

// A file upload (images or PDF, 10 MB max).
export const fileBlock: Block = {
  slug: 'file',
  interfaceName: 'FormFileBlock',
  labels: { singular: 'File', plural: 'Files' },
  fields: [...childFields],
}
