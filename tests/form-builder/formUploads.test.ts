import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { FormUpload, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, formData } from './forms'

// a 1x1 transparent png
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

type UploadFile = { data: Buffer; mimetype: string; name: string; size: number }

const pngFile = (): UploadFile => ({
  data: PNG,
  mimetype: 'image/png',
  name: `${uniqueName('upload')}.png`,
  size: PNG.length,
})

describe('form uploads', () => {
  let payload: Payload
  let superUser: SessionUser
  let member: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant
  let formA: number
  let formB: number

  // as the submit action will: no user, overrideAccess
  const storeUpload = (tenantId: number, formId: number, file: UploadFile = pngFile()) =>
    payload.create({
      collection: 'form-uploads',
      data: { tenant: tenantId, form: formId, field_name: 'receipt' },
      file,
      overrideAccess: true,
      depth: 0,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    member = await loadUser(payload, TEST_USERS.member)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    formA = (await createForm(payload, superUser, formData(tenantA.id, uniqueName('up-a'), []))).id
    formB = (await createForm(payload, superUser, formData(tenantB.id, uniqueName('up-b'), []))).id
  })

  const findAs = (user: SessionUser | null, upload: FormUpload) =>
    payload.find({
      collection: 'form-uploads',
      where: { id: { equals: upload.id } },
      depth: 0,
      overrideAccess: false,
      ...(user ? { user } : {}),
    })

  describe('reading', () => {
    it('denies anonymous reads', async () => {
      // arrange
      const upload = await storeUpload(tenantA.id, formA)

      // act
      const call = findAs(null, upload)

      // assert
      await expect(call).rejects.toMatchObject({ status: 403 })
    })

    it('lets a member with read see their tenant uploads', async () => {
      // arrange
      const upload = await storeUpload(tenantA.id, formA)

      // act
      const { docs } = await findAs(member, upload)

      // assert
      expect(docs).toHaveLength(1)
      expect(docs[0]).toMatchObject({ form: formA, field_name: 'receipt' })
    })

    it('hides other tenants uploads', async () => {
      // arrange
      const upload = await storeUpload(tenantB.id, formB)

      // act
      const { docs } = await findAs(member, upload)

      // assert
      expect(docs).toEqual([])
    })
  })

  describe('writing', () => {
    it('refuses create through the api', async () => {
      // arrange
      const file = pngFile()

      // act
      const call = payload.create({
        collection: 'form-uploads',
        data: { tenant: tenantA.id, form: formA, field_name: 'receipt' },
        file,
        user: member,
        overrideAccess: false,
      })

      // assert
      await expect(call).rejects.toMatchObject({ status: 403 })
    })

    it('refuses a file type outside images and pdf', async () => {
      // arrange
      const text = Buffer.from('hello')
      const file = { data: text, mimetype: 'text/plain', name: 'note.txt', size: text.length }

      // act
      const message = await rejectionText(storeUpload(tenantA.id, formA, file))

      // assert
      expect(message).toContain("Invalid file type: 'text/plain'")
    })

    it('refuses a file over 10 MB', async () => {
      // arrange: a pdf (images are re-encoded on upload, so padding them doesn't make them big)
      const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(10 * 1024 * 1024 + 1)])
      const file = { data: pdf, mimetype: 'application/pdf', name: 'big.pdf', size: pdf.length }

      // act
      const message = await rejectionText(storeUpload(tenantA.id, formA, file))

      // assert
      expect(message).toContain('Files can be up to 10 MB.')
    })

    it('stores an allowed file under the form tenant', async () => {
      // arrange
      const file = pngFile()

      // act
      const upload = await storeUpload(tenantA.id, formA, file)

      // assert
      expect(upload).toMatchObject({
        tenant: tenantA.id,
        form: formA,
        field_name: 'receipt',
        mimeType: 'image/png',
      })
    })
  })
})
