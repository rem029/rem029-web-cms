import type { Field } from 'payload'

import { slugField } from '@/fields/slug'

/**
 * Form settings in the sidebar (slug, availability, languages, sign-in) and the header / terms
 * fields shown above the form. Survey-only settings from survey-doha-quest are not ported.
 */
export const formSidebarFields: Field[] = [
  // `/forms/<slug>` on the tenant's site; unique per tenant (validateTenantSlugUniqueness)
  ...slugField('title'),
  {
    name: 'isActive',
    type: 'checkbox',
    label: 'Accepting answers',
    defaultValue: true,
    admin: { position: 'sidebar' },
  },
  {
    name: 'activeFrom',
    type: 'date',
    label: 'Open from',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime' },
      condition: (data) => Boolean(data?.isActive),
    },
  },
  {
    name: 'activeTo',
    type: 'date',
    label: 'Open until',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime' },
      condition: (data) => Boolean(data?.isActive),
    },
    // validate: activeTo after activeFrom (validateActiveWindow)
  },
  {
    name: 'available_languages',
    type: 'select',
    label: 'Languages',
    hasMany: true,
    defaultValue: ['en'],
    required: true,
    options: [
      { label: 'English', value: 'en' },
      { label: 'Arabic', value: 'ar' },
    ],
    admin: { position: 'sidebar' },
  },
  {
    name: 'requires_auth',
    type: 'checkbox',
    label: 'Members only',
    defaultValue: false,
    admin: {
      position: 'sidebar',
      description: 'Only signed-in members of this business can fill it in.',
    },
  },
  {
    name: 'show_sequence_number',
    type: 'checkbox',
    label: 'Number the questions',
    defaultValue: false,
    admin: { position: 'sidebar' },
  },
]

/** Header image and terms, at the top of the form's main tab. */
export const formHeaderFields: Field[] = [
  {
    name: 'header_image',
    type: 'upload',
    relationTo: 'media',
    label: 'Header image',
    admin: { description: 'Shown above the form. 16:9 works best.' },
  },
  {
    type: 'collapsible',
    label: 'Terms and conditions',
    admin: { initCollapsed: true },
    fields: [
      {
        name: 'has_terms',
        type: 'checkbox',
        label: 'Ask visitors to accept terms before submitting',
        defaultValue: false,
      },
      {
        name: 'terms_content',
        type: 'richText',
        label: 'Terms',
        localized: true,
        admin: { condition: (_, siblingData) => Boolean(siblingData?.has_terms) },
      },
    ],
  },
]

/** `activeTo` must be after `activeFrom` when both are set. */
export const validateActiveWindow = (
  value: unknown,
  { siblingData }: { siblingData: Partial<{ activeFrom: string | null }> },
): true | string => {
  // 1. no value or no siblingData.activeFrom → true
  // 2. new Date(value) <= new Date(activeFrom) → 'The end date must be after the start date.'
  // 3. else true
  void value
  void siblingData
  throw new Error('validateActiveWindow: not implemented')
}
