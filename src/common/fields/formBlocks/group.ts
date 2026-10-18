import type { Block } from 'payload'

import { childFields } from './childFields'
import { inputBlocks } from './inputBlocks'

// fields shown together under one heading; values saved as `<group>.<field>`
export const groupBlock: Block = {
  slug: 'group',
  interfaceName: 'FormGroupBlock',
  labels: { singular: 'Group', plural: 'Groups' },
  fields: [
    ...childFields,
    { name: 'fields', type: 'blocks', label: 'Fields', blocks: inputBlocks },
  ],
}
