import { Field } from 'payload'

export const TableStyles: Field[] = [
  { name: 'cellPadding', type: 'text', defaultValue: '0.75rem' },
  { name: 'borderWidth', type: 'text', defaultValue: '1px' },
  {
    name: 'borderStyle',
    type: 'select',
    options: ['solid', 'dashed', 'dotted'],
    defaultValue: 'solid',
  },
]
