import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { findFrontendForm, isFormForTenant } from '@/common/utils/frontendForm'
import type { Form, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, createImage, type FormData, formData } from './forms'
import { formDoc } from './renderForms'

const published = { draft: false, locale: 'en' } as const

// findFrontendForm / isFormForTenant (src/common/utils/frontendForm.ts): which form a public page
// may show on a host. Forms built with ./forms (createForm, formData) in test-a and test-b; the
// tenant id stands in for the host (as getFrontendTenantId resolves it).
describe('findFrontendForm', () => {
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

  const makeForm = (tenant: Tenant, extra: Partial<FormData> = {}) =>
    createForm(payload, superUser, {
      ...formData(tenant.id, uniqueName('page-form'), [
        { blockType: 'text', name: 'name', label: 'Name' },
      ]),
      ...extra,
    })

  it('finds a form of the host tenant by slug', async () => {
    // arrange
    const image = await createImage(payload, superUser, tenantA.id)
    const form = await makeForm(tenantA, { header_image: image.id })

    // act
    const found = await findFrontendForm(payload, tenantA.id, form.slug ?? '', published)

    // assert
    expect(found?.id).toBe(form.id)
    expect(found?.header_image).toMatchObject({ id: image.id })
  })

  it('hides a form of another tenant', async () => {
    // arrange
    const form = await makeForm(tenantB)

    // act
    const found = await findFrontendForm(payload, tenantA.id, form.slug ?? '', published)

    // assert
    expect(found).toBeNull()
  })

  it('hides an inactive form', async () => {
    // arrange
    const form = await makeForm(tenantA, { isActive: false })

    // act
    const found = await findFrontendForm(payload, tenantA.id, form.slug ?? '', published)

    // assert
    expect(found).toBeNull()
  })

  it('hides a form that was never published', async () => {
    // arrange
    const form = await makeForm(tenantA, { _status: 'draft' })

    // act
    const found = await findFrontendForm(payload, tenantA.id, form.slug ?? '', published)

    // assert
    expect(found).toBeNull()
  })

  it('shows the latest draft while previewing', async () => {
    // arrange
    const form = await makeForm(tenantA)
    await payload.update({
      collection: 'forms',
      id: form.id,
      data: { title: 'Draft title' },
      draft: true,
      user: superUser,
      overrideAccess: false,
    })

    // act
    const previewing = await findFrontendForm(payload, tenantA.id, form.slug ?? '', {
      draft: true,
      locale: 'en',
    })
    const live = await findFrontendForm(payload, tenantA.id, form.slug ?? '', published)

    // assert
    expect(previewing?.title).toBe('Draft title')
    expect(live?.title).toBe(form.title)
  })

  it('finds nothing for an unknown host', async () => {
    // arrange
    const form = await makeForm(tenantA)

    // act
    const found = await findFrontendForm(payload, null, form.slug ?? '', published)

    // assert
    expect(found).toBeNull()
  })
})

describe('isFormForTenant', () => {
  const HOST = 7
  const form = (overrides: Partial<Form>): Form => formDoc([], { tenant: HOST, ...overrides })

  it('accepts an active form of the host tenant', () => {
    // arrange
    const value = form({ isActive: true })

    // act
    const allowed = isFormForTenant(value, HOST)

    // assert
    expect(allowed).toBe(true)
  })

  it.each([
    { case: 'another tenant', value: form({ tenant: HOST + 1 }), tenantId: HOST },
    { case: 'inactive', value: form({ isActive: false }), tenantId: HOST },
    { case: 'unpopulated', value: 12, tenantId: HOST },
    { case: 'no host', value: form({}), tenantId: null },
  ])('refuses a form it cannot show ($case)', ({ value, tenantId }) => {
    // act
    const allowed = isFormForTenant(value, tenantId)

    // assert
    expect(allowed).toBe(false)
  })
})
