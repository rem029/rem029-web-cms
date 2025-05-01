import { Field } from 'payload'

export const ButtonStyles: Field[] = [
  { name: 'fontSize', type: 'text', defaultValue: '1rem' },
  { name: 'fontWeight', type: 'text', defaultValue: '500' },
  { name: 'padding', type: 'text', defaultValue: '0.5rem 1rem' },
  { name: 'borderRadius', type: 'text', defaultValue: '0.25rem' },
  { name: 'borderWidth', type: 'text', defaultValue: '1px' },
  {
    name: 'borderStyle',
    type: 'select',
    options: ['solid', 'dashed', 'dotted'],
    defaultValue: 'solid',
  },
]
