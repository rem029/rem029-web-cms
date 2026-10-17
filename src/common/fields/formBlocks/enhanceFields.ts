import type { Block, Field } from 'payload'

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
  // 1. take the plugin's block: `fields[name]` from '@payloadcms/plugin-form-builder' (throw if missing)
  // 2. extra = message → [cssClassField]; else [helpTextField, cssClassField] (./childFields)
  //    + iconField (@/fields/icon) when name is in ICON_BLOCKS, + directionField when 'radio'
  // 3. return { ...block, fields: [...block.fields, ...extra] }
  throw new Error(`enhanceStockBlock(${name}): not implemented`)
}

/** Every enhanced stock block by name, built once so every nesting level shares the same config. */
export const enhancedStockBlocks = (): Record<StockBlockName, Block> => {
  // Object.fromEntries(STOCK_BLOCK_NAMES.map((name) => [name, enhanceStockBlock(name)]))
  throw new Error('enhancedStockBlocks: not implemented')
}
