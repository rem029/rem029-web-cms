import { Field } from 'payload'

export const LinkStyles: Field[] = [
  {
    name: 'textDecoration',
    type: 'select',
    options: ['none', 'underline'],
    defaultValue: 'none',
  },
  { name: 'fontWeight', type: 'text', defaultValue: '500' },
  {
    name: 'hoverDecoration',
    type: 'select',
    options: ['none', 'underline'],
    defaultValue: 'underline',
  },
]
