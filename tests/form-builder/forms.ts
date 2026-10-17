/** Form builders for the form-builder tests: a form doc per tenant, typed, no casts. */
import type { Payload } from 'payload'
import type { RequiredDataFromCollectionSlug } from 'payload'

import type { Form } from '@/payload-types'

import type { SessionUser } from '../common/users'

export type FormData = RequiredDataFromCollectionSlug<'forms'>

/** A minimal form in `tenantId` titled `title` with the given top-level blocks. */
export const formData = (
  tenantId: number,
  title: string,
  fields: NonNullable<Form['fields']>,
): FormData => {
  // { tenant: tenantId, title, slug: title, fields, confirmationType: 'message',
  //   confirmationMessage: a one-paragraph lexical doc }
  void tenantId
  void title
  void fields
  throw new Error('tests: formData not implemented')
}

/** Creates a form as `user` (access applied), returning the saved doc. */
export const createForm = async (
  payload: Payload,
  user: SessionUser,
  data: FormData,
): Promise<Form> => {
  // payload.create({ collection: 'forms', data, user, overrideAccess: false, depth: 0 })
  void payload
  void user
  void data
  throw new Error('tests: createForm not implemented')
}

/**
 * One of every custom block at the top level (file, signature, phone, time, rating with labels,
 * scale, image, group, list, conditional) plus radio and date, each with a `css_class`.
 */
export const everyBlockFields = (mediaId: number): NonNullable<Form['fields']> => {
  void mediaId
  throw new Error('tests: everyBlockFields not implemented')
}

/** A two-step form: step 1 has a group and an image, step 2 a list inside a conditional. */
export const multiStepFields = (mediaId: number): NonNullable<Form['fields']> => {
  void mediaId
  throw new Error('tests: multiStepFields not implemented')
}
