import { Field } from 'payload'

export const CardStyles: Field[] = [
  { name: 'padding', type: 'text', defaultValue: '1.5rem' },
  { name: 'borderRadius', type: 'text', defaultValue: '0.5rem' },
  { name: 'borderWidth', type: 'text', defaultValue: '1px' },
  {
    name: 'borderStyle',
    type: 'select',
    options: ['solid', 'dashed', 'dotted', 'none'],
    defaultValue: 'solid',
  },
  { name: 'boxShadow', type: 'text', defaultValue: '0 4px 6px rgba(0,0,0,0.1)' },
]
