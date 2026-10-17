import type { Field } from 'payload'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { formBuilderFields } from '@/common/fields/formBlocks'
import { validateMultiStep } from '@/plugins/hooks/validateMultiStep'
import { setFormSubmissionTenant } from '@/plugins/hooks/setFormSubmissionTenant'

const withRichConfirmation = (field: Field): Field =>
  'name' in field && field.name === 'confirmationMessage' && field.type === 'richText'
    ? {
        ...field,
        editor: lexicalEditor({
          features: ({ rootFeatures }) => [
            ...rootFeatures,
            FixedToolbarFeature(),
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
          ],
        }),
      }
    : field

/**
 * Forms and form submissions (`@payloadcms/plugin-form-builder`): the field blocks editors build
 * forms from, the form settings and appearance, and the submission's tenant.
 */
export const formBuilder = formBuilderPlugin({
  fields: formBuilderFields(),
  formOverrides: {
    // rem0016 step 1b: indexes (tenant, slug), validateTenantSlugUniqueness, the tabs layout,
    // appearanceTab and formSidebarFields
    hooks: {
      beforeChange: [validateMultiStep],
    },
    fields: ({ defaultFields }) => defaultFields.map(withRichConfirmation),
  },
  formSubmissionOverrides: {
    hooks: {
      beforeValidate: [setFormSubmissionTenant],
    },
  },
})
