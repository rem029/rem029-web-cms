import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, type FormData, type FormFields, formData } from './forms'

// a 1x1 transparent png
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

// validateSubmission (src/plugins/hooks/validateSubmission.ts): the form's rules on every new
// form-submissions doc, checked through the plugin's public create as anonymous (overrideAccess
// false, no user): what `POST /api/form-submissions` runs.
describe('validateSubmission', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
  })

  const makeForm = (tenant: Tenant, fields: FormFields, extra: Partial<FormData> = {}) =>
    createForm(payload, superUser, { ...formData(tenant.id, uniqueName('rest'), fields), ...extra })

  // as `POST /api/form-submissions` from an anonymous visitor
  const submitAnonymously = (form: number, submissionData: { field: string; value: string }[]) =>
    payload.create({
      collection: 'form-submissions',
      data: { form, submissionData },
      overrideAccess: false,
      depth: 0,
    })

  const savedFor = async (formId: number) => {
    const { docs } = await payload.find({
      collection: 'form-submissions',
      where: { form: { equals: formId } },
      depth: 0,
    })
    return docs
  }

  const requiredName: FormFields = [
    { blockType: 'text', name: 'name', label: 'Full name', required: true },
  ]

  it.each([
    { form: 'inactive', extra: { isActive: false }, status: 403, message: "isn't taking answers" },
    { form: 'members only', extra: { requires_auth: true }, status: 403, message: 'Only members' },
    { form: 'open', extra: {}, status: 400, message: 'Full name is required.' },
  ])('applies the same checks to the rest api ($form)', async ({ extra, status, message }) => {
    // arrange
    const form = await makeForm(tenantA, requiredName, extra)

    // act
    const call = submitAnonymously(form.id, [])

    // assert
    await expect(call).rejects.toMatchObject({ status })
    expect(await rejectionText(submitAnonymously(form.id, []))).toContain(message)
    expect(await savedFor(form.id)).toEqual([])
  })

  it('refuses a form that was never published', async () => {
    // arrange: a form in test-a saved as a draft only (_status 'draft'), no required fields
    // act: create a submission as anonymous
    // assert: rejects with 403; nothing saved
    expect.fail('not implemented')
  })

  it('drops answers the form does not ask for', async () => {
    // arrange
    const form = await makeForm(tenantA, [
      { blockType: 'text', name: 'name', label: 'Name' },
      {
        blockType: 'conditional',
        condition_field: 'name',
        operator: 'equal',
        value: 'show',
        fields: [{ blockType: 'text', name: 'secret', label: 'Secret' }],
      },
    ])

    // act
    const saved = await submitAnonymously(form.id, [
      { field: 'name', value: 'Sara' },
      { field: 'admin_note', value: 'approve me' },
      { field: 'secret', value: 'hidden answer' },
    ])

    // assert
    expect(saved.submissionData).toEqual([{ field: 'name', value: 'Sara', id: expect.any(String) }])
  })

  it('refuses an upload id of another form', async () => {
    // arrange
    const otherForm = await makeForm(tenantB, [])
    const foreign = await payload.create({
      collection: 'form-uploads',
      data: { tenant: tenantB.id, form: otherForm.id, field_name: 'receipt' },
      file: { data: PNG, mimetype: 'image/png', name: `${uniqueName('x')}.png`, size: PNG.length },
      overrideAccess: true,
      depth: 0,
    })
    const form = await makeForm(tenantA, [{ blockType: 'file', name: 'receipt', label: 'Receipt' }])

    // act
    const call = submitAnonymously(form.id, [{ field: 'receipt', value: String(foreign.id) }])

    // assert
    await expect(call).rejects.toMatchObject({ status: 400 })
    expect(await savedFor(form.id)).toEqual([])
  })
})
