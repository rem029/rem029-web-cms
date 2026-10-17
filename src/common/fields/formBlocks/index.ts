import type { Block } from 'payload'

import { conditionalBlock } from './conditional'
import { groupBlock } from './group'
import { customLeafBlocks, stockBlocks } from './inputBlocks'
import { listBlock } from './list'
import { multiStepBlock } from './multiStep'

/** Custom blocks at the top level of a form, keyed by slug for `formBuilderPlugin({ fields })`. */
export const customFormBlocks = (): Record<string, Block> =>
  Object.fromEntries(
    [...customLeafBlocks, groupBlock, listBlock, conditionalBlock, multiStepBlock].map((block) => [
      block.slug,
      block,
    ]),
  )

/** The `fields` option of `formBuilderPlugin`: enhanced stock blocks + custom blocks, payment off. */
export const formBuilderFields = (): Record<string, Block | false> => ({
  ...stockBlocks,
  ...customFormBlocks(),
  payment: false,
})
