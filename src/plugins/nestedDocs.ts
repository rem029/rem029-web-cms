import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'

export const nestedDocs = nestedDocsPlugin({
  collections: ['categories'],
  generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
})
