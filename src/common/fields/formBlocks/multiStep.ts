import type { Block } from 'payload'

import { cssClassField } from './childFields'
import { conditionalBlock } from './conditional'
import { groupBlock } from './group'
import { inputBlocks } from './inputBlocks'
import { listBlock } from './list'

/** Blocks allowed inside a step: everything but another multi-step. */
export const stepBlocks: Block[] = [...inputBlocks, groupBlock, listBlock, conditionalBlock]

// the whole form split into steps; a form with this block has nothing else at the top level
// (validateMultiStep)
export const multiStepBlock: Block = {
  slug: 'multi-step',
  interfaceName: 'FormMultiStepBlock',
  labels: { singular: 'Multi-step', plural: 'Multi-steps' },
  fields: [
    {
      name: 'steps',
      type: 'array',
      label: 'Steps',
      minRows: 2,
      labels: { singular: 'Step', plural: 'Steps' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Step title',
              required: true,
              localized: true,
              admin: { description: 'Shown in the step indicator, e.g. "Your details".' },
            },
            { ...cssClassField, admin: { width: '50%' } },
          ],
        },
        { name: 'description', type: 'textarea', label: 'Step intro', localized: true },
        { name: 'fields', type: 'blocks', label: 'Fields', blocks: stepBlocks },
      ],
    },
  ],
}
