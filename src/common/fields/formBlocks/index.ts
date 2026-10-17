import type { Block } from 'payload'

import type { StockBlockName } from './enhanceFields'

/** Custom blocks at the top level of a form, keyed by slug for `formBuilderPlugin({ fields })`. */
export const customFormBlocks = (): Record<string, Block> => {
  // Object.fromEntries(
  //   [...customLeafBlocks, groupBlock, listBlock, conditionalBlock, multiStepBlock]
  //     .map((block) => [block.slug, block]),
  // )
  throw new Error('customFormBlocks: not implemented')
}

/** The `fields` option of `formBuilderPlugin`: enhanced stock blocks + custom blocks, payment off. */
export const formBuilderFields = (): Partial<Record<StockBlockName | 'payment', Block | false>> &
  Record<string, Block | boolean> => {
  // { ...stockBlocks, ...customFormBlocks(), payment: false }
  throw new Error('formBuilderFields: not implemented')
}
