import { Field } from 'payload'

export const BlockquoteStyles: Field[] = [
  { name: 'padding', type: 'text', defaultValue: '1rem 0 1rem 1.5rem' },
  { name: 'borderLeftWidth', type: 'text', defaultValue: '4px' },
  {
    name: 'borderLeftStyle',
    type: 'select',
    options: ['solid', 'dashed', 'dotted'],
    defaultValue: 'solid',
  },
  {
    name: 'fontStyle',
    type: 'select',
    options: ['normal', 'italic'],
    defaultValue: 'italic',
  },
  { name: 'margin', type: 'text', defaultValue: '0 0 1rem 0' },
]
