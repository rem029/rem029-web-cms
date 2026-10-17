import type { Block, Field } from 'payload'
import { formBuilderPlugin, fields } from '@payloadcms/plugin-form-builder'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { iconField } from '@/fields/icon'
import { setFormSubmissionTenant } from '@/plugins/hooks/setFormSubmissionTenant'

const addFormmBuilderField = (fieldName: string, newFields: Field[]) => {
  return { ...fields[fieldName], fields: [...(fields[fieldName] as Block).fields, ...newFields] }
}

/**
 * Forms and form submissions (`@payloadcms/plugin-form-builder`): the field blocks editors build
 * forms from, the form settings and appearance, and the submission's tenant.
 */
export const formBuilder = formBuilderPlugin({
  // rem0016 step 1: fields: formBuilderFields() (src/common/fields/formBlocks): the enhanced stock
  // blocks (radio and date on, payment off, icon kept) + the custom blocks
  fields: {
    payment: false,
    text: addFormmBuilderField('text', [iconField]),
    select: addFormmBuilderField('select', [iconField]),
    email: addFormmBuilderField('email', [iconField]),
    number: addFormmBuilderField('number', [iconField]),
    country: addFormmBuilderField('country', [iconField]),
    state: addFormmBuilderField('state', [iconField]),
  },
  formOverrides: {
    // rem0016 step 1:
    // - indexes: [{ fields: ['tenant', 'slug'], unique: true }]
    // - hooks: beforeValidate [validateTenantSlugUniqueness('forms', 'form')],
    //          beforeChange [validateMultiStep]
    // - fields: the plugin's default fields rearranged in unnamed tabs (data shape unchanged):
    //     'Form': formHeaderFields, title, fields (blocks), submitButtonLabel
    //     'After submit': confirmationType, confirmationMessage (lexical as below), redirect, emails
    //     appearanceTab (src/common/fields/formAppearance.ts)
    //   and formSidebarFields (src/common/fields/formSettings.ts) in the sidebar
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
