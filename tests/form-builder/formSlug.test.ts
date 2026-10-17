import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { createForm, formData } from './forms'

describe('form slug', () => {
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

  const createWithSlug = (tenantId: number, slug: string) =>
    createForm(payload, superUser, { ...formData(tenantId, slug, []), slug, slugLock: false })

  it('fills the slug from the title', async () => {
    // arrange
    const unique = uniqueName('x')

    // act
    const form = await createForm(
      payload,
      superUser,
      formData(tenantA.id, `Contact Us ${unique}`, []),
    )

    // assert
    expect(form.slug).toBe(`contact-us-${unique}`)
  })

  it('refuses a duplicate slug in the same tenant', async () => {
    // arrange
    const slug = uniqueName('dup')
    await createWithSlug(tenantA.id, slug)

    // act
    const message = await rejectionText(createWithSlug(tenantA.id, slug))

    // assert
    expect(message).toContain(`A form with slug "${slug}" already exists in this business.`)
  })

  it('allows the same slug in another tenant', async () => {
    // arrange
    const slug = uniqueName('shared')
    await createWithSlug(tenantA.id, slug)

    // act
    const form = await createWithSlug(tenantB.id, slug)

    // assert
    expect(form.slug).toBe(slug)
  })
})
