import { Field } from 'payload'

export const InputStyles: Field[] = [
  { name: 'fontSize', type: 'text', defaultValue: '1rem' },
  { name: 'padding', type: 'text', defaultValue: '0.5rem' },
  { name: 'borderRadius', type: 'text', defaultValue: '0.25rem' },
  { name: 'borderWidth', type: 'text', defaultValue: '1px' },
  {
    name: 'borderStyle',
    type: 'select',
    options: ['solid', 'dashed', 'dotted'],
    defaultValue: 'solid',
  },
]
