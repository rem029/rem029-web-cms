/** Form builders for the form-builder tests: a form doc per tenant, typed, no casts. */
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import type { Form, Media } from '@/payload-types'

import { uniqueName } from '../common/unique'
import type { SessionUser } from '../common/users'

export type FormData = RequiredDataFromCollectionSlug<'forms'>
export type FormFields = NonNullable<Form['fields']>
export type FormBlock = FormFields[number]

// a 1x1 transparent png, for the image blocks
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const confirmation = (message: string): NonNullable<Form['confirmationMessage']> => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: message, version: 1 }],
      },
    ],
  },
})

/** A minimal form in `tenantId` titled `title` with the given top-level blocks. */
export const formData = (tenantId: number, title: string, fields: FormFields): FormData => ({
  tenant: tenantId,
  title,
  fields,
  confirmationType: 'message',
  confirmationMessage: confirmation('Thanks'),
})

/** Creates a form as `user` (access applied), returning the saved doc. */
export const createForm = async (
  payload: Payload,
  user: SessionUser,
  data: FormData,
): Promise<Form> =>
  payload.create({ collection: 'forms', data, user, overrideAccess: false, depth: 0 })

/** An image in `tenantId`'s media, for the image blocks. */
export const createImage = async (
  payload: Payload,
  user: SessionUser,
  tenantId: number,
): Promise<Media> => {
  const name = uniqueName('form-image')
  return payload.create({
    collection: 'media',
    data: { alt: name, tenant: tenantId },
    file: { data: PNG, mimetype: 'image/png', name: `${name}.png`, size: PNG.length },
    user,
    overrideAccess: false,
  })
}

/** The blockTypes of a list of blocks, in order. */
export const blockTypes = (fields: FormFields | null | undefined): string[] =>
  (fields ?? []).map((field) => field.blockType)

/** The first block of `blockType` in `fields`, narrowed to its type; throws when missing. */
export const findBlock = <T extends FormBlock['blockType']>(
  fields: FormFields | null | undefined,
  blockType: T,
): Extract<FormBlock, { blockType: T }> => {
  const block = (fields ?? []).find(
    (field): field is Extract<FormBlock, { blockType: T }> => field.blockType === blockType,
  )
  if (!block) throw new Error(`tests: no ${blockType} block`)
  return block
}

/**
 * One of every custom block at the top level (file, signature, phone, time, rating with labels,
 * scale, image, group, list, conditional) plus radio and date, each with a `css_class`.
 */
export const everyBlockFields = (mediaId: number): FormFields => [
  { blockType: 'file', name: 'cv', label: 'CV', css_class: 'c-file' },
  { blockType: 'signature', name: 'sign', label: 'Signature', css_class: 'c-signature' },
  { blockType: 'phone', name: 'phone', label: 'Phone', css_class: 'c-phone' },
  { blockType: 'time', name: 'arrival', label: 'Arrival', css_class: 'c-time' },
  {
    blockType: 'rating',
    name: 'service',
    label: 'Service',
    display: 'buttons',
    labels: [{ label: 'Poor' }, { label: 'Fine' }, { label: 'Great' }],
    css_class: 'c-rating',
  },
  {
    blockType: 'scale',
    name: 'recommend',
    label: 'Recommend',
    min: 0,
    max: 10,
    step: 1,
    min_label: 'Unlikely',
    max_label: 'Very likely',
    css_class: 'c-scale',
  },
  { blockType: 'image', media: mediaId, caption: 'Our venue', size: 'medium', css_class: 'c-img' },
  {
    blockType: 'group',
    name: 'address',
    label: 'Address',
    css_class: 'c-group',
    fields: [{ blockType: 'text', name: 'street', label: 'Street', required: true }],
  },
  {
    blockType: 'list',
    name: 'guests',
    label: 'Guests',
    max_items: 4,
    css_class: 'c-list',
    fields: [{ blockType: 'text', name: 'guest_name', label: 'Name' }],
  },
  {
    blockType: 'conditional',
    condition_field: 'service',
    operator: 'equal',
    value: 'Poor',
    css_class: 'c-cond',
    fields: [{ blockType: 'textarea', name: 'what_went_wrong', label: 'What went wrong?' }],
  },
  {
    blockType: 'radio',
    name: 'visit',
    label: 'Visit',
    direction: 'row',
    options: [
      { label: 'First', value: 'first' },
      { label: 'Returning', value: 'returning' },
    ],
    css_class: 'c-radio',
  },
  { blockType: 'date', name: 'visit_date', label: 'Visit date', css_class: 'c-date' },
]

/** A two-step form: step 1 has a group and an image, step 2 a list inside a conditional. */
export const multiStepFields = (mediaId: number): FormFields => [
  {
    blockType: 'multi-step',
    steps: [
      {
        label: 'You',
        css_class: 'c-step-1',
        fields: [
          {
            blockType: 'group',
            name: 'person',
            label: 'Person',
            fields: [
              { blockType: 'text', name: 'first_name', label: 'First name', css_class: 'c-first' },
              { blockType: 'image', media: mediaId, caption: 'Badge' },
            ],
          },
          { blockType: 'image', media: mediaId, caption: 'Welcome' },
          { blockType: 'message', css_class: 'c-intro' },
          { blockType: 'rating', name: 'mood', label: 'Mood', css_class: 'c-mood' },
        ],
      },
      {
        label: 'Family',
        fields: [
          {
            blockType: 'radio',
            name: 'has_kids',
            label: 'Kids?',
            options: [
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ],
          },
          {
            blockType: 'conditional',
            condition_field: 'has_kids',
            operator: 'equal',
            value: 'yes',
            fields: [
              {
                blockType: 'list',
                name: 'kids',
                label: 'Kids',
                max_items: 5,
                fields: [{ blockType: 'number', name: 'age', label: 'Age' }],
              },
            ],
          },
        ],
      },
    ],
  },
]
