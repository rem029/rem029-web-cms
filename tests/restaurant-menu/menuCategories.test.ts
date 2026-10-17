// Menu categories (rem0017 phase 1 step 1): slug from the title, unique per tenant, sorted by
// `sortOrder`. Created as the editor of test-a / test-b with overrideAccess: false.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// outside Next.js: skip the menus cache revalidation
const context = { disableRevalidate: true }

describe('menu categories', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser
  let otherTenant: SessionUser

  const createCategory = (
    user: SessionUser,
    data: { title: string; tenant: number; slug?: string; sortOrder?: number },
  ) =>
    payload.create({
      collection: 'menu-categories',
      data,
      user,
      overrideAccess: false,
      depth: 0,
      context,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
  })

  it('fills the slug from the title', async () => {
    // arrange
    const title = uniqueName('Hot Drinks')

    // act
    const category = await createCategory(member, { title, tenant: tenantA.id })

    // assert
    expect(category.slug).toBe(title.replace(/ /g, '-').toLowerCase())
  })

  it('refuses a duplicate slug in one tenant', async () => {
    // arrange
    const slug = uniqueName('dup-category')
    await createCategory(member, { title: slug, slug, tenant: tenantA.id })

    // act
    const message = await rejectionText(
      createCategory(member, { title: `${slug} again`, slug, tenant: tenantA.id }),
    )

    // assert
    expect(message).toContain('already exists in this business')
  })

  it('allows the same slug in another tenant', async () => {
    // arrange
    const slug = uniqueName('shared-category')
    await createCategory(member, { title: slug, slug, tenant: tenantA.id })

    // act
    const inB = await createCategory(otherTenant, { title: slug, slug, tenant: tenantB.id })

    // assert
    expect(inB.slug).toBe(slug)
  })

  it('lists categories in sort order', async () => {
    // arrange
    const prefix = uniqueName('sorted')
    await createCategory(member, { title: `${prefix} c`, sortOrder: 2, tenant: tenantA.id })
    await createCategory(member, { title: `${prefix} a`, sortOrder: 0, tenant: tenantA.id })
    await createCategory(member, { title: `${prefix} b`, sortOrder: 1, tenant: tenantA.id })

    // act
    const { docs } = await payload.find({
      collection: 'menu-categories',
      where: { title: { like: prefix } },
      user: member,
      overrideAccess: false,
      depth: 0,
    })

    // assert
    expect(docs.map((doc) => doc.title)).toEqual([`${prefix} a`, `${prefix} b`, `${prefix} c`])
  })
})
