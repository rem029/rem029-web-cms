import type { Block } from 'payload'

import { enhancedStockBlocks } from './enhanceFields'
import { fileBlock } from './file'
import { imageBlock } from './image'
import { phoneBlock } from './phone'
import { ratingBlock } from './rating'
import { scaleBlock } from './scale'
import { signatureBlock } from './signature'
import { timeBlock } from './time'

/** The enhanced stock blocks, shared by the plugin config and every nested level. */
export const stockBlocks = enhancedStockBlocks()

/** Custom leaf blocks (no nested fields). */
export const customLeafBlocks: Block[] = [
  fileBlock,
  signatureBlock,
  phoneBlock,
  timeBlock,
  ratingBlock,
  scaleBlock,
  imageBlock,
]

/** Everything allowed inside a group or a list: stock + custom leaf blocks. */
export const inputBlocks: Block[] = [...Object.values(stockBlocks), ...customLeafBlocks]
