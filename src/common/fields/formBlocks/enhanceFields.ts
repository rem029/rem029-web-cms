import type { Block, Field } from 'payload'
import { fields as pluginBlocks } from '@payloadcms/plugin-form-builder'

import { iconField } from '@/fields/icon'

import { cssClassField, helpTextField } from './childFields'

/** The plugin's own blocks this app turns on (`payment` stays off). */
export const STOCK_BLOCK_NAMES = [
  'text',
  'textarea',
  'email',
  'number',
  'select',
  'checkbox',
  'radio',
  'date',
  'country',
  'state',
  'message',
] as const

export type StockBlockName = (typeof STOCK_BLOCK_NAMES)[number]

// the stock blocks that already had an icon before rem0016
export const ICON_BLOCKS: StockBlockName[] = [
  'text',
  'select',
  'email',
  'number',
  'country',
  'state',
]

/** Radio options laid out in a column or a row. */
export const directionField: Field = {
  name: 'direction',
  type: 'select',
  label: 'Options direction',
  defaultValue: 'column',
  options: [
    { label: 'Column (vertical)', value: 'column' },
    { label: 'Row (horizontal)', value: 'row' },
  ],
}

/**
 * A stock block with this app's extra fields: `help_text` + `css_class` on inputs, `icon` where
 * it was before, `direction` on radio. `message` is content only, so it gets `css_class` alone.
 */
export const enhanceStockBlock = (name: StockBlockName): Block => {
  const block = pluginBlocks[name]
  if (!block || typeof block !== 'object' || !('slug' in block)) {
    throw new Error(`form builder: the plugin has no "${name}" block`)
  }
  const extra: Field[] = name === 'message' ? [cssClassField] : [helpTextField, cssClassField]
  if (ICON_BLOCKS.includes(name)) extra.push(iconField)
  if (name === 'radio') extra.push(directionField)
  return { ...block, fields: [...block.fields, ...extra] }
}

/** Every enhanced stock block by name, built once so every nesting level shares the same config. */
export const enhancedStockBlocks = (): Record<StockBlockName, Block> => ({
  text: enhanceStockBlock('text'),
  textarea: enhanceStockBlock('textarea'),
  email: enhanceStockBlock('email'),
  number: enhanceStockBlock('number'),
  select: enhanceStockBlock('select'),
  checkbox: enhanceStockBlock('checkbox'),
  radio: enhanceStockBlock('radio'),
  date: enhanceStockBlock('date'),
  country: enhanceStockBlock('country'),
  state: enhanceStockBlock('state'),
  message: enhanceStockBlock('message'),
})
