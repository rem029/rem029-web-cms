import type { Block } from 'payload'

import { childFields } from './childFields'
import { inputBlocks } from './inputBlocks'

// rows the visitor adds and removes (e.g. family members); values saved as `<list>.<row>.<field>`
export const listBlock: Block = {
  slug: 'list',
  interfaceName: 'FormListBlock',
  labels: { singular: 'List', plural: 'Lists' },
  fields: [
    ...childFields,
    {
      name: 'max_items',
      type: 'number',
      label: 'Maximum rows',
      min: 1,
      admin: { description: 'Optional: how many rows a visitor can add.' },
    },
    { name: 'fields', type: 'blocks', label: 'Fields in each row', blocks: inputBlocks },
  ],
}
