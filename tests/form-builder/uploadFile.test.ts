import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { FORM_UPLOAD_MAX_BYTES } from '@/collections/FormUploads/constants'
import { formText } from '@/components/FormRenderer/i18n'
import { type SubmissionContext, uploadFile } from '@/components/FormRenderer/submissions'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser } from '../common/users'
import { createForm, formData } from './forms'

// a 1x1 transparent png
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)
const text = formText('en')

const pngFile = () => new File([PNG], `${uniqueName('receipt')}.png`, { type: 'image/png' })

// uploadFile (src/components/FormRenderer/submissions.ts): what uploadFileAction does once the
// request is read. The form in test-a has a File field `receipt`; files are `File` objects as
// the browser sends them (a 1x1 png, a text file, an 11 MB buffer).
describe('uploadFile', () => {
  let payload: Payload
  let tenantA: Tenant
  let formId: number

  beforeAll(async () => {
    payload = await getTestPayload()
    const superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    const form = await createForm(
      payload,
      superUser,
      formData(tenantA.id, uniqueName('upload'), [
        { blockType: 'text', name: 'name', label: 'Name' },
        { blockType: 'file', name: 'receipt', label: 'Receipt' },
      ]),
    )
    formId = form.id
  })

  const context = (): SubmissionContext => ({
    payload,
    tenantId: tenantA.id,
    user: null,
    ip: uniqueName('ip'),
  })

  const storedNamed = async (name: string) => {
    const { docs } = await payload.find({
      collection: 'form-uploads',
      where: { and: [{ form: { equals: formId } }, { filename: { equals: name } }] },
      depth: 0,
    })
    return docs
  }

  it('stores an allowed file under the form tenant', async () => {
    // arrange
    const file = pngFile()

    // act
    const result = await uploadFile(context(), {
      formId,
      locale: 'en',
      fieldName: 'receipt',
      file,
    })

    // assert
    expect(result).toEqual({ ok: true, id: expect.any(Number) })
    const upload = result.ok
      ? await payload.findByID({ collection: 'form-uploads', id: result.id, depth: 0 })
      : null
    expect(upload).toMatchObject({
      tenant: tenantA.id,
      form: formId,
      field_name: 'receipt',
      mimeType: 'image/png',
    })
  })

  it('refuses a disallowed mime type', async () => {
    // arrange
    const name = `${uniqueName('note')}.txt`
    const file = new File(['hello'], name, { type: 'text/plain' })

    // act
    const result = await uploadFile(context(), { formId, locale: 'en', fieldName: 'receipt', file })

    // assert
    expect(result).toEqual({ ok: false, error: text.wrongType })
    expect(await storedNamed(name)).toEqual([])
  })

  it('refuses a file over the size limit', async () => {
    // arrange
    const name = `${uniqueName('big')}.png`
    const file = new File([new Uint8Array(FORM_UPLOAD_MAX_BYTES + 1)], name, { type: 'image/png' })

    // act
    const result = await uploadFile(context(), { formId, locale: 'en', fieldName: 'receipt', file })

    // assert
    expect(result).toEqual({ ok: false, error: text.tooLarge })
    expect(await storedNamed(name)).toEqual([])
  })

  it.each([{ fieldName: 'nope' }, { fieldName: 'name' }])(
    'refuses a field the form does not have ($fieldName)',
    async ({ fieldName }) => {
      // arrange
      const file = pngFile()

      // act
      const result = await uploadFile(context(), { formId, locale: 'en', fieldName, file })

      // assert
      expect(result).toEqual({ ok: false, error: text.somethingWrong })
      expect(await storedNamed(file.name)).toEqual([])
    },
  )
})
