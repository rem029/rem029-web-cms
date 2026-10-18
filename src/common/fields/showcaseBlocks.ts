import type { Block } from 'payload'

// block slugs are global across the config, hence the `showcase` prefix
export const ShowcaseCallout: Block = {
  slug: 'showcaseCallout',
  labels: { singular: 'Callout', plural: 'Callouts' },
  fields: [
    {
      name: 'tone',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Danger', value: 'danger' },
      ],
    },
    { name: 'text', type: 'textarea', required: true },
  ],
}

export const ShowcaseQuote: Block = {
  slug: 'showcaseQuote',
  labels: { singular: 'Quote', plural: 'Quotes' },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'author', type: 'text' },
  ],
}
