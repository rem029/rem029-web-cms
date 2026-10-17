import type { CollectionSlug, Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed/fixtures'
import { loadUser, type SessionUser } from '../common/users'
import {
  ANONYMOUS_READABLE,
  auditIds,
  context,
  createBusiness,
  createStampedDocs,
  lacksAuditFields,
  STAMPED,
  type AuditIds,
} from './stampedDocs'

let payload: Payload
let superUser: SessionUser
let tenantAdmin: SessionUser
let docId: (slug: CollectionSlug) => number
let memberEmail: string
let memberPassword: string
const created = new Map<CollectionSlug, AuditIds>()
const updated = new Map<CollectionSlug, AuditIds>()
const asTenantAdmin = new Map<CollectionSlug, AuditIds>()
const anonymous = new Map<CollectionSlug, object>()

const anonymousDoc = (slug: CollectionSlug): object => {
  const doc = anonymous.get(slug)
  if (!doc) throw new Error(`tests: no anonymous doc for ${slug}`)
  return doc
}

beforeAll(async () => {
  payload = await getTestPayload()
  superUser = await loadUser(payload, TEST_USERS.superUser)
  const business = await createBusiness(payload, superUser)
  tenantAdmin = business.tenantAdmin

  // values a client might send; the stamps must ignore them
  const docs = await createStampedDocs(payload, {
    tenant: business.tenant,
    user: superUser,
    extra: { createdBy: tenantAdmin.id, updatedBy: tenantAdmin.id },
  })
  docId = docs.docId
  memberEmail = docs.memberEmail
  memberPassword = docs.memberPassword

  for (const slug of STAMPED) {
    const id = docId(slug)
    created.set(slug, auditIds(await payload.findByID({ collection: slug, id, depth: 0 })))

    await payload.update({
      collection: slug,
      id,
      data: { createdBy: tenantAdmin.id, updatedBy: superUser.id },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })
    updated.set(slug, auditIds(await payload.findByID({ collection: slug, id, depth: 0 })))

    asTenantAdmin.set(
      slug,
      auditIds(
        await payload.findByID({
          collection: slug,
          id,
          depth: 0,
          user: tenantAdmin,
          overrideAccess: false,
        }),
      ),
    )
  }

  for (const slug of ANONYMOUS_READABLE) {
    anonymous.set(
      slug,
      await payload.findByID({
        collection: slug,
        id: docId(slug),
        depth: 0,
        overrideAccess: false,
      }),
    )
  }
})

describe.each(STAMPED)('%s', (slug) => {
  it('sets createdBy to the creator', () => {
    // assert
    expect(created.get(slug)?.createdBy).toBe(superUser.id)
  })

  it('sets updatedBy to the creator', () => {
    // assert
    expect(created.get(slug)?.updatedBy).toBe(superUser.id)
  })

  it('keeps createdBy on an edit', () => {
    // assert
    expect(updated.get(slug)?.createdBy).toBe(superUser.id)
  })

  it('sets updatedBy to the editor', () => {
    // assert
    expect(updated.get(slug)?.updatedBy).toBe(tenantAdmin.id)
  })

  it('shows the tenant admin themselves, not the super user', () => {
    // assert
    expect(asTenantAdmin.get(slug)).toEqual({
      createdBy: null,
      updatedBy: tenantAdmin.id,
    })
  })
})

describe.each(ANONYMOUS_READABLE)('%s', (slug) => {
  it('hides both fields from anonymous readers', () => {
    // assert
    expect(lacksAuditFields(anonymousDoc(slug))).toBe(true)
  })
})

describe('users', () => {
  it('keeps updatedBy when the user logs in', async () => {
    // arrange
    const memberId = docId('users')
    const before = auditIds(
      await payload.findByID({ collection: 'users', id: memberId, depth: 0 }),
    ).updatedBy

    // act
    await payload.login({
      collection: 'users',
      data: { email: memberEmail, password: memberPassword },
    })

    // assert
    const after = auditIds(
      await payload.findByID({ collection: 'users', id: memberId, depth: 0 }),
    ).updatedBy
    expect(before).toBe(tenantAdmin.id)
    expect(after).toBe(before)
  })
})
