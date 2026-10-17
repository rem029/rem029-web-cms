import { redirectsPlugin } from '@payloadcms/plugin-redirects'

import { revalidateRedirects } from '@/hooks/revalidateRedirects'

export const redirects = redirectsPlugin({
  collections: ['pages', 'posts'],
  overrides: {
    indexes: [
      {
        fields: ['tenant', 'from'],
        unique: true,
      },
    ],
    fields: ({ defaultFields }) => {
      return defaultFields.map((field) => {
        if (field.type === 'text' && field.name === 'from') {
          return {
            ...field,
            admin: {
              ...field.admin,
              description: 'You will need to rebuild the website when changing this field.',
            },
          }
        }
        return field
      })
    },
    hooks: {
      afterChange: [revalidateRedirects],
    },
  },
})
