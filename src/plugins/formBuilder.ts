import { fields, formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { Block, Field } from 'payload'

import { iconField } from '@/fields/icon'
import { setFormSubmissionTenant } from '@/plugins/hooks/setFormSubmissionTenant'

const addFormBuilderField = (fieldName: string, newFields: Field[]) => {
  return { ...fields[fieldName], fields: [...(fields[fieldName] as Block).fields, ...newFields] }
}

export const formBuilder = formBuilderPlugin({
  fields: {
    payment: false,
    text: addFormBuilderField('text', [iconField]),
    select: addFormBuilderField('select', [iconField]),
    email: addFormBuilderField('email', [iconField]),
    number: addFormBuilderField('number', [iconField]),
    country: addFormBuilderField('country', [iconField]),
    state: addFormBuilderField('state', [iconField]),
  },
  formOverrides: {
    fields: ({ defaultFields }) => {
      return defaultFields.map((field) => {
        if ('name' in field && field.name === 'confirmationMessage') {
          return {
            ...field,
            editor: lexicalEditor({
              features: ({ rootFeatures }) => {
                return [
                  ...rootFeatures,
                  FixedToolbarFeature(),
                  HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                ]
              },
            }),
          }
        }
        return field
      })
    },
  },
  formSubmissionOverrides: {
    hooks: {
      beforeValidate: [setFormSubmissionTenant],
    },
  },
})
