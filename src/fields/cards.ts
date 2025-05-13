import { Field } from 'payload'
import { LinkVariant } from './linkVariant'

export const cardsFields: Field[] = [
  {
    name: 'image',
    label: 'Image',
    type: 'upload',
    localized: true,
    relationTo: 'media',
  },
  {
    name: 'imageFit',
    label: 'Image Fit',
    type: 'select',
    localized: true,
    defaultValue: 'contain',
    options: [
      { label: 'Contain', value: 'contain' },
      { label: 'Cover', value: 'cover' },
      { label: 'Fill', value: 'fill' },
    ],
    admin: {
      description: 'How the image should be resized to fit the container.',
    },
  },
  {
    name: 'headerTitle',
    label: 'Header Title',
    localized: true,
    type: 'text',
  },
  {
    name: 'bodyTitle',
    label: 'Body Title',
    localized: true,
    type: 'text',
  },
  {
    name: 'bodyText',
    label: 'Body Text',
    localized: true,
    type: 'richText',
  },
  {
    type: 'group',
    name: 'button',
    label: 'Button',
    fields: [{ type: 'text', name: 'elemId', label: 'Element ID' }, ...LinkVariant],
  },
]
