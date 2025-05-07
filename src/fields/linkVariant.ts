import { Field } from 'payload'

export const LinkVariant: Field[] = [
  {
    name: 'text',
    type: 'text',
    localized: true,
    required: true,
  },
  {
    name: 'href',
    type: 'text',
    required: true,
    localized: true,
  },
  {
    name: 'new_tab',
    label: 'Open in new tab',
    type: 'checkbox',
  },
  {
    name: 'variant',
    dbName: 'var',
    type: 'select',
    localized: true,
    required: true,
    defaultValue: 'link',
    options: [
      { label: 'Link', value: 'link' },
      { label: 'Button Primary', value: 'btn-primary' },
      { label: 'Button Secondary', value: 'btn-secondary' },
      { label: 'Button Outline', value: 'btn-outline' },
      { label: 'Button', value: 'btn' },
    ],
  },
]
