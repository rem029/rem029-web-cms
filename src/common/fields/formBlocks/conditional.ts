import type { Block } from 'payload'

import { cssClassField } from './childFields'
import { groupBlock } from './group'
import { inputBlocks } from './inputBlocks'
import { listBlock } from './list'

// fields shown only when another field's answer matches; hidden fields are never required
export const conditionalBlock: Block = {
  slug: 'conditional',
  interfaceName: 'FormConditionalBlock',
  labels: { singular: 'Conditional', plural: 'Conditionals' },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'condition_field',
          type: 'text',
          label: 'When field',
          required: true,
          admin: { description: 'The name of the field to watch.' },
        },
        {
          name: 'operator',
          type: 'select',
          label: 'Is',
          defaultValue: 'equal',
          required: true,
          options: [
            { label: 'Equal to', value: 'equal' },
            { label: 'Not equal to', value: 'not_equal' },
            { label: 'Contains', value: 'contains' },
            { label: 'Does not contain', value: 'not_contains' },
          ],
        },
        { name: 'value', type: 'text', label: 'Value', required: true },
      ],
    },
    cssClassField,
    {
      name: 'fields',
      type: 'blocks',
      label: 'Show these fields',
      blocks: [...inputBlocks, groupBlock, listBlock],
    },
  ],
}
