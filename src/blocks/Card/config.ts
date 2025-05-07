import type { Block } from 'payload'

export const CardBlock: Block = {
  slug: 'card',
  interfaceName: 'CardBlock',
  labels: {
    singular: 'Card',
    plural: 'Cards',
  },
  fields: [
    {
      name: 'variant',
      label: 'Card Style Variant',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Image Background',
          value: 'image-background',
        },
        {
          label: 'Inline Image',
          value: 'inline-image',
        },
        {
          label: 'Row Style',
          value: 'row-style',
        },
      ],
      defaultValue: 'inline-image',
    },
    {
      name: 'image', // Assuming you'll want an image for 'image-background' and 'inline-image'
      label: 'Image',
      type: 'upload',
      relationTo: 'media', // Replace 'media' with your actual media collection slug
      admin: {
        condition: ({ variant }) => variant === 'image-background' || variant === 'inline-image',
      },
    },
    {
      name: 'headerTitle',
      label: 'Header Title',
      type: 'text',
    },
    {
      name: 'bodyTitle',
      label: 'Body Title',
      type: 'text',
    },
    {
      name: 'bodyText',
      label: 'Body Text',
      type: 'richText',
    },
    {
      type: 'group',
      name: 'button',
      label: 'Button',
      fields: [
        {
          name: 'buttonVariant',
          label: 'Button Variant',
          type: 'select',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Outline', value: 'outline' },
            { label: 'Link', value: 'link' },
          ],
          defaultValue: 'primary',
        },
        {
          name: 'buttonText',
          label: 'Button Text',
          type: 'text',
        },
        {
          name: 'buttonHref',
          label: 'Button Link (URL or Path)',
          type: 'text',
        },
        {
          name: 'buttonNewTab',
          label: 'Open in New Tab',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}
