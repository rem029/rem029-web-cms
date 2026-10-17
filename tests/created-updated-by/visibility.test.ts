import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { contentLayout, richText } from '../common/content'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed/fixtures'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { auditIds, context, lacksAuditFields, type AuditIds } from './stampedDocs'

let payload: Payload
let tenantAdmin: SessionUser
let member: SessionUser
let otherTenant: SessionUser
let multiTenant: SessionUser
let pageA: number
let pageB: number

const findTenantId = async (slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`tests: tenant ${slug} not in the test seed`)
  return docs[0].id
}

// written with no user, then given stored createdBy / updatedBy directly, so these tests check
// only the hiding (not the stamping)
const pageAuditedBy = async (prefix: string, tenantId: number, userId: number): Promise<number> => {
  const name = uniqueName(prefix)
  const page = await payload.create({
    collection: 'pages',
    data: {
      title: name,
      slug: name,
      tenant: tenantId,
      hero: { main: { type: 'none' } },
      layout: contentLayout(richText(name)),
    },
    draft: true,
    context,
  })
  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { _status: 'published', createdBy: userId, updatedBy: userId },
    context,
  })
  return page.id
}

const readAs = async (actor: SessionUser, id: number): Promise<AuditIds> =>
  auditIds(
    await payload.findByID({
      collection: 'pages',
      id,
      depth: 0,
      draft: true,
      user: actor,
      overrideAccess: false,
    }),
  )

const storedOf = async (id: number): Promise<AuditIds> =>
  auditIds(await payload.findByID({ collection: 'pages', id, depth: 0 }))

beforeAll(async () => {
  payload = await getTestPayload()
  tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
  member = await loadUser(payload, TEST_USERS.member)
  otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
  multiTenant = await loadUser(payload, TEST_USERS.multiTenant)

  const tenantA = await findTenantId(TEST_TENANTS.a)
  const tenantB = await findTenantId(TEST_TENANTS.b)

  pageA = await pageAuditedBy('cub-vis-a', tenantA, tenantAdmin.id)
  pageB = await pageAuditedBy('cub-vis-b', tenantB, member.id)

  expect(await storedOf(pageA)).toEqual({
    createdBy: tenantAdmin.id,
    updatedBy: tenantAdmin.id,
  })
  expect(await storedOf(pageB)).toEqual({
    createdBy: member.id,
    updatedBy: member.id,
  })
})

describe('createdBy / updatedBy visibility', () => {
  it('shows a colleague both fields', async () => {
    // act
    const stamps = await readAs(member, pageA)

    // assert
    expect(stamps).toEqual({ createdBy: tenantAdmin.id, updatedBy: tenantAdmin.id })
  })

  it('hides both fields from anonymous readers', async () => {
    // act
    const doc = await payload.findByID({
      collection: 'pages',
      id: pageA,
      depth: 0,
      overrideAccess: false,
    })

    // assert
    expect(lacksAuditFields(doc)).toBe(true)
  })

  it('empties both for a reader from another business', async () => {
    // act
    const stamps = await readAs(otherTenant, pageB)

    // assert
    expect(stamps).toEqual({ createdBy: null, updatedBy: null })
  })

  it('shows them to a member of both businesses', async () => {
    // act
    const stamps = await readAs(multiTenant, pageB)

    // assert
    expect(stamps).toEqual({ createdBy: member.id, updatedBy: member.id })
  })

  it('leaves the stored values untouched by the reads', async () => {
    // act
    await readAs(member, pageA)
    await payload.findByID({
      collection: 'pages',
      id: pageA,
      depth: 0,
      overrideAccess: false,
    })
    await readAs(otherTenant, pageB)
    await readAs(multiTenant, pageB)

    // assert
    expect(await storedOf(pageA)).toEqual({
      createdBy: tenantAdmin.id,
      updatedBy: tenantAdmin.id,
    })
    expect(await storedOf(pageB)).toEqual({
      createdBy: member.id,
      updatedBy: member.id,
    })
  })
})
