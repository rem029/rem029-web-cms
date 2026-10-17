import type { Field } from 'payload'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { appearanceTab } from '@/common/fields/formAppearance'
import { formBuilderFields } from '@/common/fields/formBlocks'
import { formHeaderFields, formSidebarFields } from '@/common/fields/formSettings'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'
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

// the plugin's own fields that open the form; everything else it adds goes in "After submit"
const FORM_TAB_FIELDS = ['title', 'fields', 'submitButtonLabel']

const fieldName = (field: Field): string | undefined => ('name' in field ? field.name : undefined)

/**
 * The plugin's fields in unnamed tabs (the data shape stays the same): the form itself, what
 * happens after submit, and the appearance; settings in the sidebar.
 */
const formLayout = (defaultFields: Field[]): Field[] => {
  const byName = (name: string) => defaultFields.filter((field) => fieldName(field) === name)
  const afterSubmit = defaultFields.filter(
    (field) => !FORM_TAB_FIELDS.includes(fieldName(field) ?? ''),
  )
  return [
    ...formSidebarFields,
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Form',
          fields: [
            ...byName('title'),
            ...formHeaderFields,
            ...byName('fields'),
            ...byName('submitButtonLabel'),
          ],
        },
        { label: 'After submit', fields: afterSubmit },
        appearanceTab,
      ],
    },
  ]
}

/**
 * Forms and form submissions (`@payloadcms/plugin-form-builder`): the field blocks editors build
 * forms from, the form settings and appearance, and the submission's tenant.
 */
export const formBuilder = formBuilderPlugin({
  fields: formBuilderFields(),
  formOverrides: {
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    hooks: {
      beforeValidate: [validateTenantSlugUniqueness('forms', 'form')],
      beforeChange: [validateMultiStep],
    },
    // rem0016 step 2: + a map that sets `localized: true` on `title` and `localized: false` on
    // `emails[].subject` / `emails[].message` (only visitor-facing text is translated)
    fields: ({ defaultFields }) => formLayout(defaultFields.map(withRichConfirmation)),
  },
  formSubmissionOverrides: {
    hooks: {
      beforeValidate: [setFormSubmissionTenant],
    },
  },
})
