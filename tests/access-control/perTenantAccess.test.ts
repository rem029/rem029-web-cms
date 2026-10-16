// A user's profile comes from their tenants[] row for each tenant: mixed is editor in test-a,
// viewer in test-b, not in test-c.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  accessCheckResolver,
  adminAccess,
  allowedTenantIds,
  hiddenResolver,
} from '@/common/utils/access'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Header, Page, Tenant } from '@/payload-types'

import { findProfile, profileSlugOn } from '../common/access'
import { getTestPayload } from '../common/payload'
import { TEST_PROFILES, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, makeUser, reqFor, type SessionUser } from '../common/users'
import { context, createDraftPage, draftPageData } from './pages'

describe('per-tenant access', () => {
  let payload: Payload
  let superUser: SessionUser
  let mixed: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant
  let tenantC: Tenant
  let prefix: string
  let pageC: Page

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    mixed = await loadUser(payload, TEST_USERS.mixed)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    tenantC = await findTenant(payload, TEST_TENANTS.c)

    prefix = uniqueName('per-tenant')
    await createDraftPage(payload, tenantA.id, prefix)
    await createDraftPage(payload, tenantB.id, prefix)
    pageC = await createDraftPage(payload, tenantC.id, prefix)
  })

  it('seeds mixed as editor in a, viewer in b, not in c', () => {
    // assert
    expect(profileSlugOn(mixed, tenantA.id)).toBe(TEST_PROFILES.editor)
    expect(profileSlugOn(mixed, tenantB.id)).toBe(TEST_PROFILES.viewer)
    expect((mixed.tenants ?? []).every((row) => extractTenantId(row.tenant) !== tenantC.id)).toBe(
      true,
    )
  })

  describe('read', () => {
    it('shows the drafts of a and b, not c', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { like: prefix } },
        draft: true,
        depth: 0,
        limit: 100,
        user: mixed,
        overrideAccess: false,
      })

      // assert
      const tenantIds = docs.map((doc) => extractTenantId(doc.tenant))
      expect(tenantIds).toContain(tenantA.id)
      expect(tenantIds).toContain(tenantB.id)
      expect(tenantIds).not.toContain(tenantC.id)
    })

    it('returns no document outside their tenants', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { like: prefix } },
        draft: true,
        depth: 0,
        limit: 100,
        user: mixed,
        overrideAccess: false,
      })

      // assert
      expect(
        docs.every((doc) => {
          const tenantId = extractTenantId(doc.tenant)
          return tenantId === tenantA.id || tenantId === tenantB.id
        }),
      ).toBe(true)
    })

    it('refuses reading the c page by id', async () => {
      // act / assert
      await expect(
        payload.findByID({
          collection: 'pages',
          id: pageC.id,
          draft: true,
          user: mixed,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })

  describe('update', () => {
    it('lets mixed edit in a (editor)', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, prefix)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { title: 'edited in a' },
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses mixed editing in b (viewer)', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantB.id, prefix)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { title: 'edited in b' },
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses mixed editing in c (not a member)', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantC.id, prefix)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { title: 'edited in c' },
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses moving an a page into b', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, prefix)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { tenant: tenantB.id },
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses moving an a page into c', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, prefix)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { tenant: tenantC.id },
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('keeps a page in a after a refused move', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, prefix)
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { tenant: tenantB.id },
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })

      // act
      const stored = await payload.findByID({
        collection: 'pages',
        id: page.id,
        draft: true,
        depth: 0,
      })

      // assert
      expect(extractTenantId(stored.tenant)).toBe(tenantA.id)
    })
  })

  describe('create', () => {
    it('lets mixed create in a', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          draft: true,
          data: draftPageData(tenantA.id, uniqueName(prefix)),
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses mixed creating in b', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          draft: true,
          data: draftPageData(tenantB.id, uniqueName(prefix)),
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses mixed creating in c', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          draft: true,
          data: draftPageData(tenantC.id, uniqueName(prefix)),
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('delete', () => {
    it('refuses mixed deleting in b', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantB.id, prefix)

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses mixed deleting in c', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantC.id, prefix)

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('lets mixed delete in a', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, prefix)

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })
  })

  describe('header', () => {
    let headerA: Header
    let headerB: Header

    beforeAll(async () => {
      const { docs: docsA } = await payload.find({
        collection: 'header',
        where: { tenant: { equals: tenantA.id } },
        limit: 1,
        depth: 0,
      })
      const { docs: docsB } = await payload.find({
        collection: 'header',
        where: { tenant: { equals: tenantB.id } },
        limit: 1,
        depth: 0,
      })
      if (!docsA[0] || !docsB[0]) {
        throw new Error('tests: missing header doc for test-a or test-b')
      }
      headerA = docsA[0]
      headerB = docsB[0]
    })

    it('lets mixed update the a header', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: headerA.id,
          data: {},
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses mixed updating the b header', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: headerB.id,
          data: {},
          user: mixed,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })

  describe('selected tenant cookie', () => {
    it('accepts a as a selection', async () => {
      // arrange
      const req = await reqFor(payload, mixed, { tenantCookie: tenantA.id })

      // act / assert
      expect(getSelectedTenant(req)).toBe(tenantA.id)
    })

    it('ignores a forged c cookie', async () => {
      // arrange
      const req = await reqFor(payload, mixed, { tenantCookie: tenantC.id })

      // act / assert
      expect(getSelectedTenant(req)).toBeNull()
    })

    it('allows create without data.tenant when the cookie is a', async () => {
      // arrange
      const req = await reqFor(payload, mixed, { tenantCookie: tenantA.id })

      // act / assert
      expect(accessCheckResolver('pages', 'create')({ req, data: {} })).toBe(true)
    })

    it('denies create without data.tenant when the cookie is b', async () => {
      // arrange
      const req = await reqFor(payload, mixed, { tenantCookie: tenantB.id })

      // act / assert
      expect(accessCheckResolver('pages', 'create')({ req, data: {} })).toBe(false)
    })

    it('denies create without data.tenant with a forged c cookie', async () => {
      // arrange
      const req = await reqFor(payload, mixed, { tenantCookie: tenantC.id })

      // act / assert
      expect(accessCheckResolver('pages', 'create')({ req, data: {} })).toBe(false)
    })

    it('gives no c data with a forged c cookie', async () => {
      // arrange
      const req = await reqFor(payload, mixed, { tenantCookie: tenantC.id })

      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { like: prefix } },
        draft: true,
        depth: 0,
        req,
        overrideAccess: false,
      })

      // assert
      expect(docs.every((doc) => extractTenantId(doc.tenant) !== tenantC.id)).toBe(true)
    })
  })

  describe('nav and /admin', () => {
    it('shows mixed pages', () => {
      // act / assert
      expect(hiddenResolver('pages')({ user: mixed })).toBe(false)
    })

    it('hides tenants from mixed', () => {
      // act / assert
      expect(hiddenResolver('tenants')({ user: mixed })).toBe(true)
    })

    it('lets mixed open /admin', async () => {
      // arrange
      const req = await reqFor(payload, mixed)

      // act / assert
      expect(adminAccess({ req })).toBe(true)
    })
  })

  describe('a row without a profile', () => {
    it('denies pages read', async () => {
      // arrange
      const user = makeUser({ id: 990001, tenants: [{ tenant: tenantA.id, access: null }] })
      const req = await reqFor(payload, user)

      // act / assert
      expect(accessCheckResolver('pages', 'read')({ req })).toBe(false)
    })

    it('denies /admin', async () => {
      // arrange
      const user = makeUser({ id: 990001, tenants: [{ tenant: tenantA.id, access: null }] })
      const req = await reqFor(payload, user)

      // act / assert
      expect(adminAccess({ req })).toBe(false)
    })

    it('hides pages', () => {
      // arrange
      const user = makeUser({ id: 990001, tenants: [{ tenant: tenantA.id, access: null }] })

      // act / assert
      expect(hiddenResolver('pages')({ user })).toBe(true)
    })
  })

  describe('tenants', () => {
    let user: SessionUser

    beforeAll(async () => {
      const editorProfile = await findProfile(payload, TEST_PROFILES.editor, tenantA.id)
      const viewerProfile = await findProfile(payload, TEST_PROFILES.viewer, tenantB.id)
      const profileSlug = uniqueName(prefix)
      const profile = await payload.create({
        collection: 'users-access',
        data: {
          name: profileSlug,
          slug: profileSlug,
          tenant: tenantA.id,
          access: (editorProfile.access ?? []).map(({ id: _id, ...row }) =>
            row.slug === 'tenants' ? { ...row, hidden: false, read: true, update: true } : row,
          ),
        },
      })
      const email = `${uniqueName(prefix)}@example.test`
      await payload.create({
        collection: 'users',
        data: {
          email,
          password: email,
          tenants: [
            { tenant: tenantA.id, access: profile.id },
            { tenant: tenantB.id, access: viewerProfile.id },
          ],
        },
        user: superUser,
        overrideAccess: false,
      })
      user = await loadUser(payload, email)
    })

    it('allows only a for updates', async () => {
      // arrange
      const req = await reqFor(payload, user)

      // act / assert
      expect(allowedTenantIds(req, 'tenants', 'update')).toEqual([tenantA.id])
    })

    it('lets the a row update tenant a', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'tenants',
          id: tenantA.id,
          data: {},
          user,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses updating tenant b with the a row', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'tenants',
          id: tenantB.id,
          data: {},
          user,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })

  describe('a deleted profile', () => {
    let orphaned: SessionUser

    beforeAll(async () => {
      const editorProfile = await findProfile(payload, TEST_PROFILES.editor, tenantA.id)
      const viewerProfile = await findProfile(payload, TEST_PROFILES.viewer, tenantB.id)
      const profileSlug = uniqueName(prefix)
      const profile = await payload.create({
        collection: 'users-access',
        data: {
          name: profileSlug,
          slug: profileSlug,
          tenant: tenantA.id,
          access: (editorProfile.access ?? []).map(({ id: _id, ...row }) => row),
        },
      })
      const email = `${uniqueName(prefix)}@example.test`
      await payload.create({
        collection: 'users',
        data: {
          email,
          password: email,
          tenants: [
            { tenant: tenantA.id, access: profile.id },
            { tenant: tenantB.id, access: viewerProfile.id },
          ],
        },
        user: superUser,
        overrideAccess: false,
      })
      await payload.delete({
        collection: 'users-access',
        id: profile.id,
      })
      orphaned = await loadUser(payload, email)
    })

    it('leaves the row without a profile', () => {
      // assert
      expect(
        (orphaned.tenants ?? []).some(
          (row) => extractTenantId(row.tenant) === tenantA.id && row.access == null,
        ),
      ).toBe(true)
    })

    it('denies reading a drafts, without a crash', async () => {
      // act
      const docs = await payload
        .find({
          collection: 'pages',
          where: { tenant: { equals: tenantA.id } },
          draft: true,
          user: orphaned,
          overrideAccess: false,
        })
        .then(
          (res) => res.docs,
          () => [],
        )

      // assert
      expect(docs.some((doc) => doc._status === 'draft')).toBe(false)
    })
  })

  describe('super user', () => {
    it('sees every tenant', async () => {
      // act
      const all = await payload.count({
        collection: 'pages',
        where: { slug: { like: prefix } },
      })
      const asSuper = await payload.count({
        collection: 'pages',
        where: { slug: { like: prefix } },
        user: superUser,
        overrideAccess: false,
      })

      // assert
      expect(all.totalDocs).toBeGreaterThan(0)
      expect(asSuper.totalDocs).toBe(all.totalDocs)
    })

    it('edits in c', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantC.id, prefix)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          draft: true,
          data: { title: 'super edit' },
          user: superUser,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })
  })
})
