// The field showcase uses the standard access: super users, tenant admins, and members whose
// profile has a `field-showcase` row (test editor: CRUD, viewer: read), only in their tenant.
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { hiddenResolver } from '@/common/utils/access'
import type { FieldShowcase, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

type ShowcaseData = Partial<Omit<FieldShowcase, 'id' | 'tenant' | 'parent'>> & {
  tenant: number
  parent?: number
}

describe('field-showcase', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantAdmin: SessionUser
  let member: SessionUser
  let viewer: SessionUser
  let otherTenant: SessionUser
  let defaultProfile: SessionUser
  let disabled: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    member = await loadUser(payload, TEST_USERS.member)
    viewer = await loadUser(payload, TEST_USERS.viewer)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    defaultProfile = await loadUser(payload, TEST_USERS.defaultProfile)
    disabled = await loadUser(payload, TEST_USERS.disabled)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
  })

  // `items` has minRows 1, so every saved doc needs one row
  const create = (actor: SessionUser | null, data: ShowcaseData) =>
    payload.create({
      collection: 'field-showcase',
      data: { title: uniqueName('showcase'), items: [{ label: 'row' }], ...data },
      ...(actor ? { user: actor } : {}),
      overrideAccess: false,
    })

  const findByTitle = (actor: SessionUser | null, title: string) =>
    payload.find({
      collection: 'field-showcase',
      where: { title: { equals: title } },
      ...(actor ? { user: actor } : {}),
      overrideAccess: false,
    })

  describe('super user', () => {
    it('creates, reads, updates and deletes in any tenant', async () => {
      // arrange
      const title = uniqueName('super')

      // act
      const inA = await create(superUser, { tenant: tenantA.id, title })
      const inB = await create(superUser, { tenant: tenantB.id, title })
      const found = await findByTitle(superUser, title)
      const updated = await payload.update({
        collection: 'field-showcase',
        id: inA.id,
        data: { text: 'changed' },
        user: superUser,
        overrideAccess: false,
      })
      await payload.delete({
        collection: 'field-showcase',
        id: inA.id,
        user: superUser,
        overrideAccess: false,
      })
      await payload.delete({
        collection: 'field-showcase',
        id: inB.id,
        user: superUser,
        overrideAccess: false,
      })

      // assert
      expect(found.totalDocs).toBe(2)
      expect(updated.text).toBe('changed')
      expect((await findByTitle(superUser, title)).totalDocs).toBe(0)
    })
  })

  describe('tenant admin', () => {
    it('manages docs of its own tenant', async () => {
      // act
      const doc = await create(tenantAdmin, { tenant: tenantA.id })
      const updated = await payload.update({
        collection: 'field-showcase',
        id: doc.id,
        data: { text: 'by the tenant admin' },
        user: tenantAdmin,
        overrideAccess: false,
      })
      await payload.delete({
        collection: 'field-showcase',
        id: doc.id,
        user: tenantAdmin,
        overrideAccess: false,
      })

      // assert
      expect(updated.text).toBe('by the tenant admin')
      expect((await findByTitle(superUser, doc.title)).totalDocs).toBe(0)
    })

    it('sees none of another tenant', async () => {
      // arrange
      const inB = await create(superUser, { tenant: tenantB.id })

      // act
      const found = await findByTitle(tenantAdmin, inB.title)

      // assert
      expect(found.totalDocs).toBe(0)
    })
  })

  describe('member with a field-showcase row', () => {
    it('creates and edits docs in its tenant', async () => {
      // act
      const doc = await create(member, { tenant: tenantA.id })
      const updated = await payload.update({
        collection: 'field-showcase',
        id: doc.id,
        data: { text: 'by the editor' },
        user: member,
        overrideAccess: false,
      })

      // assert
      expect(updated.text).toBe('by the editor')
    })

    it('reads but cannot create as a viewer', async () => {
      // arrange
      const doc = await create(superUser, { tenant: tenantA.id })

      // act
      const found = await findByTitle(viewer, doc.title)

      // assert
      expect(found.totalDocs).toBe(1)
      await expect(create(viewer, { tenant: tenantA.id })).rejects.toMatchObject({ status: 403 })
    })

    it('sees none of another tenant', async () => {
      // arrange
      const inB = await create(superUser, { tenant: tenantB.id })

      // act
      const found = await findByTitle(member, inB.title)

      // assert
      expect(found.totalDocs).toBe(0)
    })

    it('keeps published docs private to its tenant', async () => {
      // arrange
      const published = await create(superUser, { tenant: tenantA.id, _status: 'published' })

      // act
      const found = await findByTitle(otherTenant, published.title)

      // assert
      expect(found.totalDocs).toBe(0)
    })

    it('refuses a parent from another tenant', async () => {
      // arrange
      const inB = await create(superUser, { tenant: tenantB.id })

      // act
      const call = create(member, { tenant: tenantA.id, parent: inB.id })

      // assert
      await expect(call).rejects.toMatchObject({ status: 400 })
    })

    it("joins only its tenant's children", async () => {
      // arrange
      const root = await create(superUser, { tenant: tenantA.id })
      const childA = await create(superUser, { tenant: tenantA.id, parent: root.id })
      // a broken row: a test-b child of a test-a root. Payload refuses it even with overrideAccess
      // (filterOptions is checked on save), so only SQL can write it
      const childB = await create(superUser, { tenant: tenantB.id })
      await payload.db.drizzle.execute(
        sql`UPDATE "field_showcase" SET "parent_id" = ${root.id} WHERE "id" = ${childB.id}`,
      )

      // act
      const read = await payload.findByID({
        collection: 'field-showcase',
        id: root.id,
        depth: 0,
        user: member,
        overrideAccess: false,
      })

      // assert
      expect(read.children?.docs).toEqual([childA.id])
    })
  })

  describe('member without a field-showcase row', () => {
    it('is denied every operation', async () => {
      // arrange
      const doc = await create(superUser, { tenant: tenantA.id })

      // act
      const find = findByTitle(defaultProfile, doc.title)
      const createCall = create(defaultProfile, { tenant: tenantA.id })
      const update = payload.update({
        collection: 'field-showcase',
        id: doc.id,
        data: { text: 'no' },
        user: defaultProfile,
        overrideAccess: false,
      })
      const remove = payload.delete({
        collection: 'field-showcase',
        id: doc.id,
        user: defaultProfile,
        overrideAccess: false,
      })

      // assert
      await expect(find).rejects.toMatchObject({ status: 403 })
      await expect(createCall).rejects.toMatchObject({ status: 403 })
      await expect(update).rejects.toMatchObject({ status: 403 })
      await expect(remove).rejects.toMatchObject({ status: 403 })
    })

    it('does not see it in the nav', () => {
      // act
      const hiddenForDefault = hiddenResolver('field-showcase')({ user: defaultProfile })
      const hiddenForMember = hiddenResolver('field-showcase')({ user: member })

      // assert
      expect(hiddenForDefault).toBe(true)
      expect(hiddenForMember).toBe(false)
    })
  })

  describe('anonymous and disabled', () => {
    it('denies anonymous reads', async () => {
      // arrange
      const published = await create(superUser, { tenant: tenantA.id, _status: 'published' })

      // act
      const call = findByTitle(null, published.title)

      // assert
      await expect(call).rejects.toMatchObject({ status: 403 })
    })

    it('denies a disabled user', async () => {
      // arrange
      const doc = await create(superUser, { tenant: tenantA.id })

      // act
      const find = findByTitle(disabled, doc.title)
      const createCall = create(disabled, { tenant: tenantA.id })

      // assert
      await expect(find).rejects.toMatchObject({ status: 403 })
      await expect(createCall).rejects.toMatchObject({ status: 403 })
    })
  })
})
